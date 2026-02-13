/**
 * Dot-to-Dot Engine
 *
 * Converts a photo into a numbered dot-to-dot puzzle using Sharp.
 * Pipeline:
 *   1. Preprocess (greyscale, denoise, contrast)
 *   2. Edge detection (difference-of-gaussians)
 *   3. Contour extraction (connected component boundary tracing)
 *   4. Simplify contours (Ramer-Douglas-Peucker)
 *   5. Sample N dots along the major contours
 *   6. Render dots + numbers on an A4 canvas
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

/**
 * Full pipeline: photo buffer -> dot-to-dot PNG + PDF buffers.
 */
export async function generateDotToDot(
  imageBuffer: Buffer,
  settings: DotJobSettings,
  onProgress?: (pct: number) => Promise<void>
): Promise<{ png: Buffer; pdf: Buffer }> {
  await onProgress?.(10)

  // 1. Preprocess
  const metadata = await sharp(imageBuffer).metadata()
  const srcW = metadata.width || 800
  const srcH = metadata.height || 600

  // Scale to fit content area while keeping aspect ratio
  const scale = Math.min(CONTENT_W / srcW, CONTENT_H / srcH)
  const fitW = Math.round(srcW * scale)
  const fitH = Math.round(srcH * scale)

  const grey = await sharp(imageBuffer)
    .resize(fitW, fitH, { fit: 'inside' })
    .greyscale()
    .normalize()
    .median(3)
    .toBuffer()

  await onProgress?.(20)

  // 2. Edge detection (Difference of Gaussians)
  const greyMeta = await sharp(grey).metadata()
  const w = greyMeta.width!
  const h = greyMeta.height!

  const [original, blurred] = await Promise.all([
    sharp(grey).raw().toBuffer(),
    sharp(grey).blur(2.5).raw().toBuffer(),
  ])

  const edges = Buffer.alloc(w * h)
  for (let i = 0; i < w * h; i++) {
    const diff = Math.abs(original[i] - blurred[i])
    edges[i] = diff > 15 ? 255 : 0
  }

  await onProgress?.(35)

  // 3. Extract edge points
  const edgePoints: Point[] = []
  // Sample every few pixels to avoid density issues
  const step = Math.max(1, Math.floor(Math.sqrt((w * h) / 50000)))
  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      if (edges[y * w + x] === 255) {
        edgePoints.push({ x, y })
      }
    }
  }

  await onProgress?.(45)

  // 4. Order points into a path using nearest-neighbor greedy traversal
  const targetDots = settings.dotCount
  const orderedPoints = orderPointsByPath(edgePoints, targetDots * 3)

  await onProgress?.(55)

  // 5. Simplify with RDP and sample to target count
  const simplified = rdpSimplify(orderedPoints, Math.max(2, fitW / (targetDots * 0.8)))
  const dots = sampleEvenly(simplified, targetDots)

  await onProgress?.(65)

  // 6. Render PNG
  const pngBuffer = await renderDotToDotPng(dots, w, h, settings)
  await onProgress?.(80)

  // 7. Render PDF
  const pdfBuffer = await renderDotToDotPdf(dots, w, h, settings)
  await onProgress?.(95)

  return { png: pngBuffer, pdf: pdfBuffer }
}

/**
 * Order a cloud of edge points into a path via nearest-neighbor.
 */
function orderPointsByPath(points: Point[], maxPoints: number): Point[] {
  if (points.length <= 2) return points

  // Subsample if too many
  let working = points
  if (working.length > maxPoints) {
    const step = Math.ceil(working.length / maxPoints)
    working = working.filter((_, i) => i % step === 0)
  }

  const visited = new Set<number>()
  const path: Point[] = []

  // Start from the topmost-leftmost point
  let currentIdx = 0
  let minVal = Infinity
  for (let i = 0; i < working.length; i++) {
    const val = working[i].y * 10000 + working[i].x
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

/**
 * Ramer-Douglas-Peucker line simplification.
 */
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

/**
 * Sample N evenly-spaced points along a path.
 */
function sampleEvenly(points: Point[], n: number): Point[] {
  if (points.length <= n) return points
  if (n <= 1) return [points[0]]

  // Calculate total path length
  let totalLength = 0
  for (let i = 1; i < points.length; i++) {
    const dx = points[i].x - points[i - 1].x
    const dy = points[i].y - points[i - 1].y
    totalLength += Math.sqrt(dx * dx + dy * dy)
  }

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
  if (result.length < n) {
    result.push(points[points.length - 1])
  }

  return result.slice(0, n)
}

/**
 * Render dots and numbers to a PNG on an A4-sized white canvas.
 */
async function renderDotToDotPng(
  dots: Point[],
  imageW: number,
  imageH: number,
  settings: DotJobSettings
): Promise<Buffer> {
  // Offset to center the image in the A4 canvas
  const offsetX = MARGIN + Math.round((CONTENT_W - imageW) / 2)
  const offsetY = MARGIN + Math.round((CONTENT_H - imageH) / 2)

  // We'll build an SVG and convert it via Sharp
  const dotRadius = 8
  const fontSize = 14

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  svg += `<rect width="100%" height="100%" fill="white"/>`

  // Optional faint guide lines
  if (settings.showGuideLines) {
    svg += `<g stroke="#e0e0e0" stroke-width="1" fill="none">`
    for (let i = 0; i < dots.length - 1; i++) {
      const a = dots[i]
      const b = dots[i + 1]
      svg += `<line x1="${a.x + offsetX}" y1="${a.y + offsetY}" x2="${b.x + offsetX}" y2="${b.y + offsetY}"/>`
    }
    svg += `</g>`
  }

  // Dots
  svg += `<g fill="black">`
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i]
    const cx = d.x + offsetX
    const cy = d.y + offsetY
    svg += `<circle cx="${cx}" cy="${cy}" r="${dotRadius}"/>`
  }
  svg += `</g>`

  // Numbers
  svg += `<g font-family="Arial, Helvetica, sans-serif" font-size="${fontSize}" font-weight="bold" fill="black">`
  for (let i = 0; i < dots.length; i++) {
    const d = dots[i]
    const cx = d.x + offsetX
    const cy = d.y + offsetY
    // Position number slightly offset from dot
    const numX = cx + dotRadius + 4
    const numY = cy - dotRadius - 2
    svg += `<text x="${numX}" y="${numY}">${i + 1}</text>`
  }
  svg += `</g>`

  // Footer branding
  svg += `<text x="${A4_W / 2}" y="${A4_H - 40}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="20" fill="#cccccc">colour.page</text>`

  svg += `</svg>`

  return sharp(Buffer.from(svg))
    .png()
    .toBuffer()
}

/**
 * Render dots and numbers to a PDF.
 */
async function renderDotToDotPdf(
  dots: Point[],
  imageW: number,
  imageH: number,
  settings: DotJobSettings
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([A4_W_PT, A4_H_PT])
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

  // Scale from pixel coords to PDF points
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
        color: rgb(0.88, 0.88, 0.88),
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
    page.drawText(numText, {
      x: cx + dotRadius + 2,
      y: cy + dotRadius + 1,
      size: fontSize,
      font,
      color: rgb(0, 0, 0),
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
