/**
 * Dot-to-Dot Engine — Contour-based
 *
 * Converts a photo into a numbered dot-to-dot puzzle using Sharp.
 * Pipeline:
 *   1. Preprocess (greyscale, denoise, contrast-enhance)
 *   2. Adaptive threshold → binary edge image
 *   3. Moore boundary tracing to extract ordered contour paths
 *   4. Rank contours by perimeter, keep the most significant ones
 *   5. Simplify contour paths (Ramer-Douglas-Peucker)
 *   6. Resample N dots evenly by arc length across all kept contours
 *   7. Render dots + numbers on A4 canvas (PNG + PDF)
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

// Processing resolution (work at lower res for speed, scale dots back up)
const WORK_MAX = 800

/**
 * Full pipeline: photo buffer → dot-to-dot PNG + PDF buffers.
 */
export async function generateDotToDot(
  imageBuffer: Buffer,
  settings: DotJobSettings,
  onProgress?: (pct: number) => Promise<void>
): Promise<{ png: Buffer; pdf: Buffer }> {
  await onProgress?.(5)

  // 1. Preprocess — resize to working resolution, greyscale, denoise
  const metadata = await sharp(imageBuffer).metadata()
  const srcW = metadata.width || 800
  const srcH = metadata.height || 600

  // Scale to fit content area while keeping aspect ratio
  const fitScale = Math.min(CONTENT_W / srcW, CONTENT_H / srcH)
  const fitW = Math.round(srcW * fitScale)
  const fitH = Math.round(srcH * fitScale)

  // Work at reduced resolution for speed
  const workScale = Math.min(1, WORK_MAX / Math.max(fitW, fitH))
  const workW = Math.round(fitW * workScale)
  const workH = Math.round(fitH * workScale)

  const greyBuf = await sharp(imageBuffer)
    .resize(workW, workH, { fit: 'fill' })
    .greyscale()
    .normalize()
    .median(3) // denoise
    .toBuffer()

  await onProgress?.(15)

  // 2. Edge detection — multi-scale adaptive threshold
  const rawPixels = await sharp(greyBuf).raw().toBuffer()
  const binary = adaptiveThreshold(rawPixels, workW, workH)

  // Morphological close to connect broken edges (dilate then erode)
  morphClose(binary, workW, workH, 2)

  await onProgress?.(30)

  // 3. Contour extraction — Moore boundary tracing
  const contours = traceContours(binary, workW, workH)

  await onProgress?.(45)

  // 4. Rank contours by perimeter, keep the most significant ones
  const ranked = contours
    .map(c => ({ points: c, perim: contourPerimeter(c) }))
    .filter(c => c.perim > 20) // discard tiny noise contours
    .sort((a, b) => b.perim - a.perim)

  // Allocate dots proportional to contour perimeter
  const targetDots = settings.dotCount
  const totalPerim = ranked.reduce((s, c) => s + c.perim, 0)

  // Keep enough contours to use at least 80% of dots, or top 30
  let usedPerim = 0
  const kept: { points: Point[]; perim: number }[] = []
  for (const c of ranked) {
    kept.push(c)
    usedPerim += c.perim
    if (kept.length >= 30 || usedPerim > totalPerim * 0.85) break
  }

  if (kept.length === 0) {
    // Fallback: if no contours found, generate a simple outline
    kept.push({
      points: [
        { x: 10, y: 10 },
        { x: workW - 10, y: 10 },
        { x: workW - 10, y: workH - 10 },
        { x: 10, y: workH - 10 },
      ],
      perim: 2 * (workW + workH) - 80,
    })
  }

  await onProgress?.(55)

  // 5. Simplify each contour with RDP
  const epsilon = difficultyEpsilon(settings.difficulty, workW, workH)
  const simplified = kept.map(c => ({
    points: rdpSimplify(c.points, epsilon),
    perim: c.perim,
  }))

  // 6. Distribute dots across contours proportional to perimeter
  const keptPerim = simplified.reduce((s, c) => s + c.perim, 0)
  let dotsRemaining = targetDots
  const allDots: Point[] = []

  for (let i = 0; i < simplified.length; i++) {
    const c = simplified[i]
    const share =
      i === simplified.length - 1
        ? dotsRemaining
        : Math.max(3, Math.round((c.perim / keptPerim) * targetDots))
    const n = Math.min(share, dotsRemaining)
    if (n < 2) continue

    const sampled = sampleEvenly(c.points, n)
    // Scale from working resolution back to fit resolution
    for (const p of sampled) {
      allDots.push({
        x: Math.round(p.x / workScale),
        y: Math.round(p.y / workScale),
      })
    }
    dotsRemaining -= sampled.length
    if (dotsRemaining <= 0) break
  }

  await onProgress?.(65)

  // 7. Render PNG
  const pngBuffer = await renderDotToDotPng(allDots, fitW, fitH, settings)
  await onProgress?.(80)

  // 8. Render PDF
  const pdfBuffer = await renderDotToDotPdf(allDots, fitW, fitH, settings)
  await onProgress?.(95)

  return { png: pngBuffer, pdf: pdfBuffer }
}

// ---------------------------------------------------------------------------
// Adaptive threshold — local mean threshold for edge extraction
// ---------------------------------------------------------------------------

function adaptiveThreshold(
  pixels: Buffer,
  w: number,
  h: number,
  blockRadius = 12,
  C = 8
): Uint8Array {
  // Build integral image for fast local mean
  const integral = new Float64Array((w + 1) * (h + 1))
  for (let y = 0; y < h; y++) {
    let rowSum = 0
    for (let x = 0; x < w; x++) {
      rowSum += pixels[y * w + x]
      integral[(y + 1) * (w + 1) + (x + 1)] =
        rowSum + integral[y * (w + 1) + (x + 1)]
    }
  }

  const out = new Uint8Array(w * h)
  const stride = w + 1

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const x0 = Math.max(0, x - blockRadius)
      const y0 = Math.max(0, y - blockRadius)
      const x1 = Math.min(w - 1, x + blockRadius)
      const y1 = Math.min(h - 1, y + blockRadius)

      const area = (x1 - x0 + 1) * (y1 - y0 + 1)
      const sum =
        integral[(y1 + 1) * stride + (x1 + 1)] -
        integral[y0 * stride + (x1 + 1)] -
        integral[(y1 + 1) * stride + x0] +
        integral[y0 * stride + x0]

      const mean = sum / area
      // Pixel is "edge/foreground" if darker than local mean minus C
      out[y * w + x] = pixels[y * w + x] < mean - C ? 255 : 0
    }
  }
  return out
}

// ---------------------------------------------------------------------------
// Morphological close (dilate then erode) using box structuring element
// ---------------------------------------------------------------------------

function morphClose(img: Uint8Array, w: number, h: number, radius: number) {
  const tmp = new Uint8Array(w * h)

  // Dilate: pixel is 255 if any neighbour in radius is 255
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 0
      for (let dy = -radius; dy <= radius && !val; dy++) {
        for (let dx = -radius; dx <= radius && !val; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            if (img[ny * w + nx] === 255) val = 255
          }
        }
      }
      tmp[y * w + x] = val
    }
  }

  // Erode: pixel is 255 only if all neighbours in radius are 255
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let val = 255
      for (let dy = -radius; dy <= radius && val; dy++) {
        for (let dx = -radius; dx <= radius && val; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx >= 0 && nx < w && ny >= 0 && ny < h) {
            if (tmp[ny * w + nx] === 0) val = 0
          } else {
            val = 0
          }
        }
      }
      img[y * w + x] = val
    }
  }
}

// ---------------------------------------------------------------------------
// Moore boundary tracing — extract ordered contour points from binary image
// ---------------------------------------------------------------------------

function traceContours(binary: Uint8Array, w: number, h: number): Point[][] {
  const visited = new Uint8Array(w * h) // marks contour-boundary pixels we've already traced
  const contours: Point[][] = []

  // 8-connected Moore neighbourhood (clockwise from right)
  const dx8 = [1, 1, 0, -1, -1, -1, 0, 1]
  const dy8 = [0, 1, 1, 1, 0, -1, -1, -1]

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = y * w + x
      if (binary[idx] !== 255 || visited[idx]) continue

      // Check if this is a border pixel (has at least one background neighbour)
      let isBorder = false
      for (let d = 0; d < 8; d++) {
        const nx = x + dx8[d]
        const ny = y + dy8[d]
        if (binary[ny * w + nx] === 0) { isBorder = true; break }
      }
      if (!isBorder) continue

      // Trace the contour using Moore boundary tracing
      const contour: Point[] = []
      const startX = x
      const startY = y

      // Find the direction of the first background pixel (entry direction)
      let dir = 0
      for (let d = 0; d < 8; d++) {
        const nx = x + dx8[d]
        const ny = y + dy8[d]
        if (binary[ny * w + nx] === 0) { dir = d; break }
      }

      let cx = startX
      let cy = startY
      let steps = 0
      const maxSteps = w * h // safety limit

      do {
        contour.push({ x: cx, y: cy })
        visited[cy * w + cx] = 1

        // Search clockwise from (dir + 5) mod 8 = backtrack direction + 1
        const searchStart = (dir + 5) % 8
        let found = false

        for (let i = 0; i < 8; i++) {
          const d = (searchStart + i) % 8
          const nx = cx + dx8[d]
          const ny = cy + dy8[d]

          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue

          if (binary[ny * w + nx] === 255) {
            cx = nx
            cy = ny
            dir = d
            found = true
            break
          }
        }

        if (!found) break
        steps++
      } while ((cx !== startX || cy !== startY) && steps < maxSteps)

      if (contour.length >= 8) {
        // Subsample dense contours to reduce point count while keeping shape
        const maxContourPts = 2000
        if (contour.length > maxContourPts) {
          const step = contour.length / maxContourPts
          const sub: Point[] = []
          for (let i = 0; i < maxContourPts; i++) {
            sub.push(contour[Math.floor(i * step)])
          }
          contours.push(sub)
        } else {
          contours.push(contour)
        }
      }
    }
  }

  return contours
}

// ---------------------------------------------------------------------------
// Contour perimeter
// ---------------------------------------------------------------------------

function contourPerimeter(pts: Point[]): number {
  let len = 0
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x
    const dy = pts[i].y - pts[i - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  // Close the loop
  if (pts.length > 2) {
    const dx = pts[0].x - pts[pts.length - 1].x
    const dy = pts[0].y - pts[pts.length - 1].y
    len += Math.sqrt(dx * dx + dy * dy)
  }
  return len
}

// ---------------------------------------------------------------------------
// Difficulty → RDP epsilon mapping
// ---------------------------------------------------------------------------

function difficultyEpsilon(
  difficulty: string,
  w: number,
  h: number
): number {
  const diag = Math.sqrt(w * w + h * h)
  switch (difficulty) {
    case 'easy':
      return diag * 0.02 // very simplified, fewer corners
    case 'hard':
      return diag * 0.005 // keep fine detail
    default: // medium
      return diag * 0.01
  }
}

// ---------------------------------------------------------------------------
// Ramer-Douglas-Peucker line simplification
// ---------------------------------------------------------------------------

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

function perpendicularDistance(
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number {
  const dx = lineEnd.x - lineStart.x
  const dy = lineEnd.y - lineStart.y
  const lenSq = dx * dx + dy * dy

  if (lenSq === 0) {
    const ex = point.x - lineStart.x
    const ey = point.y - lineStart.y
    return Math.sqrt(ex * ex + ey * ey)
  }

  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq
    )
  )
  const projX = lineStart.x + t * dx
  const projY = lineStart.y + t * dy
  const ex = point.x - projX
  const ey = point.y - projY
  return Math.sqrt(ex * ex + ey * ey)
}

// ---------------------------------------------------------------------------
// Sample N evenly-spaced points along a polyline by arc length
// ---------------------------------------------------------------------------

function sampleEvenly(points: Point[], n: number): Point[] {
  if (points.length <= 1) return points
  if (n <= 1) return [points[0]]
  if (points.length <= n) return points

  // Calculate total path length
  let totalLength = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    totalLength += Math.sqrt(dx * dx + dy * dy)
  }

  if (totalLength === 0) return [points[0]]

  const interval = totalLength / (n - 1)
  const result: Point[] = [points[0]]
  let accumulated = 0
  let nextTarget = interval

  for (let i = 1; i < points.length && result.length < n; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    const segLen = Math.sqrt(dx * dx + dy * dy)

    while (accumulated + segLen >= nextTarget && result.length < n) {
      const t = (nextTarget - accumulated) / segLen
      result.push({
        x: Math.round(points[i - 1].x + dx * t),
        y: Math.round(points[i - 1].y + dy * t),
      })
      nextTarget += interval
    }

    accumulated += segLen
  }

  // Ensure we have exactly n points
  while (result.length < n) {
    result.push(points[points.length - 1])
  }

  return result.slice(0, n)
}

// ---------------------------------------------------------------------------
// Render dots + numbers to PNG on A4 canvas
// ---------------------------------------------------------------------------

async function renderDotToDotPng(
  dots: Point[],
  imageW: number,
  imageH: number,
  settings: DotJobSettings
): Promise<Buffer> {
  const offsetX = MARGIN + Math.round((CONTENT_W - imageW) / 2)
  const offsetY = MARGIN + Math.round((CONTENT_H - imageH) / 2)

  const dotRadius = 8
  const fontSize = 14
  const labelOffset = dotRadius + 4

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  svg += `<rect width="100%" height="100%" fill="white"/>`

  // Optional faint guide lines between consecutive dots
  if (settings.showGuideLines) {
    svg += `<g stroke="#d8d8d8" stroke-width="1.5" stroke-dasharray="6,4" fill="none">`
    for (let i = 0; i < dots.length - 1; i++) {
      const a = dots[i]
      const b = dots[i + 1]
      svg += `<line x1="${a.x + offsetX}" y1="${a.y + offsetY}" x2="${b.x + offsetX}" y2="${b.y + offsetY}"/>`
    }
    svg += `</g>`
  }

  // Dots
  svg += `<g fill="black">`
  for (const d of dots) {
    const cx = d.x + offsetX
    const cy = d.y + offsetY
    svg += `<circle cx="${cx}" cy="${cy}" r="${dotRadius}"/>`
  }
  svg += `</g>`

  // Numbers — position labels to avoid overlapping the dot
  svg += `<g font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="#333333">`
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i]
    const cx = d.x + offsetX
    const cy = d.y + offsetY

    // Choose label placement based on neighbouring dot direction
    let lx = cx + labelOffset
    let ly = cy - labelOffset
    if (i < dots.length - 1) {
      const next = dots[i + 1]
      const ndx = next.x - d.x
      const ndy = next.y - d.y
      // Place label opposite the direction to next dot
      if (Math.abs(ndx) > Math.abs(ndy)) {
        lx = ndx > 0 ? cx - labelOffset - 8 : cx + labelOffset
        ly = cy - labelOffset
      } else {
        lx = cx + labelOffset
        ly = ndy > 0 ? cy - labelOffset - 4 : cy + labelOffset + fontSize
      }
    }

    // Clamp to canvas
    lx = Math.max(MARGIN + 4, Math.min(A4_W - MARGIN - 30, lx))
    ly = Math.max(MARGIN + fontSize, Math.min(A4_H - MARGIN - 4, ly))

    svg += `<text x="${lx}" y="${ly}">${i + 1}</text>`
  }
  svg += `</g>`

  // Footer branding
  svg += `<text x="${A4_W / 2}" y="${A4_H - 40}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#cccccc">colour.page</text>`
  svg += `</svg>`

  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ---------------------------------------------------------------------------
// Render dots + numbers to PDF
// ---------------------------------------------------------------------------

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

  const dotRadius = 3
  const fontSize = 7

  // Optional faint guide lines
  if (settings.showGuideLines) {
    for (let i = 0; i < dots.length - 1; i++) {
      const a = dots[i]
      const b = dots[i + 1]
      page.drawLine({
        start: { x: toPdfX(a.x), y: toPdfY(a.y) },
        end: { x: toPdfX(b.x), y: toPdfY(b.y) },
        thickness: 0.3,
        color: rgb(0.85, 0.85, 0.85),
        dashArray: [3, 2],
      })
    }
  }

  // Dots + numbers
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i]
    const cx = toPdfX(d.x)
    const cy = toPdfY(d.y)

    page.drawCircle({
      x: cx,
      y: cy,
      size: dotRadius,
      color: rgb(0, 0, 0),
    })

    const numText = String(i + 1)
    const textW = font.widthOfTextAtSize(numText, fontSize)

    // Position label to avoid overlap — try right, then left, then above
    let tx = cx + dotRadius + 2
    let ty = cy + dotRadius + 1

    if (i < dots.length - 1) {
      const next = dots[i + 1]
      const ndx = toPdfX(next.x) - cx
      const ndy = toPdfY(next.y) - cy
      if (ndx > 0) {
        tx = cx - dotRadius - textW - 1
      }
      if (ndy > 0) {
        ty = cy - dotRadius - fontSize
      }
    }

    page.drawText(numText, {
      x: tx,
      y: ty,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    })
  }

  // Footer
  const footerText = 'colour.page'
  const footerWidth = font.widthOfTextAtSize(footerText, 8)
  page.drawText(footerText, {
    x: A4_W_PT / 2 - footerWidth / 2,
    y: 12,
    size: 8,
    font,
    color: rgb(0.75, 0.75, 0.75),
  })

  const pdfBytes = await pdfDoc.save()
  return Buffer.from(pdfBytes)
}
