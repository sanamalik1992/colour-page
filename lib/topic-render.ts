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
import { numberSvg, numberWidth } from '@/lib/glyph-font'
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
 * A maths-sequence sheet (multiples, counting in Ns, times tables): the exact
 * numbers laid out large to read, trace and colour. The first number in each
 * row is solid (the example); the rest are dotted to write over. Fully
 * deterministic, so the numbers are always correct.
 */
export async function renderSequenceSheet(numbers: number[], settings: PhotoJobSettings): Promise<Buffer> {
  const nums = numbers.slice(0, 12)
  const d = detail(settings)
  const x0 = MARGIN
  const y0 = MARGIN
  const contentW = A4_W - MARGIN * 2
  const contentH = A4_H - MARGIN * 2

  const cols = nums.length <= 5 ? 1 : 2
  const rows = Math.ceil(nums.length / cols)
  const cellW = contentW / cols
  const cellH = contentH / rows

  const stroke = d === 'low' ? 22 : d === 'high' ? 12 : 17
  // Widest number sets the glyph height so nothing overflows its cell.
  const widest = nums.reduce((w, n) => Math.max(w, String(n).length), 1)
  let glyphH = Math.min(cellH * 0.6, 300)
  while (numberWidth('0'.repeat(widest), glyphH) > cellW * 0.72 && glyphH > 40) glyphH -= 8

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  svg += `<rect width="${A4_W}" height="${A4_H}" fill="#ffffff"/>`

  for (let i = 0; i < nums.length; i++) {
    const col = cols === 1 ? 0 : i % cols
    const row = cols === 1 ? i : Math.floor(i / cols)
    const s = String(nums[i])
    const gW = numberWidth(s, glyphH)
    const cx = x0 + col * cellW + (cellW - gW) / 2
    const cy = y0 + row * cellH + (cellH - glyphH) / 2
    // First column solid (read it), others dotted (trace it).
    const dashed = col !== 0
    svg += numberSvg(s, cx, cy, glyphH, stroke, dashed ? { dashed: true, color: '#9aa0a6' } : undefined)
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
  const d = detail(settings)
  const chars = letter.toUpperCase().slice(0, 3)

  // Three sections: (1) the grapheme big to see, (2) a handwriting row to trace
  // over dotted copies, (3) related pictures to colour. Sizes scale with age.
  const headerH = Math.round(A4_H * 0.16)
  const traceH = Math.round(A4_H * 0.2)
  const bodyTop = headerH + traceH

  // (1) Header: solid grapheme, centred.
  const hStroke = d === 'low' ? 30 : d === 'high' ? 18 : 24
  const hGlyphH = Math.round(headerH * 0.72)
  const hGlyphW = numberWidth(chars, hGlyphH)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${bodyTop}" viewBox="0 0 ${A4_W} ${bodyTop}">`
  svg += `<rect width="${A4_W}" height="${bodyTop}" fill="#ffffff"/>`
  svg += numberSvg(chars, (A4_W - hGlyphW) / 2, (headerH - hGlyphH) / 2, hGlyphH, hStroke)

  // (2) Handwriting trace row: first copy solid (the example), the rest dotted
  // to trace over, sitting on a light baseline. Fewer/bigger for younger. The
  // glyph size is derived so the whole row fits the content width (a 2-letter
  // digraph like "SH" is wider, so it shrinks to fit).
  const reps = d === 'low' ? 3 : d === 'high' ? 5 : 4
  const tStroke = d === 'low' ? 20 : d === 'high' ? 12 : 16
  const contentW = A4_W - MARGIN * 2
  const gapFrac = 0.4
  // width available per glyph if gap = gapFrac * glyphWidth
  let tGlyphW = contentW / (reps + gapFrac * (reps - 1))
  let tGlyphH = tGlyphW / (0.6 * chars.length + 0.18 * (chars.length - 1))
  const maxH = traceH * 0.66
  if (tGlyphH > maxH) {
    tGlyphH = maxH
    tGlyphW = numberWidth(chars, tGlyphH)
  }
  const gap = tGlyphW * gapFrac
  const rowW = reps * tGlyphW + (reps - 1) * gap
  const startX = (A4_W - rowW) / 2
  const tTop = headerH + (traceH - tGlyphH) / 2
  const baseY = tTop + tGlyphH + Math.round(tGlyphH * 0.06)
  // Baseline + midline guides
  svg += `<line x1="${startX - 30}" y1="${baseY}" x2="${startX + rowW + 30}" y2="${baseY}" stroke="#d8d8d8" stroke-width="3"/>`
  for (let i = 0; i < reps; i++) {
    const gx = startX + i * (tGlyphW + gap)
    svg += numberSvg(chars, gx, tTop, tGlyphH, tStroke, i === 0 ? undefined : { dashed: true, color: '#9aa0a6' })
  }
  svg += `</svg>`
  const topPng = await sharp(Buffer.from(svg)).png().toBuffer()

  // (3) Related pictures to colour.
  const bodyH = A4_H - bodyTop - MARGIN
  const bodyW = A4_W - MARGIN * 2
  const bodyPng = await sharp(objectsPng)
    .greyscale()
    .resize(bodyW, bodyH, { fit: 'inside', background: '#ffffff' })
    .flatten({ background: '#ffffff' })
    .toBuffer()
  const bodyMeta = await sharp(bodyPng).metadata()
  const bodyLeft = Math.round((A4_W - (bodyMeta.width || bodyW)) / 2)

  return sharp({ create: { width: A4_W, height: A4_H, channels: 3, background: '#ffffff' } })
    .composite([
      { input: topPng, left: 0, top: 0 },
      { input: bodyPng, left: bodyLeft, top: bodyTop },
    ])
    .png()
    .toBuffer()
}

// ---------------------------------------------------------------------------
// Sticker-grid letter/phonics sheet
// ---------------------------------------------------------------------------

// The grapheme header + handwriting trace band, returned as a PNG plus the y
// where the picture area begins. Shared by the sticker sheet.
function renderLetterTop(chars: string, d: 'low' | 'medium' | 'high'): { svg: string; bodyTop: number } {
  const headerH = Math.round(A4_H * 0.16)
  const traceH = Math.round(A4_H * 0.2)
  const bodyTop = headerH + traceH

  const hStroke = d === 'low' ? 30 : d === 'high' ? 18 : 24
  const hGlyphH = Math.round(headerH * 0.72)
  const hGlyphW = numberWidth(chars, hGlyphH)
  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${bodyTop}" viewBox="0 0 ${A4_W} ${bodyTop}">`
  svg += `<rect width="${A4_W}" height="${bodyTop}" fill="#ffffff"/>`
  svg += numberSvg(chars, (A4_W - hGlyphW) / 2, (headerH - hGlyphH) / 2, hGlyphH, hStroke)

  const reps = d === 'low' ? 3 : d === 'high' ? 5 : 4
  const tStroke = d === 'low' ? 20 : d === 'high' ? 12 : 16
  const contentW = A4_W - MARGIN * 2
  const gapFrac = 0.4
  let tGlyphW = contentW / (reps + gapFrac * (reps - 1))
  let tGlyphH = tGlyphW / (0.6 * chars.length + 0.18 * (chars.length - 1))
  const maxH = traceH * 0.66
  if (tGlyphH > maxH) {
    tGlyphH = maxH
    tGlyphW = numberWidth(chars, tGlyphH)
  }
  const gap = tGlyphW * gapFrac
  const rowW = reps * tGlyphW + (reps - 1) * gap
  const startX = (A4_W - rowW) / 2
  const tTop = headerH + (traceH - tGlyphH) / 2
  const baseY = tTop + tGlyphH + Math.round(tGlyphH * 0.06)
  svg += `<line x1="${startX - 30}" y1="${baseY}" x2="${startX + rowW + 30}" y2="${baseY}" stroke="#d8d8d8" stroke-width="3"/>`
  for (let i = 0; i < reps; i++) {
    const gx = startX + i * (tGlyphW + gap)
    svg += numberSvg(chars, gx, tTop, tGlyphH, tStroke, i === 0 ? undefined : { dashed: true, color: '#9aa0a6' })
  }
  svg += `</svg>`
  return { svg, bodyTop }
}

// Little colour-in doodles to fill the gaps and add joy (drawn by us, not the
// model, so they're always clean). Unit shapes on a ~40×40 box.
const DOODLES: string[] = [
  // star
  'M20 3 L24.7 15.3 L38 15.6 L27.5 23.9 L31.2 36.8 L20 29 L8.8 36.8 L12.5 23.9 L2 15.6 L15.3 15.3 Z',
  // heart
  'M20 35 C3 23 4 8 13 8 C17.5 8 20 12 20 14.5 C20 12 22.5 8 27 8 C36 8 37 23 20 35 Z',
  // four-point sparkle
  'M20 2 C21.5 14 26 18.5 38 20 C26 21.5 21.5 26 20 38 C18.5 26 14 21.5 2 20 C14 18.5 18.5 14 20 2 Z',
  // little flower
  'M20 12 a6 6 0 1 1 0 0.1 M20 8 a4 4 0 1 0 0.1 0 M28 20 a4 4 0 1 0 0.1 0 M12 20 a4 4 0 1 0 0.1 0 M23 27 a4 4 0 1 0 0.1 0 M17 27 a4 4 0 1 0 0.1 0',
]
function doodleSvg(kind: number, cx: number, cy: number, size: number): string {
  const s = size / 40
  const d = DOODLES[kind % DOODLES.length]
  return `<path d="${d}" transform="translate(${(cx - size / 2).toFixed(1)},${(cy - size / 2).toFixed(1)}) scale(${s.toFixed(3)})" fill="none" stroke="#111" stroke-width="${(4 / s).toFixed(2)}" stroke-linecap="round" stroke-linejoin="round"/>`
}

/**
 * A joyful, page-filling letter/phonics sheet: the grapheme + handwriting trace
 * on top, then a grid of "sticker" cells — one clear, separately-generated
 * picture per cell — with cut-out style frames and little colour-in doodles in
 * the corners. Fills the page; no merged/pun images.
 */
export async function buildLetterStickerSheet(
  objectPngs: Buffer[],
  letter: string,
  settings: PhotoJobSettings
): Promise<Buffer> {
  const d = detail(settings)
  const chars = letter.toUpperCase().slice(0, 3)
  const { svg: topSvg, bodyTop } = renderLetterTop(chars, d)
  const topPng = await sharp(Buffer.from(topSvg)).png().toBuffer()

  const pics = objectPngs.slice(0, 6)
  const count = Math.max(1, pics.length)
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3
  const rows = Math.ceil(count / cols)

  const bodyX = MARGIN
  const bodyY = bodyTop
  const bodyW = A4_W - MARGIN * 2
  const bodyH = A4_H - bodyTop - MARGIN
  const cellW = bodyW / cols
  const cellH = bodyH / rows

  // Overlay SVG: sticker frames + corner doodles, drawn under the pictures.
  let overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  const doodleSize = d === 'low' ? 90 : d === 'high' ? 56 : 72
  const composites: sharp.OverlayOptions[] = [{ input: topPng, left: 0, top: 0 }]

  for (let i = 0; i < count; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const cx = bodyX + col * cellW
    const cy = bodyY + row * cellH
    const fPad = Math.min(cellW, cellH) * 0.06
    const fx = cx + fPad
    const fy = cy + fPad
    const fw = cellW - fPad * 2
    const fh = cellH - fPad * 2
    // dashed cut-out sticker frame
    overlay += `<rect x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="${fw.toFixed(1)}" height="${fh.toFixed(1)}" rx="46" fill="none" stroke="#e2ded6" stroke-width="4" stroke-dasharray="14 12"/>`
    // two corner doodles per cell (varied)
    overlay += doodleSvg(i, fx + doodleSize * 0.7, fy + doodleSize * 0.7, doodleSize)
    overlay += doodleSvg(i + 2, fx + fw - doodleSize * 0.7, fy + fh - doodleSize * 0.7, doodleSize * 0.85)

    // picture, scaled to fill the cell interior, centred
    const innerW = Math.round(fw * 0.82)
    const innerH = Math.round(fh * 0.78)
    const pic = await sharp(pics[i])
      .greyscale()
      .resize(innerW, innerH, { fit: 'inside', background: '#ffffff' })
      .flatten({ background: '#ffffff' })
      .toBuffer()
    const pm = await sharp(pic).metadata()
    const left = Math.round(cx + (cellW - (pm.width || innerW)) / 2)
    const top = Math.round(cy + (cellH - (pm.height || innerH)) / 2)
    composites.push({ input: pic, left, top })
  }
  overlay += `</svg>`

  return sharp({ create: { width: A4_W, height: A4_H, channels: 3, background: '#ffffff' } })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }, ...composites])
    .png()
    .toBuffer()
}
