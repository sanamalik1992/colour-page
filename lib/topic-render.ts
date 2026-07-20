/**
 * Deterministic renderers for the topic categories where a diffusion model is
 * unreliable:
 *   - Numbers/counting: drawn entirely by us (numeral + that many shapes) for a
 *     100% accurate counting sheet — no model call needed.
 *   - Letters: the model draws only the objects; we stamp a clean, correct,
 *     traceable capital letter in a header band above them.
 *
 * Both return an A4 line-art PNG that flows through the same PDF + dot-to-dot
 * steps as every other sheet.
 */
import sharp from 'sharp'
import { glyphSvg, glyphWidth, numberSvg, numberWidth } from '@/lib/glyph-font'
import type { PhotoJobSettings } from '@/types/photo-job'

const A4_W = 2480
const A4_H = 3508
const MARGIN = 150

function detail(settings: PhotoJobSettings): 'low' | 'medium' | 'high' {
  return settings.detailLevel || 'medium'
}

/**
 * A counting worksheet for 1..maxN: each row is the numeral plus that many
 * outline circles to count and colour. Fully deterministic.
 */
export async function renderNumberSheet(maxN: number, settings: PhotoJobSettings): Promise<Buffer> {
  const n = Math.max(1, Math.min(20, Math.round(maxN)))
  const x0 = MARGIN
  const y0 = MARGIN
  const contentW = A4_W - MARGIN * 2
  const contentH = A4_H - MARGIN * 2

  const columns = n <= 10 ? 1 : 2
  const rows = Math.ceil(n / columns)
  const cellW = contentW / columns
  const cellH = contentH / rows

  const stroke = detail(settings) === 'low' ? 14 : detail(settings) === 'high' ? 8 : 11
  const numeralH = Math.min(cellH * 0.62, 240)
  // Reserve width for the widest numeral on the page (2 digits above 9).
  const numeralW = numberWidth(String(n), numeralH)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  svg += `<rect width="${A4_W}" height="${A4_H}" fill="#ffffff"/>`

  for (let i = 1; i <= n; i++) {
    const col = i <= rows ? 0 : 1
    const rowIdx = (i - 1) % rows
    const cellX = x0 + col * cellW
    const cellY = y0 + rowIdx * cellH

    // Numeral, vertically centred in the cell (right-aligned in the reserved
    // numeral column so 1- and 2-digit numbers line up).
    const numTop = cellY + (cellH - numeralH) / 2
    const thisNumW = numberWidth(String(i), numeralH)
    svg += numberSvg(String(i), cellX + 8 + (numeralW - thisNumW), numTop, numeralH, stroke)

    // Circles for the count, wrapped into a tidy grid that always fits inside
    // the cell (circles shrink for larger counts so rows never collide).
    const shapesX = cellX + numeralW + 70
    const shapesW = cellW - numeralW - 110
    const shapesH = cellH * 0.8
    const perRow = Math.min(i, 5)
    const shapeRows = Math.ceil(i / perRow)
    const gapFrac = 0.6 // gap as a fraction of radius
    // Largest radius that fits both the width (perRow) and height (shapeRows).
    const rW = shapesW / (perRow * (2 + gapFrac))
    const rH = shapesH / (shapeRows * (2 + gapFrac))
    const r = Math.max(12, Math.min(46, rW, rH))
    const gap = r * gapFrac
    const cellStep = r * 2 + gap
    const gridW = perRow * cellStep - gap
    const gridH = shapeRows * cellStep - gap
    const gridLeft = shapesX + Math.max(0, (shapesW - gridW) / 2)
    const gridTop = cellY + (cellH - gridH) / 2 + r

    for (let k = 0; k < i; k++) {
      const rk = Math.floor(k / perRow)
      const ck = k % perRow
      const cx = gridLeft + r + ck * cellStep
      const cy = gridTop + rk * cellStep
      svg += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#111111" stroke-width="${Math.max(5, stroke - 3)}"/>`
    }
  }

  svg += `</svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

/**
 * A letter sheet: a big correct capital letter to trace in a header band, with
 * the model-generated objects (things starting with that letter) placed below.
 */
export async function buildLetterSheet(
  objectsPng: Buffer,
  letter: string,
  settings: PhotoJobSettings
): Promise<Buffer> {
  const headerH = Math.round(A4_H * 0.3)
  const stroke = detail(settings) === 'low' ? 34 : detail(settings) === 'high' ? 20 : 27

  // Header: one large capital centred in the top band.
  const glyphH = Math.round(headerH * 0.7)
  const glyphW = glyphWidth(glyphH)
  const gLeft = (A4_W - glyphW) / 2
  const gTop = (headerH - glyphH) / 2
  const headerSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${headerH}" viewBox="0 0 ${A4_W} ${headerH}">` +
    glyphSvg(letter, gLeft, gTop, glyphH, stroke) +
    `</svg>`
  const headerPng = await sharp(Buffer.from(headerSvg)).png().toBuffer()

  // Body: the objects, greyscale + high-contrast to keep them clean line art,
  // fitted into the area below the header.
  const bodyH = A4_H - headerH - MARGIN
  const bodyW = A4_W - MARGIN * 2
  const bodyPng = await sharp(objectsPng)
    .greyscale()
    .resize(bodyW, bodyH, { fit: 'inside', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .toBuffer()
  const bodyMeta = await sharp(bodyPng).metadata()
  const bodyLeft = Math.round((A4_W - (bodyMeta.width || bodyW)) / 2)
  const bodyTop = headerH

  return sharp({ create: { width: A4_W, height: A4_H, channels: 3, background: '#ffffff' } })
    .composite([
      { input: headerPng, left: 0, top: 0 },
      { input: bodyPng, left: bodyLeft, top: bodyTop },
    ])
    .png()
    .toBuffer()
}
