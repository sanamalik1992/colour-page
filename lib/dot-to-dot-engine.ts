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
const MARGIN_PT = 28.35

// Resolution used for silhouette tracing (keeps it fast + smooth)
const TRACE_MAX = 640

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

  // Final placement space (fits within the A4 content area, keeps aspect)
  const scale = Math.min(CONTENT_W / srcW, CONTENT_H / srcH)
  const fitW = Math.max(2, Math.round(srcW * scale))
  const fitH = Math.max(2, Math.round(srcH * scale))

  // Low-res working image for tracing
  const tScale = Math.min(1, TRACE_MAX / Math.max(srcW, srcH))
  const tW = Math.max(2, Math.round(srcW * tScale))
  const tH = Math.max(2, Math.round(srcH * tScale))

  const { data } = await sharp(imageBuffer)
    .resize(tW, tH, { fit: 'fill' })
    .greyscale()
    .normalize()
    .blur(1.2)
    .raw()
    .toBuffer({ resolveWithObject: true })

  await onProgress?.(30)

  const targetDots = clampDots(settings.dotCount)

  // --- Trace the subject outline ---
  let contour = traceSubjectOutline(data, tW, tH)

  await onProgress?.(50)

  let dots: Point[]
  if (contour.length >= 8) {
    // Map trace coords -> fit coords
    const sx = fitW / tW
    const sy = fitH / tH
    contour = contour.map((p) => ({ x: p.x * sx, y: p.y * sy }))
    dots = distributeDots(contour, targetDots)
  } else {
    // Fallback: edge-cloud nearest-neighbour path (never fails)
    dots = fallbackDots(data, tW, tH, fitW, fitH, targetDots)
  }

  await onProgress?.(65)

  const pngBuffer = await renderDotToDotPng(dots, fitW, fitH, settings)
  await onProgress?.(80)

  const pdfBuffer = await renderDotToDotPdf(dots, fitW, fitH, settings)
  await onProgress?.(95)

  return { png: pngBuffer, pdf: pdfBuffer }
}

function clampDots(n: number): number {
  if (!Number.isFinite(n)) return 100
  return Math.max(8, Math.min(300, Math.round(n)))
}

// ---------------------------------------------------------------------------
// Silhouette outline tracing
// ---------------------------------------------------------------------------
function traceSubjectOutline(grey: Uint8Array | Buffer, w: number, h: number): Point[] {
  const thr = otsuThreshold(grey, w * h)

  // Decide which polarity is the background by sampling the border.
  let darkBorder = 0
  let borderN = 0
  for (let x = 0; x < w; x++) {
    darkBorder += grey[x] < thr ? 1 : 0
    darkBorder += grey[(h - 1) * w + x] < thr ? 1 : 0
    borderN += 2
  }
  for (let y = 0; y < h; y++) {
    darkBorder += grey[y * w] < thr ? 1 : 0
    darkBorder += grey[y * w + w - 1] < thr ? 1 : 0
    borderN += 2
  }
  const borderIsDark = darkBorder > borderN / 2

  // Foreground = the polarity that is NOT the background
  const fg = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const isDark = grey[i] < thr
    fg[i] = isDark !== borderIsDark ? 1 : 0
  }

  const mask = largestComponentMask(fg, w, h)
  if (!mask) return []
  return mooreTrace(mask, w, h)
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
// Fallback: edge-cloud nearest-neighbour path (used only if no subject found)
// ---------------------------------------------------------------------------
function fallbackDots(
  grey: Uint8Array | Buffer,
  w: number,
  h: number,
  fitW: number,
  fitH: number,
  n: number
): Point[] {
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
    // Last resort: a friendly circle of dots
    const cx = w / 2
    const cy = h / 2
    const r = Math.min(w, h) * 0.4
    const out: Point[] = []
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2
      out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r })
    }
    return scalePoints(out, w, h, fitW, fitH)
  }

  const ordered = nearestNeighbourPath(edges, n * 3)
  const dots = distributeDots(ordered, n)
  return scalePoints(dots, w, h, fitW, fitH)
}

function scalePoints(pts: Point[], w: number, h: number, fitW: number, fitH: number): Point[] {
  const sx = fitW / w
  const sy = fitH / h
  return pts.map((p) => ({ x: Math.round(p.x * sx), y: Math.round(p.y * sy) }))
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
async function renderDotToDotPng(
  dots: Point[],
  imageW: number,
  imageH: number,
  settings: DotJobSettings
): Promise<Buffer> {
  const offsetX = MARGIN + Math.round((CONTENT_W - imageW) / 2)
  const offsetY = MARGIN + Math.round((CONTENT_H - imageH) / 2)

  const dotRadius = 11
  const fontSize = 30

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  svg += `<rect width="100%" height="100%" fill="white"/>`

  if (settings.showGuideLines) {
    svg += `<g stroke="#e2e2e2" stroke-width="1.5" fill="none">`
    for (let i = 0; i < dots.length; i++) {
      const a = dots[i]
      const b = dots[(i + 1) % dots.length]
      svg += `<line x1="${a.x + offsetX}" y1="${a.y + offsetY}" x2="${b.x + offsetX}" y2="${b.y + offsetY}"/>`
    }
    svg += `</g>`
  }

  // Numbers with a white halo for legibility
  svg += `<g font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold">`
  for (let i = 0; i < dots.length; i++) {
    const cx = dots[i].x + offsetX
    const cy = dots[i].y + offsetY
    const nx = cx + dotRadius + 5
    const ny = cy - dotRadius - 3
    svg += `<text x="${nx}" y="${ny}" stroke="white" stroke-width="5" fill="white">${i + 1}</text>`
    svg += `<text x="${nx}" y="${ny}" fill="#111">${i + 1}</text>`
  }
  svg += `</g>`

  // Dots (mark #1 with a ring)
  svg += `<g fill="#111">`
  for (let i = 0; i < dots.length; i++) {
    svg += `<circle cx="${dots[i].x + offsetX}" cy="${dots[i].y + offsetY}" r="${dotRadius}"/>`
  }
  svg += `</g>`
  if (dots.length > 0) {
    const s = dots[0]
    svg += `<circle cx="${s.x + offsetX}" cy="${s.y + offsetY}" r="${dotRadius + 9}" fill="none" stroke="#111" stroke-width="3"/>`
    svg += `<text x="${s.x + offsetX}" y="${s.y + offsetY - dotRadius - 20}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="26" font-weight="bold" fill="#111">START</text>`
  }

  // Footer branding
  svg += `<text x="${A4_W / 2}" y="${A4_H - 46}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="24" fill="#c9c9c9">colour.page</text>`
  svg += `</svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

async function renderDotToDotPdf(
  dots: Point[],
  imageW: number,
  imageH: number,
  settings: DotJobSettings
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([A4_W_PT, A4_H_PT])
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  const scaleX = (A4_W_PT - MARGIN_PT * 2) / CONTENT_W
  const scaleY = (A4_H_PT - MARGIN_PT * 2) / CONTENT_H
  const offsetX = (CONTENT_W - imageW) / 2
  const offsetY = (CONTENT_H - imageH) / 2

  const toPdfX = (px: number) => MARGIN_PT + (px + offsetX) * scaleX
  const toPdfY = (px: number) => A4_H_PT - MARGIN_PT - (px + offsetY) * scaleY

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
