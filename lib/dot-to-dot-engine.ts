/**
 * Dot-to-Dot Engine
 *
 * Converts a photo into a numbered connect-the-dots puzzle that traces the
 * subject's main outline (so the finished puzzle reveals a recognisable shape).
 *
 * Pipeline:
 *   1. Downscale + greyscale + denoise
 *   2. Otsu threshold -> foreground silhouette (background inferred from borders)
 *   3. Largest connected component = the subject
 *   4. Moore-neighbour boundary trace -> ordered outline
 *   5. Simplify (RDP) + distribute exactly N dots (corners preserved)
 *   6. Render dots + numbers on an A4 canvas (PNG + PDF)
 *
 * If no clear subject is found it falls back to an edge-cloud path so it
 * always produces a usable puzzle.
 */

import sharp from 'sharp'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { DotJobSettings } from '@/types/dot-job'

interface Point {
  x: number
  y: number
}

// A4 at 300 DPI
const A4_W = 2480
const A4_H = 3508
const MARGIN = 118 // ~10mm at 300 DPI
const CONTENT_W = A4_W - MARGIN * 2
const CONTENT_H = A4_H - MARGIN * 2

// PDF A4 in points
const A4_W_PT = 595.28
const A4_H_PT = 841.89

// Resolution used for silhouette tracing (keeps it fast + smooth)
const TRACE_MAX = 960

/**
 * Full pipeline: photo buffer -> dot-to-dot PNG + PDF buffers.
 */
export async function generateDotToDot(
  imageBuffer: Buffer,
  settings: DotJobSettings,
  onProgress?: (pct: number) => Promise<void>
): Promise<{ png: Buffer; pdf: Buffer }> {
  await onProgress?.(10)

  const metadata = await sharp(imageBuffer).metadata()
  const srcW = metadata.width || 800
  const srcH = metadata.height || 600

  // Low-res working image for tracing
  const tScale = Math.min(1, TRACE_MAX / Math.max(srcW, srcH))
  const tW = Math.max(2, Math.round(srcW * tScale))
  const tH = Math.max(2, Math.round(srcH * tScale))

  const { data } = await sharp(imageBuffer)
    .resize(tW, tH, { fit: 'fill' })
    .greyscale()
    .normalize()
    .median(3)
    .blur(1.6)
    .raw()
    .toBuffer({ resolveWithObject: true })

  await onProgress?.(30)

  const targetDots = clampDots(settings.dotCount)
  const sceneMode = settings.style === 'scene'

  // --- Trace the outline (in trace-resolution coords) ---
  // Scene mode: outer perimeter of the WHOLE drawing (keep the full scene).
  // Outline mode: isolate the main subject and trace just its silhouette.
  let ordered: Point[]
  let mask: Uint8Array | null = null
  if (sceneMode) {
    const traced = traceSceneOutline(data, tW, tH)
    if (traced.contour.length >= 8 && !isFrameContour(traced.contour, tW, tH)) {
      ordered = smoothClosed(traced.contour, 2, 2)
    } else {
      ordered = fallbackContour(data, tW, tH)
    }
  } else {
    const traced = traceSubjectOutline(data, tW, tH)
    mask = traced.mask
    if (traced.contour.length >= 8 && !isFrameContour(traced.contour, tW, tH)) {
      ordered = smoothClosed(traced.contour, 2, 2)
    } else {
      // Fallback: edge-cloud nearest-neighbour path (never fails). No clean
      // subject mask in this case, so we skip the drawn-in features.
      ordered = fallbackContour(data, tW, tH)
      mask = null
    }
  }

  await onProgress?.(50)

  // Fit the traced shape into the A4 content area (big, centred), so the dots
  // spread out regardless of margins in the source.
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of ordered) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  const bw = Math.max(1, maxX - minX)
  const bh = Math.max(1, maxY - minY)
  const fit = Math.min((CONTENT_W * 0.9) / bw, (CONTENT_H * 0.9) / bh)
  const drawnW = bw * fit
  const drawnH = bh * fit
  const tx = MARGIN + (CONTENT_W - drawnW) / 2
  const ty = MARGIN + (CONTENT_H - drawnH) / 2

  const pageContour = ordered.map((p) => ({ x: (p.x - minX) * fit + tx, y: (p.y - minY) * fit + ty }))
  // Scene mode traces one big smooth perimeter, so space the dots evenly by
  // arc length — that keeps numbers from bunching up/overlapping. Outline mode
  // keeps the corner-preserving distribution (better for pointy shapes).
  const dots = sceneMode
    ? resampleEven(pageContour, targetDots)
    : distributeDots(pageContour, targetDots)

  await onProgress?.(60)

  // Build the "features" layer — the drawing that sits under the dots.
  //  • scene mode: the WHOLE drawing kept crisp (background/context intact),
  //    with the dots tracing its outer perimeter. Matches a classic
  //    "colour it in + join the dots around the edge" page.
  //  • outline mode: the isolated subject, faded to grey, dots on its outline.
  // Skipped (plain dots) when there's nothing clean to draw.
  const bbox = {
    minX: Math.max(0, Math.floor(minX)),
    minY: Math.max(0, Math.floor(minY)),
    w: Math.min(tW, Math.ceil(bw)),
    h: Math.min(tH, Math.ceil(bh)),
  }
  if (bbox.minX + bbox.w > tW) bbox.w = tW - bbox.minX
  if (bbox.minY + bbox.h > tH) bbox.h = tH - bbox.minY
  const target = {
    x: Math.round(tx),
    y: Math.round(ty),
    w: Math.max(1, Math.round(drawnW)),
    h: Math.max(1, Math.round(drawnH)),
  }

  let features: Buffer | null = null
  try {
    if (sceneMode) {
      features = await buildSceneFeaturesLayer(imageBuffer, tW, tH, bbox, target)
    } else if (mask) {
      features = await buildFeaturesLayer(imageBuffer, mask, tW, tH, bbox, target)
    }
  } catch (err) {
    console.error('Dot-to-dot features layer failed, using plain dots:', err)
    features = null
  }

  // In scene mode the whole drawing is kept, so its own perimeter line is
  // already there. Wipe that line along the dot path (a white stroke following
  // the contour) so joining the dots actually draws the edge instead of
  // retracing one that's already joined up.
  const erasePath = sceneMode && features ? pageContour : null

  await onProgress?.(72)

  const pngBuffer = await renderDotToDotPng(dots, settings, features, erasePath)
  await onProgress?.(85)

  const pdfBuffer = await renderDotToDotPdf(dots, settings, features, erasePath)
  await onProgress?.(95)

  return { png: pngBuffer, pdf: pdfBuffer }
}

// Produce an A4-size PNG: white page with the subject's line art (masked to
// the subject, faded to light grey) placed at `target`. This is the "drawn-in
// features" layer that sits under the connect-the-dots outline.
async function buildFeaturesLayer(
  imageBuffer: Buffer,
  mask: Uint8Array,
  tW: number,
  tH: number,
  bbox: { minX: number; minY: number; w: number; h: number },
  target: { x: number; y: number; w: number; h: number }
): Promise<Buffer | null> {
  if (bbox.w < 2 || bbox.h < 2) return null

  const meta = await sharp(imageBuffer).metadata()
  const sw = meta.width || tW
  const sh = meta.height || tH
  const scaleX = sw / tW
  const scaleY = sh / tH

  const cx = Math.max(0, Math.floor(bbox.minX * scaleX))
  const cy = Math.max(0, Math.floor(bbox.minY * scaleY))
  const cw = Math.max(1, Math.min(sw - cx, Math.round(bbox.w * scaleX)))
  const ch = Math.max(1, Math.min(sh - cy, Math.round(bbox.h * scaleY)))

  // Faded grey line art tile (single greyscale channel)
  const artRaw = await sharp(imageBuffer)
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .resize(target.w, target.h, { fit: 'fill' })
    .greyscale()
    .linear(0.42, 150) // black -> ~150 grey, white stays white
    .raw()
    .toBuffer()

  // Subject mask tile (single channel) aligned to the same crop
  const maskFull = Buffer.alloc(tW * tH)
  for (let i = 0; i < tW * tH; i++) maskFull[i] = mask[i] ? 255 : 0
  const maskRaw = await sharp(maskFull, { raw: { width: tW, height: tH, channels: 1 } })
    .extract({ left: bbox.minX, top: bbox.minY, width: bbox.w, height: bbox.h })
    .resize(target.w, target.h, { fit: 'fill' })
    .blur(0.8)
    .raw()
    .toBuffer()

  // Combine: grey art + alpha=mask (grey+alpha), flatten onto white -> tile
  const tilePng = await sharp(artRaw, { raw: { width: target.w, height: target.h, channels: 1 } })
    .joinChannel(maskRaw, { raw: { width: target.w, height: target.h, channels: 1 } })
    .flatten({ background: 'white' })
    .png()
    .toBuffer()

  return sharp({ create: { width: A4_W, height: A4_H, channels: 3, background: 'white' } })
    .composite([{ input: tilePng, left: target.x, top: target.y }])
    .png()
    .toBuffer()
}

// Scene mode: keep the WHOLE drawing (no background removal). Crop to the
// drawing's ink bounds, scale into `target`, and render it as crisp medium-grey
// line art so the bold black dots/numbers still read clearly on top. Kids can
// colour the whole picture in and join the dots around the outside.
async function buildSceneFeaturesLayer(
  imageBuffer: Buffer,
  tW: number,
  tH: number,
  bbox: { minX: number; minY: number; w: number; h: number },
  target: { x: number; y: number; w: number; h: number }
): Promise<Buffer | null> {
  if (bbox.w < 2 || bbox.h < 2) return null

  const meta = await sharp(imageBuffer).metadata()
  const sw = meta.width || tW
  const sh = meta.height || tH
  const scaleX = sw / tW
  const scaleY = sh / tH

  const cx = Math.max(0, Math.floor(bbox.minX * scaleX))
  const cy = Math.max(0, Math.floor(bbox.minY * scaleY))
  const cw = Math.max(1, Math.min(sw - cx, Math.round(bbox.w * scaleX)))
  const ch = Math.max(1, Math.min(sh - cy, Math.round(bbox.h * scaleY)))

  // Crisp medium-grey line art for the whole scene. The outline the dots trace
  // is wiped separately at render time (a white stroke along the contour), so
  // the tile itself stays a plain, artefact-free drawing.
  const tile = await sharp(imageBuffer)
    .extract({ left: cx, top: cy, width: cw, height: ch })
    .resize(target.w, target.h, { fit: 'fill' })
    .greyscale()
    .linear(0.72, 64) // black lines -> ~medium grey, white paper stays white
    .png()
    .toBuffer()

  return sharp({ create: { width: A4_W, height: A4_H, channels: 3, background: 'white' } })
    .composite([{ input: tile, left: target.x, top: target.y }])
    .png()
    .toBuffer()
}

function clampDots(n: number): number {
  if (!Number.isFinite(n)) return 100
  return Math.max(8, Math.min(300, Math.round(n)))
}

// Reject a contour that just traces the image frame (subject fills/opens to
// the borders) so we fall back to a feature-based puzzle instead of a box.
function isFrameContour(contour: Point[], w: number, h: number): boolean {
  let onBorder = 0
  for (const p of contour) {
    if (p.x <= 1 || p.y <= 1 || p.x >= w - 2 || p.y >= h - 2) onBorder++
  }
  // Only reject a near-complete frame rectangle. A subject that merely touches
  // one edge (e.g. a portrait's shoulders reaching the bottom) is still fine.
  return onBorder / contour.length > 0.85
}

// Moving-average smoothing around a closed loop for a flowing outline.
function smoothClosed(points: Point[], iterations: number, window: number): Point[] {
  const n = points.length
  if (n < 5) return points
  let pts = points
  for (let it = 0; it < iterations; it++) {
    const next: Point[] = new Array(n)
    for (let i = 0; i < n; i++) {
      let sx = 0
      let sy = 0
      let c = 0
      for (let k = -window; k <= window; k++) {
        const p = pts[(i + k + n) % n]
        sx += p.x
        sy += p.y
        c++
      }
      next[i] = { x: sx / c, y: sy / c }
    }
    pts = next
  }
  return pts
}

// ---------------------------------------------------------------------------
// Silhouette outline tracing
// ---------------------------------------------------------------------------
function traceSubjectOutline(
  grey: Uint8Array | Buffer,
  w: number,
  h: number
): { contour: Point[]; mask: Uint8Array | null } {
  const thr = otsuThreshold(grey, w * h)

  // Merge the ink (line-art strokes / dark subject) into one solid blob with a
  // morphological close sized to the image, fill any enclosed gaps, then take
  // the largest blob as the subject and trace its outer outline. This keeps
  // the main object and drops the background and internal detail, and copes
  // with subjects that run off the frame edge (e.g. a portrait's shoulders).
  // Try both ink polarities and keep the more subject-like blob.
  const darkBlob = inkBlob(grey, w, h, thr, true)
  const lightBlob = inkBlob(grey, w, h, thr, false)

  const pick = betterSubject(darkBlob, lightBlob, w, h)
  if (!pick) return { contour: [], mask: null }

  const mask = largestComponentMask(pick, w, h)
  if (!mask) return { contour: [], mask: null }
  return { contour: mooreTrace(mask, w, h), mask }
}

// Scene outline: the outer perimeter of the WHOLE drawing. Merge every dark
// stroke into one blob (generous dilation bridges gaps between elements), fill
// enclosed gaps, erode back, take the largest blob and trace its outer edge.
// Unlike traceSubjectOutline this keeps the entire composition, not just the
// dominant object — so the dots wrap the whole picture.
function traceSceneOutline(
  grey: Uint8Array | Buffer,
  w: number,
  h: number
): { contour: Point[]; mask: Uint8Array | null } {
  const thr = otsuThreshold(grey, w * h)
  const ink = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) ink[i] = grey[i] < thr ? 1 : 0
  const r = Math.max(4, Math.round(w * 0.03))
  let blob = morphSep(ink, w, h, r, true) // dilate — bridge gaps between parts
  blob = fillHolesMask(blob, w, h)
  blob = morphSep(blob, w, h, r, false) // erode back to size
  const mask = largestComponentMask(blob, w, h)
  if (!mask) return { contour: [], mask: null }
  return { contour: mooreTrace(mask, w, h), mask }
}

// Build a solid subject blob from ink: dilate to merge strokes/features into
// one shape, fill enclosed holes, erode back to roughly the original size.
function inkBlob(grey: Uint8Array | Buffer, w: number, h: number, thr: number, inkIsDark: boolean): Uint8Array {
  const ink = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    ink[i] = (inkIsDark ? grey[i] < thr : grey[i] >= thr) ? 1 : 0
  }
  const r = Math.max(3, Math.round(w * 0.018))
  let blob = morphSep(ink, w, h, r, true) // dilate
  blob = fillHolesMask(blob, w, h)
  blob = morphSep(blob, w, h, r, false) // erode
  return blob
}

// Fill holes: flood the background from the borders; any 0 not reached is an
// enclosed hole and becomes part of the mask.
function fillHolesMask(mask: Uint8Array, w: number, h: number): Uint8Array {
  const reached = new Uint8Array(w * h)
  const stack = new Int32Array(w * h)
  let sp = 0
  const push = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return
    const i = y * w + x
    if (!reached[i] && mask[i] === 0) {
      reached[i] = 1
      stack[sp++] = i
    }
  }
  for (let x = 0; x < w; x++) { push(x, 0); push(x, h - 1) }
  for (let y = 0; y < h; y++) { push(0, y); push(w - 1, y) }
  while (sp > 0) {
    const p = stack[--sp]
    const px = p % w
    const py = (p / w) | 0
    push(px + 1, py); push(px - 1, py); push(px, py + 1); push(px, py - 1)
  }
  const out = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) out[i] = mask[i] === 1 || reached[i] === 0 ? 1 : 0
  return out
}

// Separable binary dilate/erode with a square structuring element (O(w*h*r)).
function morphSep(src: Uint8Array, w: number, h: number, r: number, dilate: boolean): Uint8Array {
  const tmp = new Uint8Array(w * h)
  for (let y = 0; y < h; y++) {
    const row = y * w
    for (let x = 0; x < w; x++) {
      if (!dilate && (x - r < 0 || x + r >= w)) { tmp[row + x] = 0; continue }
      const lo = x - r < 0 ? 0 : x - r
      const hi = x + r >= w ? w - 1 : x + r
      let v = dilate ? 0 : 1
      for (let nx = lo; nx <= hi; nx++) {
        const s = src[row + nx]
        if (dilate) { if (s) { v = 1; break } } else if (!s) { v = 0; break }
      }
      tmp[row + x] = v
    }
  }
  const out = new Uint8Array(w * h)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (!dilate && (y - r < 0 || y + r >= h)) { out[y * w + x] = 0; continue }
      const lo = y - r < 0 ? 0 : y - r
      const hi = y + r >= h ? h - 1 : y + r
      let v = dilate ? 0 : 1
      for (let ny = lo; ny <= hi; ny++) {
        const s = tmp[ny * w + x]
        if (dilate) { if (s) { v = 1; break } } else if (!s) { v = 0; break }
      }
      out[y * w + x] = v
    }
  }
  return out
}

// Choose the polarity whose subject fill is a plausible object (5%–92% of
// the frame). Prefer the smaller sensible one; reject frame-filling blobs.
function betterSubject(a: Uint8Array, b: Uint8Array, w: number, h: number): Uint8Array | null {
  const total = w * h
  const frac = (m: Uint8Array) => {
    let c = 0
    for (let i = 0; i < total; i++) c += m[i]
    return c / total
  }
  const fa = frac(a)
  const fb = frac(b)
  const ok = (f: number) => f >= 0.01 && f <= 0.92
  const aOk = ok(fa)
  const bOk = ok(fb)
  if (aOk && bOk) return fa <= fb ? a : b
  if (aOk) return a
  if (bOk) return b
  return null
}

function otsuThreshold(data: Uint8Array | Buffer, len: number): number {
  const hist = new Array(256).fill(0)
  for (let i = 0; i < len; i++) hist[data[i]]++
  let sum = 0
  for (let t = 0; t < 256; t++) sum += t * hist[t]
  let sumB = 0
  let wB = 0
  let max = 0
  let thr = 127
  for (let t = 0; t < 256; t++) {
    wB += hist[t]
    if (wB === 0) continue
    const wF = len - wB
    if (wF === 0) break
    sumB += t * hist[t]
    const mB = sumB / wB
    const mF = (sum - sumB) / wF
    const between = wB * wF * (mB - mF) * (mB - mF)
    if (between > max) {
      max = between
      thr = t
    }
  }
  return thr
}

function largestComponentMask(fg: Uint8Array, w: number, h: number): Uint8Array | null {
  const label = new Int32Array(w * h)
  const stack = new Int32Array(w * h)
  let cur = 0
  let bestLabel = 0
  let bestSize = 0

  for (let s = 0; s < w * h; s++) {
    if (fg[s] !== 1 || label[s] !== 0) continue
    cur++
    let sp = 0
    stack[sp++] = s
    label[s] = cur
    let size = 0
    while (sp > 0) {
      const p = stack[--sp]
      size++
      const px = p % w
      const py = (p / w) | 0
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (dx === 0 && dy === 0) continue
          const nx = px + dx
          const ny = py + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          const np = ny * w + nx
          if (fg[np] === 1 && label[np] === 0) {
            label[np] = cur
            stack[sp++] = np
          }
        }
      }
    }
    if (size > bestSize) {
      bestSize = size
      bestLabel = cur
    }
  }

  // Reject if the subject is too tiny to be meaningful
  if (bestLabel === 0 || bestSize < w * h * 0.01) return null

  const out = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) out[i] = label[i] === bestLabel ? 1 : 0
  return out
}

// Moore-neighbour boundary tracing (clockwise, Jacob's stopping criterion)
const N8: ReadonlyArray<readonly [number, number]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
]
function mooreTrace(mask: Uint8Array, w: number, h: number): Point[] {
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : mask[y * w + x])

  let sx = -1
  let sy = -1
  for (let y = 0; y < h && sy < 0; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] === 1) {
        sx = x
        sy = y
        break
      }
    }
  }
  if (sx < 0) return []

  const contour: Point[] = []
  let px = sx
  let py = sy
  let back = 4 // arrived from the West (background to the left of the start)
  // Any real boundary is far shorter than this; a hard cap guarantees we
  // terminate even on pathological masks (and never blow up downstream).
  const maxSteps = Math.min(w * h, 8 * (w + h) + 1000)
  let steps = 0

  while (steps++ < maxSteps) {
    contour.push({ x: px, y: py })
    let found = false
    for (let i = 1; i <= 8; i++) {
      const d = (back + i) % 8
      const nx = px + N8[d][0]
      const ny = py + N8[d][1]
      if (at(nx, ny) === 1) {
        back = (d + 4) % 8
        px = nx
        py = ny
        found = true
        break
      }
    }
    if (!found) break // isolated pixel
    // Stop once we return to the start after tracing the loop.
    if (px === sx && py === sy && contour.length > 2) break
  }
  return contour
}

// ---------------------------------------------------------------------------
// Dot distribution (exactly N dots, corners preserved)
// ---------------------------------------------------------------------------
// Evenly space n dots around a closed contour by arc length. Guarantees a
// uniform gap between consecutive dots (perimeter / n), so numbers never
// collide the way corner-preserving simplification can let them.
function resampleEven(contour: Point[], n: number): Point[] {
  const N = contour.length
  if (N < 2 || n < 2) return contour.slice(0, Math.max(1, n))

  const seg: number[] = new Array(N)
  let total = 0
  for (let i = 0; i < N; i++) {
    const a = contour[i]
    const b = contour[(i + 1) % N]
    const d = Math.hypot(b.x - a.x, b.y - a.y)
    seg[i] = d
    total += d
  }
  if (total === 0) return [contour[0]]

  const step = total / n
  const out: Point[] = []
  let i = 0
  let acc = 0
  for (let k = 0; k < n; k++) {
    const dist = k * step
    while (i < N && acc + seg[i] < dist) {
      acc += seg[i]
      i++
    }
    if (i >= N) {
      out.push({ ...contour[N - 1] })
      continue
    }
    const a = contour[i]
    const b = contour[(i + 1) % N]
    const t = seg[i] > 0 ? (dist - acc) / seg[i] : 0
    out.push({ x: Math.round(a.x + (b.x - a.x) * t), y: Math.round(a.y + (b.y - a.y) * t) })
  }
  return out
}

function distributeDots(contour: Point[], n: number): Point[] {
  let pts = rdpSimplify(contour, 1.6)
  if (pts.length < 3) pts = contour.slice()

  // Too many corners -> raise epsilon until we're at/under n
  if (pts.length > n) {
    let lo = 1.6
    let hi = 800
    for (let it = 0; it < 24 && hi - lo > 0.5; it++) {
      const mid = (lo + hi) / 2
      const r = rdpSimplify(contour, mid)
      if (r.length > n) lo = mid
      else hi = mid
    }
    pts = rdpSimplify(contour, hi)
    if (pts.length > n) {
      const step = pts.length / n
      const out: Point[] = []
      for (let i = 0; i < n; i++) out.push(pts[Math.floor(i * step)])
      pts = out
    }
  }

  // Fewer than n -> subdivide the longest closed-loop edges (keeps corners)
  const distSq = (a: Point, b: Point) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2
  let guard = 0
  while (pts.length < n && guard++ < n * 4) {
    let bi = 0
    let bd = -1
    for (let i = 0; i < pts.length; i++) {
      const j = (i + 1) % pts.length
      const d = distSq(pts[i], pts[j])
      if (d > bd) {
        bd = d
        bi = i
      }
    }
    const a = pts[bi]
    const b = pts[(bi + 1) % pts.length]
    pts.splice(bi + 1, 0, { x: Math.round((a.x + b.x) / 2), y: Math.round((a.y + b.y) / 2) })
  }

  return pts.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
}

function rdpSimplify(points: Point[], epsilon: number): Point[] {
  if (points.length <= 2) return points
  let maxDist = 0
  let maxIdx = 0
  const first = points[0]
  const last = points[points.length - 1]
  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], first, last)
    if (dist > maxDist) {
      maxDist = dist
      maxIdx = i
    }
  }
  if (maxDist > epsilon) {
    const left = rdpSimplify(points.slice(0, maxIdx + 1), epsilon)
    const right = rdpSimplify(points.slice(maxIdx), epsilon)
    return [...left.slice(0, -1), ...right]
  }
  return [first, last]
}

function perpendicularDistance(point: Point, lineStart: Point, lineEnd: Point): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const lenSq = dx * dx + dy * dy
  if (lenSq === 0) {
    const ex = point.x - lineStart.x
    const ey = point.y - lineStart.y
    return Math.sqrt(ex * ex + ey * ey)
  }
  const t = Math.max(0, Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq))
  const projX = lineStart.x + t * dx
  const projY = lineStart.y + t * dy
  const ex = point.x - projX
  const ey = point.y - projY
  return Math.sqrt(ex * ex + ey * ey)
}

// ---------------------------------------------------------------------------
// Fallback: edge-cloud nearest-neighbour path (used only if no subject found).
// Returns an ordered contour in trace-resolution coords.
// ---------------------------------------------------------------------------
function fallbackContour(grey: Uint8Array | Buffer, w: number, h: number): Point[] {
  const edges: Point[] = []
  // Sobel-ish gradient magnitude via neighbour differences
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 40000)))
  for (let y = 1; y < h - 1; y += step) {
    for (let x = 1; x < w - 1; x += step) {
      const gx = grey[y * w + x + 1] - grey[y * w + x - 1]
      const gy = grey[(y + 1) * w + x] - grey[(y - 1) * w + x]
      if (gx * gx + gy * gy > 900) edges.push({ x, y })
    }
  }
  if (edges.length < 3) {
    // Last resort: a friendly circle
    const cx = w / 2
    const cy = h / 2
    const r = Math.min(w, h) * 0.4
    const out: Point[] = []
    for (let i = 0; i < 64; i++) {
      const a = (i / 64) * Math.PI * 2
      out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
    }
    return out
  }
  return nearestNeighbourPath(edges, 400)
}

function nearestNeighbourPath(points: Point[], maxPoints: number): Point[] {
  let working = points
  if (working.length > maxPoints) {
    const step = Math.ceil(working.length / maxPoints)
    working = working.filter((_, i) => i % step === 0)
  }
  const visited = new Set<number>()
  const path: Point[] = []
  let currentIdx = 0
  let minVal = Infinity
  for (let i = 0; i < working.length; i++) {
    const val = working[i].y * 100000 + working[i].x
    if (val < minVal) {
      minVal = val
      currentIdx = i
    }
  }
  path.push(working[currentIdx])
  visited.add(currentIdx)
  while (path.length < working.length) {
    let bestDist = Infinity
    let bestIdx = -1
    const cur = path[path.length - 1]
    for (let i = 0; i < working.length; i++) {
      if (visited.has(i)) continue
      const dx = working[i].x - cur.x
      const dy = working[i].y - cur.y
      const dist = dx * dx + dy * dy
      if (dist < bestDist) {
        bestDist = dist
        bestIdx = i
      }
    }
    if (bestIdx === -1) break
    path.push(working[bestIdx])
    visited.add(bestIdx)
  }
  return path
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

// Digit glyphs as stroked SVG paths on a 6x10 grid — font-free so numbers
// render identically on any server (Vercel's SVG renderer has no fonts, which
// turned <text> into empty boxes).
const DIGIT_GLYPHS: Record<string, string> = {
  '0': 'M3,0.6 C1.4,0.6 0.7,2.4 0.7,5 C0.7,7.6 1.4,9.4 3,9.4 C4.6,9.4 5.3,7.6 5.3,5 C5.3,2.4 4.6,0.6 3,0.6 Z',
  '1': 'M1.5,2.9 L3.2,1.1 L3.2,9.4',
  '2': 'M1,2.5 C1,1.2 2.2,0.6 3.2,0.7 C5,0.85 5.5,2.7 4.3,4.1 C3.4,5.1 1,6.9 1,9.4 L5.3,9.4',
  '3': 'M1.2,1.5 C2.7,0.4 5.2,0.8 5.1,3 C5.05,4.3 3.9,4.9 2.8,4.9 C4,4.9 5.4,5.5 5.4,7.3 C5.4,9.8 2.3,10 1,8.3',
  '4': 'M4.5,0.9 L1,6.9 L5.6,6.9 M4.5,0.9 L4.5,9.4',
  '5': 'M5,1 L1.8,1 L1.35,4.9 C2.7,4 5.4,4.3 5.4,7 C5.4,9.8 2.3,9.9 1.1,8.2',
  '6': 'M5.2,1.5 C3.5,0.3 0.9,1 0.9,5.1 C0.9,10 5.4,9.7 5.4,6.9 C5.4,4.3 2.1,4 1.15,6.4',
  '7': 'M1,1 L5.4,1 L2.4,9.4',
  '8': 'M3,4.7 C1.5,4.7 1,3.4 1,2.6 C1,1.1 2.1,0.6 3,0.6 C3.9,0.6 5,1.1 5,2.6 C5,3.4 4.5,4.7 3,4.7 C1.3,4.7 0.8,6.2 0.8,7.3 C0.8,9 2.1,9.4 3,9.4 C3.9,9.4 5.2,9 5.2,7.3 C5.2,6.2 4.7,4.7 3,4.7 Z',
  '9': 'M1.1,8.5 C2.7,9.7 5.1,9 5.1,5 C5.1,0.2 0.6,0.3 0.6,3.3 C0.6,5.8 3.9,6.1 4.85,3.6',
}

// SVG for a number, drawn as vector strokes with a white halo. `left`/`top`
// are the top-left of the number box; height is `fs`.
function numberSvg(n: number, left: number, top: number, fs: number): string {
  const s = fs / 10
  const gw = 6 * s
  const sp = 1.2 * s
  const sw = Math.max(1.6, fs * 0.14)
  const digits = String(n).split('')
  let halo = ''
  let ink = ''
  let cx = left
  for (const d of digits) {
    const path = DIGIT_GLYPHS[d]
    if (path) {
      const t = `translate(${cx.toFixed(1)},${top.toFixed(1)}) scale(${s.toFixed(3)})`
      halo += `<path d="${path}" transform="${t}" fill="none" stroke="#ffffff" stroke-width="${((sw + 6) / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
      ink += `<path d="${path}" transform="${t}" fill="none" stroke="#111111" stroke-width="${(sw / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
    }
    cx += gw + sp
  }
  return halo + ink
}

async function renderDotToDotPng(
  dots: Point[],
  settings: DotJobSettings,
  features?: Buffer | null,
  erasePath?: Point[] | null
): Promise<Buffer> {
  const dotRadius = 11
  const fontSize = 30

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`

  // Wipe the drawing's own perimeter line along the dot path (scene mode), so
  // the outline is a gap the child fills in by joining the dots.
  if (erasePath && erasePath.length > 1) {
    const pts = erasePath.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    svg += `<polyline points="${pts}" fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>`
  }

  if (settings.showGuideLines) {
    svg += `<g stroke="#e2e2e2" stroke-width="1.5" fill="none">`
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i]
      const b = dots[(i + 1) % dots.length]
      svg += `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}"/>`
    }
    svg += `</g>`
  }

  // Numbers (vector; white halo then black ink)
  for (let i = 0; i < dots.length; i++) {
    svg += numberSvg(i + 1, dots[i].x + dotRadius + 4, dots[i].y - dotRadius - fontSize, fontSize)
  }

  // Dots (mark #1 with a ring)
  svg += `<g fill="#111">`
  for (let i = 0; i < dots.length; i++) {
    svg += `<circle cx="${dots[i].x}" cy="${dots[i].y}" r="${dotRadius}"/>`
  }
  svg += `</g>`
  if (dots.length > 0) {
    const s = dots[0]
    svg += `<circle cx="${s.x}" cy="${s.y}" r="${dotRadius + 9}" fill="none" stroke="#111" stroke-width="3"/>`
  }
  svg += `</svg>`

  // Base = white page, with the faint "features" line art composited under the
  // dots when provided (features drawn in, outline connect-the-dots).
  const layers: sharp.OverlayOptions[] = []
  if (features) layers.push({ input: features })
  layers.push({ input: Buffer.from(svg) })

  return sharp({
    create: { width: A4_W, height: A4_H, channels: 3, background: 'white' },
  })
    .composite(layers)
    .png()
    .toBuffer()
}

async function renderDotToDotPdf(
  dots: Point[],
  settings: DotJobSettings,
  features?: Buffer | null,
  erasePath?: Point[] | null
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([A4_W_PT, A4_H_PT])
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Drawn-in features behind the dots
  if (features) {
    try {
      const img = await pdfDoc.embedPng(features)
      page.drawImage(img, { x: 0, y: 0, width: A4_W_PT, height: A4_H_PT })
    } catch { /* ignore */ }
  }

  // dots are in A4 pixel coordinates; map straight to PDF points.
  const toPdfX = (px: number) => px * (A4_W_PT / A4_W)
  const toPdfY = (px: number) => A4_H_PT - px * (A4_H_PT / A4_H)

  // Wipe the drawing's perimeter line along the dot path (scene mode).
  if (erasePath && erasePath.length > 1) {
    const wPt = 34 * (A4_W_PT / A4_W)
    for (let i = 0; i < erasePath.length - 1; i++) {
      const a = erasePath[i]
      const b = erasePath[i + 1]
      page.drawLine({
        start: { x: toPdfX(a.x), y: toPdfY(a.y) },
        end: { x: toPdfX(b.x), y: toPdfY(b.y) },
        thickness: wPt,
        color: rgb(1, 1, 1),
      })
    }
  }

  const dotRadius = 3.4
  const fontSize = 8

  if (settings.showGuideLines) {
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i]
      const b = dots[(i + 1) % dots.length]
      page.drawLine({
        start: { x: toPdfX(a.x), y: toPdfY(a.y) },
        end: { x: toPdfX(b.x), y: toPdfY(b.y) },
        thickness: 0.4,
        color: rgb(0.88, 0.88, 0.88),
      })
    }
  }

  for (let i = 0; i < dots.length; i++) {
    const cx = toPdfX(dots[i].x)
    const cy = toPdfY(dots[i].y)
    page.drawCircle({ x: cx, y: cy, size: dotRadius, color: rgb(0.07, 0.07, 0.07) })
    page.drawText(String(i + 1), {
      x: cx + dotRadius + 2,
      y: cy + dotRadius + 1,
      size: fontSize,
      font,
      color: rgb(0.07, 0.07, 0.07),
    })
  }

  if (dots.length > 0) {
    const cx = toPdfX(dots[0].x)
    const cy = toPdfY(dots[0].y)
    page.drawCircle({ x: cx, y: cy, size: dotRadius + 3, borderColor: rgb(0.07, 0.07, 0.07), borderWidth: 1 })
  }

  const footerText = 'colour.page'
  const footerWidth = font.widthOfTextAtSize(footerText, 8)
  page.drawText(footerText, {
    x: A4_W_PT / 2 - footerWidth / 2,
    y: 12,
    size: 8,
    font,
    color: rgb(0.78, 0.78, 0.78),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
