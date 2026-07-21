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
import type { Activity } from '@/lib/topic-prompt'
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
// where the picture area begins. Shared by the sticker sheet. An optional title
// (e.g. "WORDS WITH TH") prints across the top so the sheet reads as designed.
function renderLetterTop(chars: string, d: 'low' | 'medium' | 'high', title?: string): { svg: string; bodyTop: number } {
  const headerH = Math.round(A4_H * 0.16)
  const traceH = Math.round(A4_H * 0.2)
  const bodyTop = headerH + traceH
  const contentW = A4_W - MARGIN * 2

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${bodyTop}" viewBox="0 0 ${A4_W} ${bodyTop}">`
  svg += `<rect width="${A4_W}" height="${bodyTop}" fill="#ffffff"/>`

  // Title band with a gold underline.
  let gTopOffset = 0
  if (title) {
    const titleTop = Math.round(A4_H * 0.012)
    let th = 56
    let tw = textWidth(title, th)
    const maxTW = contentW * 0.92
    if (tw > maxTW) { th = Math.max(30, Math.floor(th * maxTW / tw)); tw = textWidth(title, th) }
    svg += textSvg(title, (A4_W - tw) / 2, titleTop, th, 13, { color: '#111' })
    const uy = titleTop + th + 18
    svg += `<line x1="${((A4_W - tw) / 2).toFixed(1)}" y1="${uy}" x2="${((A4_W + tw) / 2).toFixed(1)}" y2="${uy}" stroke="#F2A81E" stroke-width="7" stroke-linecap="round"/>`
    gTopOffset = titleTop + th + 46
  }

  const hStroke = d === 'low' ? 30 : d === 'high' ? 18 : 24
  const hGlyphH = Math.round((headerH - gTopOffset) * 0.74)
  const hGlyphW = numberWidth(chars, hGlyphH)
  svg += numberSvg(chars, (A4_W - hGlyphW) / 2, gTopOffset + (headerH - gTopOffset - hGlyphH) / 2, hGlyphH, hStroke)

  const reps = d === 'low' ? 3 : d === 'high' ? 5 : 4
  const tStroke = d === 'low' ? 20 : d === 'high' ? 12 : 16
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
  settings: PhotoJobSettings,
  isPro = false
): Promise<Buffer> {
  const d = detail(settings)
  const chars = letter.toUpperCase().slice(0, 3)
  const { svg: topSvg, bodyTop } = renderLetterTop(chars, d, settings.title)
  const topPng = await sharp(Buffer.from(topSvg)).png().toBuffer()

  const pics = objectPngs.slice(0, 6)
  const count = Math.max(1, pics.length)
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3
  const rows = Math.ceil(count / cols)

  const bodyX = MARGIN
  const bodyY = bodyTop
  const bodyW = A4_W - MARGIN * 2
  const fullBodyH = A4_H - bodyTop - MARGIN
  // Every sheet gets a colour grid + a "find the sound" activity (so free is
  // never bare); Pro adds a third "trace it" activity, so the grid shrinks more.
  const bodyH = Math.round(fullBodyH * (isPro ? 0.46 : 0.56))
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

  // Activity 2 (free + Pro): colour every letter that makes the sound.
  const gap = 40
  {
    const { svg: hSvg, nextY } = headingSvg(`COLOUR EVERY ${chars}`, bodyX, bodyTop + bodyH + gap)
    overlay += hSvg
    const b1H = isPro ? Math.round(fullBodyH * 0.22) : A4_H - MARGIN - nextY
    overlay += circleLetterBlock(chars, bodyX, nextY, bodyW, b1H)
    // Activity 3 (Pro only): trace the sound.
    if (isPro) {
      const { svg: hSvg2, nextY: y2 } = headingSvg(`TRACE ${chars}`, bodyX, nextY + b1H + gap)
      overlay += hSvg2
      overlay += traceGraphemeRow(chars, bodyX, y2, bodyW, A4_H - MARGIN - y2)
    }
  }

  overlay += `</svg>`

  return sharp({ create: { width: A4_W, height: A4_H, channels: 3, background: '#ffffff' } })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }, ...composites])
    .png()
    .toBuffer()
}

// ---------------------------------------------------------------------------
// Deterministic text helpers (our glyph font renders A–Z + 0–9 in caps)
// ---------------------------------------------------------------------------

// Render UPPERCASE text, handling spaces between words. Returns the SVG string.
function textSvg(text: string, x: number, y: number, h: number, stroke: number, opts?: { dashed?: boolean; color?: string }): string {
  const space = h * 0.5
  let cx = x
  let out = ''
  for (const w of text.toUpperCase().split(' ')) {
    if (w) out += numberSvg(w, cx, y, h, stroke, opts)
    cx += numberWidth(w, h) + space
  }
  return out
}
function textWidth(text: string, h: number): number {
  const space = h * 0.5
  const words = text.toUpperCase().split(' ')
  return words.reduce((s, w, i) => s + numberWidth(w, h) + (i ? space : 0), 0)
}

// A word with its target grapheme replaced by a write-in line (fill-the-gap).
function gappedWordSvg(word: string, grapheme: string, centerX: number, top: number, h: number, stroke: number): string {
  const wu = word.toUpperCase().replace(/[^A-Z]/g, '')
  const gu = grapheme.toUpperCase()
  let idx = wu.indexOf(gu)
  let glen = gu.length
  if (idx < 0) { idx = 0; glen = Math.min(gu.length, wu.length) }
  const before = wu.slice(0, idx)
  const after = wu.slice(idx + glen)
  const pad = h * 0.18
  const gapW = numberWidth('NN'.slice(0, glen) || 'N', h)
  const beforeW = before ? numberWidth(before, h) : 0
  const afterW = after ? numberWidth(after, h) : 0
  const totalW = beforeW + (before ? pad : 0) + gapW + (after ? pad : 0) + afterW
  let x = centerX - totalW / 2
  let s = ''
  if (before) { s += numberSvg(before, x, top, h, stroke); x += beforeW + pad }
  const lineY = top + h * 1.02
  s += `<line x1="${x.toFixed(1)}" y1="${lineY.toFixed(1)}" x2="${(x + gapW).toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="#111" stroke-width="${stroke}" stroke-linecap="round"/>`
  x += gapW + (after ? pad : 0)
  if (after) s += numberSvg(after, x, top, h, stroke)
  return s
}

// Place words in an N×N grid (right / down / diagonal), fill the rest randomly.
function makeWordSearch(words: string[], size: number): string[][] {
  const G: string[][] = Array.from({ length: size }, () => Array(size).fill(''))
  const dirs = [[0, 1], [1, 0], [1, 1]]
  for (const raw of words) {
    const w = raw.toUpperCase().replace(/[^A-Z]/g, '')
    if (!w || w.length > size) continue
    for (let tries = 0; tries < 300; tries++) {
      const [dr, dc] = dirs[Math.floor(Math.random() * dirs.length)]
      const r0 = Math.floor(Math.random() * (dr ? size - w.length + 1 : size))
      const c0 = Math.floor(Math.random() * (dc ? size - w.length + 1 : size))
      let fits = true
      for (let k = 0; k < w.length; k++) {
        const cur = G[r0 + dr * k][c0 + dc * k]
        if (cur && cur !== w[k]) { fits = false; break }
      }
      if (!fits) continue
      for (let k = 0; k < w.length; k++) G[r0 + dr * k][c0 + dc * k] = w[k]
      break
    }
  }
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!G[r][c]) G[r][c] = A[Math.floor(Math.random() * 26)]
  return G
}

// A small activity heading with a short underline, returned as SVG. Returns the
// y just below the heading so callers can stack content under it. The font
// shrinks to fit the available width so long instructions never clip off-page.
function headingSvg(text: string, x: number, y: number): { svg: string; nextY: number } {
  const maxW = A4_W - MARGIN - x
  let h = 54
  let w = textWidth(text, h)
  if (w > maxW) { h = Math.max(30, Math.floor(h * (maxW / w))); w = textWidth(text, h) }
  const uy = y + h + 16
  let s = textSvg(text, x, y, h, 12, { color: '#111' })
  s += `<line x1="${x}" y1="${uy.toFixed(1)}" x2="${(x + w).toFixed(1)}" y2="${uy.toFixed(1)}" stroke="#F2A81E" stroke-width="7" stroke-linecap="round"/>`
  return { svg: s, nextY: uy + 30 }
}

// Index-based pseudo-random so blocks vary but render identically each time
// (no reliance on Math.random for layout — keeps output stable to eyeball/test).
function pick<T>(arr: T[], seed: number): T {
  return arr[Math.abs((seed * 2654435761) >>> 0) % arr.length]
}

// "Colour/circle every X": a grid of big mixed letters, about half the target
// grapheme and half distractors, for a find-and-colour activity.
function circleLetterBlock(target: string, x: number, top: number, w: number, h: number): string {
  const t = target.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3) || 'A'
  const distractors = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').filter((c) => !t.includes(c))
  const cols = 5
  const rows = 2
  const cellW = w / cols
  const cellH = h / rows
  const gh = Math.max(60, Math.min(cellH * 0.62, cellW * 0.55, 150))
  let s = ''
  for (let i = 0; i < cols * rows; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    // Roughly alternate target/distractor, seeded so it's varied but stable.
    const isTarget = (i * 3 + 1) % 2 === 0
    const ch = isTarget ? t : pick(distractors, i + 11)
    const gw = numberWidth(ch, gh)
    s += numberSvg(ch, x + c * cellW + (cellW - gw) / 2, top + r * cellH + (cellH - gh) / 2, gh, 15)
  }
  return s
}

// "Trace the words": each word rendered dotted on a baseline to write over.
function traceWordsBlock(words: string[], grapheme: string, x: number, top: number, w: number, h: number): string {
  const list = words.map((word) => word.toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean).slice(0, 4)
  if (!list.length) return ''
  const rowH = h / list.length
  const gh = Math.max(50, Math.min(rowH * 0.56, 120))
  let s = ''
  list.forEach((word, i) => {
    const y = top + i * rowH + (rowH - gh) / 2
    const baseY = y + gh + gh * 0.06
    s += `<line x1="${x}" y1="${baseY.toFixed(1)}" x2="${(x + w).toFixed(1)}" y2="${baseY.toFixed(1)}" stroke="#e0dbd0" stroke-width="3"/>`
    // First glyph(s) of the target sound solid as a hint, rest dotted to trace.
    s += numberSvg(word, x + 24, y, gh, 15, { dashed: true, color: '#9aa0a6' })
  })
  return s
}

// A row of large dotted graphemes to trace over (handwriting practice).
function traceGraphemeRow(chars: string, x: number, top: number, w: number, h: number): string {
  const gh = Math.max(70, Math.min(h * 0.66, 200))
  const gw = numberWidth(chars, gh)
  const gap = gh * 0.55
  const reps = Math.max(3, Math.min(5, Math.floor((w + gap) / (gw + gap))))
  const rowW = reps * gw + (reps - 1) * gap
  const startX = x + (w - rowW) / 2
  const top2 = top + (h - gh) / 2
  const baseY = top2 + gh + gh * 0.06
  let s = `<line x1="${(startX - 20).toFixed(1)}" y1="${baseY.toFixed(1)}" x2="${(startX + rowW + 20).toFixed(1)}" y2="${baseY.toFixed(1)}" stroke="#e0dbd0" stroke-width="3"/>`
  for (let i = 0; i < reps; i++) {
    s += numberSvg(chars, startX + i * (gw + gap), top2, gh, 16, i === 0 ? undefined : { dashed: true, color: '#9aa0a6' })
  }
  return s
}

// A compact word-search grid (used as a Pro bonus on the 6–8 sheet).
function miniWordSearchBlock(words: string[], x: number, top: number, w: number, h: number): string {
  const list = words.map((word) => word.toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean).slice(0, 4)
  if (!list.length) return ''
  const size = Math.max(7, Math.min(9, ...list.map((word) => word.length + 3), 9))
  const grid = makeWordSearch(list, size)
  const gridMax = Math.min(w, h)
  const cell = Math.floor(gridMax / size)
  const gs = cell * size
  const gx = x + (w - gs) / 2
  const gy = top + (h - gs) / 2
  let s = `<rect x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" width="${gs}" height="${gs}" fill="none" stroke="#d8d3c9" stroke-width="3" rx="18"/>`
  const lh = Math.round(cell * 0.6)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const ch = grid[r][c]
      s += numberSvg(ch, gx + c * cell + (cell - numberWidth(ch, lh)) / 2, gy + r * cell + (cell - lh) / 2, lh, 8)
    }
  }
  return s
}

// "Put the words in ABC order": a word bank, then numbered write-in lines.
function abcOrderBlock(words: string[], x: number, top: number, w: number, h: number): string {
  const list = words.map((word) => word.toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean).slice(0, 4)
  if (!list.length) return ''
  let s = ''
  // Word bank across the top.
  const bankH = 54
  const bank = list.join('   ')
  const bw = textWidth(bank, bankH)
  s += textSvg(bank, x + Math.max(0, (w - bw) / 2), top, bankH, 11, { color: '#9aa0a6' })
  // Numbered lines to write them in order.
  const linesTop = top + bankH + 60
  const n = list.length
  const rowH = Math.min(120, (h - bankH - 60) / n)
  const numH = Math.round(rowH * 0.5)
  for (let i = 0; i < n; i++) {
    const y = linesTop + i * rowH
    s += numberSvg(String(i + 1), x, y, numH, 12)
    const lx = x + numberWidth(String(i + 1), numH) + 40
    s += `<line x1="${lx.toFixed(1)}" y1="${(y + numH).toFixed(1)}" x2="${(x + w).toFixed(1)}" y2="${(y + numH).toFixed(1)}" stroke="#d0cabf" stroke-width="3"/>`
  }
  return s
}

/**
 * 6–8 band: "write the missing sound". Sticker grid where each picture has the
 * word underneath with the target grapheme replaced by a write-in line.
 */
export async function buildLetterWriteSheet(objectPngs: Buffer[], letter: string, words: string[], settings: PhotoJobSettings, isPro = false): Promise<Buffer> {
  const d = detail(settings)
  const chars = letter.toUpperCase().slice(0, 3)
  const { svg: topSvg, bodyTop } = renderLetterTop(chars, d, settings.title)
  const topPng = await sharp(Buffer.from(topSvg)).png().toBuffer()

  const pics = objectPngs.slice(0, 6)
  const count = Math.max(1, pics.length)
  const cols = count <= 4 ? 2 : 3
  const rows = Math.ceil(count / cols)
  const bodyX = MARGIN, bodyY = bodyTop
  const bodyW = A4_W - MARGIN * 2
  const fullBodyH = A4_H - bodyTop - MARGIN
  // Free adds a "trace the words" activity; Pro adds a mini word search too.
  const bodyH = Math.round(fullBodyH * (isPro ? 0.5 : 0.62))
  const cellW = bodyW / cols
  const cellH = bodyH / rows

  let overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  const composites: sharp.OverlayOptions[] = [{ input: topPng, left: 0, top: 0 }]
  const wordH = Math.min(cellH * 0.16, 130)

  for (let i = 0; i < count; i++) {
    const col = i % cols, row = Math.floor(i / cols)
    const cx = bodyX + col * cellW, cy = bodyY + row * cellH
    const fPad = Math.min(cellW, cellH) * 0.06
    const fx = cx + fPad, fy = cy + fPad, fw = cellW - fPad * 2, fh = cellH - fPad * 2
    overlay += `<rect x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="${fw.toFixed(1)}" height="${fh.toFixed(1)}" rx="46" fill="none" stroke="#e2ded6" stroke-width="4" stroke-dasharray="14 12"/>`
    // gapped word near the bottom of the cell
    if (words[i]) overlay += gappedWordSvg(words[i], chars, cx + cellW / 2, cy + cellH - wordH * 1.7, wordH, d === 'high' ? 12 : 15)
    // picture in the upper part
    const innerW = Math.round(fw * 0.72)
    const innerH = Math.round(fh * 0.5)
    const pic = await sharp(pics[i]).greyscale().resize(innerW, innerH, { fit: 'inside', background: '#ffffff' }).flatten({ background: '#ffffff' }).toBuffer()
    const pm = await sharp(pic).metadata()
    const left = Math.round(cx + (cellW - (pm.width || innerW)) / 2)
    const top = Math.round(cy + fh * 0.14)
    composites.push({ input: pic, left, top })
  }

  // Activity 2 (free + Pro): trace the whole words.
  const gap = 40
  {
    const { svg: hSvg, nextY } = headingSvg('TRACE THE WORDS', bodyX, bodyTop + bodyH + gap)
    overlay += hSvg
    const b1H = isPro ? Math.round(fullBodyH * 0.18) : A4_H - MARGIN - nextY
    overlay += traceWordsBlock(words, chars, bodyX, nextY, bodyW, b1H)
    // Activity 3 (Pro only): a mini word search.
    if (isPro) {
      const { svg: hSvg2, nextY: y2 } = headingSvg('WORD SEARCH', bodyX, nextY + b1H + gap)
      overlay += hSvg2
      overlay += miniWordSearchBlock(words, bodyX, y2, bodyW, A4_H - MARGIN - y2)
    }
  }

  overlay += `</svg>`

  return sharp({ create: { width: A4_W, height: A4_H, channels: 3, background: '#ffffff' } })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }, ...composites])
    .png()
    .toBuffer()
}

/**
 * 9–10 band: a word-search puzzle using the target words, a "find these" list,
 * and lined space to write a sentence. Fully deterministic — no model needed.
 */
export async function buildLetterPuzzleSheet(letter: string, words: string[], settings: PhotoJobSettings, isPro = false): Promise<Buffer> {
  const chars = letter.toUpperCase().slice(0, 3)
  const list = words.map((w) => w.toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean).slice(0, 6)
  const size = Math.max(9, Math.min(12, ...list.map((w) => w.length + 4), 12))
  const grid = makeWordSearch(list, size)

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  svg += `<rect width="${A4_W}" height="${A4_H}" fill="#ffffff"/>`

  // Title + header grapheme
  let headTop = MARGIN * 0.4
  if (settings.title) {
    const th = 52
    const tw = textWidth(settings.title, th)
    svg += textSvg(settings.title, (A4_W - tw) / 2, headTop, th, 12, { color: '#111' })
    const uy = headTop + th + 14
    svg += `<line x1="${((A4_W - tw) / 2).toFixed(1)}" y1="${uy}" x2="${((A4_W + tw) / 2).toFixed(1)}" y2="${uy}" stroke="#F2A81E" stroke-width="6" stroke-linecap="round"/>`
    headTop = uy + 26
  }
  const hH = Math.round(A4_H * 0.08)
  const hGlyphH = Math.round(hH * 0.8)
  svg += numberSvg(chars, (A4_W - numberWidth(chars, hGlyphH)) / 2, headTop, hGlyphH, 22)

  // Word-search grid — a little smaller for Pro to leave room for ABC order.
  const gridTop = headTop + hGlyphH + Math.round(A4_H * 0.02)
  const gridMax = Math.min(A4_W - MARGIN * 2, Math.round(A4_H * (isPro ? 0.42 : 0.5)))
  const cell = Math.floor(gridMax / size)
  const gridSize = cell * size
  const gridX = Math.round((A4_W - gridSize) / 2)
  svg += `<rect x="${gridX}" y="${gridTop}" width="${gridSize}" height="${gridSize}" fill="none" stroke="#c9c4ba" stroke-width="3" rx="24"/>`
  const letterH = Math.round(cell * 0.6)
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const ch = grid[r][c]
      const lw = numberWidth(ch, letterH)
      svg += numberSvg(ch, gridX + c * cell + (cell - lw) / 2, gridTop + r * cell + (cell - letterH) / 2, letterH, 8)
    }
  }

  // "FIND" list
  const listY = gridTop + gridSize + Math.round(A4_H * 0.03)
  const labelH = 70
  svg += textSvg('FIND', MARGIN, listY, labelH, 12)
  let wx = MARGIN + textWidth('FIND', labelH) + labelH
  const wordH = 66
  for (const w of list) {
    svg += numberSvg(w, wx, listY + 2, wordH, 10)
    wx += numberWidth(w, wordH) + wordH
    if (wx > A4_W - MARGIN - 300) { wx = MARGIN + textWidth('FIND', labelH) + labelH; }
  }

  // Activity 2 (free + Pro): write a sentence.
  const sentTop = listY + Math.round(A4_H * 0.05)
  svg += textSvg('WRITE A SENTENCE', MARGIN, sentTop, 58, 11)
  const sentLines = isPro ? 2 : 3
  for (let i = 0; i < sentLines; i++) {
    const y = sentTop + 140 + i * 130
    svg += `<line x1="${MARGIN}" y1="${y}" x2="${A4_W - MARGIN}" y2="${y}" stroke="#d0cabf" stroke-width="3"/>`
  }

  // Activity 3 (Pro only): put the words in ABC order.
  if (isPro) {
    const abcTop = sentTop + 140 + sentLines * 130 + Math.round(A4_H * 0.02)
    const { svg: hSvg, nextY } = headingSvg('WRITE IN ABC ORDER', MARGIN, abcTop)
    svg += hSvg
    svg += abcOrderBlock(list, MARGIN, nextY, A4_W - MARGIN * 2, A4_H - MARGIN - nextY)
  }

  svg += `</svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

// Big words listed to read aloud (1–2 columns depending on how many).
function readWordsBlock(list: string[], x: number, top: number, w: number, h: number): string {
  const cols = list.length <= 4 ? 1 : 2
  const rows = Math.ceil(list.length / cols)
  const cellW = w / cols
  const cellH = h / rows
  const longest = list.reduce((m, word) => Math.max(m, word.length), 1)
  const gh = Math.max(48, Math.min(cellH * 0.62, (cellW * 0.86) / (longest * 0.62), 130))
  let s = ''
  list.forEach((word, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    const ww = numberWidth(word, gh)
    const cx = x + c * cellW
    const cy = top + r * cellH
    const gy = cy + (cellH - gh) / 2
    s += numberSvg(word, cx + (cellW - ww) / 2, gy, gh, 13)
    // a soft dot bullet
    s += `<circle cx="${(cx + 22).toFixed(1)}" cy="${(gy + gh / 2).toFixed(1)}" r="9" fill="#F2A81E"/>`
  })
  return s
}

// Numbered write-in lines (used as the Pro "write them" activity).
function writeLinesBlock(n: number, x: number, top: number, w: number, h: number): string {
  const rows = Math.max(1, Math.min(n, 6))
  const rowH = Math.min(130, h / rows)
  const numH = Math.round(rowH * 0.42)
  let s = ''
  for (let i = 0; i < rows; i++) {
    const y = top + i * rowH
    s += numberSvg(String(i + 1), x, y, numH, 12)
    const lx = x + numberWidth(String(i + 1), numH) + 40
    s += `<line x1="${lx.toFixed(1)}" y1="${(y + numH).toFixed(1)}" x2="${(x + w).toFixed(1)}" y2="${(y + numH).toFixed(1)}" stroke="#d0cabf" stroke-width="3"/>`
  }
  return s
}

/**
 * Word-practice sheet for sight / tricky / specific words that can't be drawn
 * (e.g. there, then, that). Fully deterministic: read them, trace them, find
 * them in a word search, and (Pro) write them. No image model needed.
 */
export async function buildWordPracticeSheet(title: string | undefined, words: string[], settings: PhotoJobSettings, isPro = false): Promise<Buffer> {
  const list = words.map((w) => w.toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean).slice(0, 8)
  const bodyX = MARGIN
  const bodyW = A4_W - MARGIN * 2

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  svg += `<rect width="${A4_W}" height="${A4_H}" fill="#ffffff"/>`

  // Title band.
  let y = Math.round(MARGIN * 0.7)
  const t = (title && title.trim()) || 'MY WORDS'
  {
    let th = 78
    let tw = textWidth(t, th)
    const maxTW = bodyW * 0.92
    if (tw > maxTW) { th = Math.max(40, Math.floor(th * maxTW / tw)); tw = textWidth(t, th) }
    svg += textSvg(t, (A4_W - tw) / 2, y, th, 14, { color: '#111' })
    const uy = y + th + 20
    svg += `<line x1="${((A4_W - tw) / 2).toFixed(1)}" y1="${uy}" x2="${((A4_W + tw) / 2).toFixed(1)}" y2="${uy}" stroke="#F2A81E" stroke-width="8" stroke-linecap="round"/>`
    y = uy + 60
  }

  const bottom = A4_H - MARGIN
  const remaining = bottom - y
  const gap = 46
  // Region proportions: free = read/trace/find; Pro also = write.
  const fr = isPro ? [0.24, 0.22, 0.30, 0.24] : [0.32, 0.28, 0.40]

  // Read the words.
  {
    const { svg: hSvg, nextY } = headingSvg('READ THE WORDS', bodyX, y)
    svg += hSvg
    const hgt = remaining * fr[0] - (nextY - y)
    svg += readWordsBlock(list, bodyX, nextY, bodyW, hgt)
    y = nextY + hgt + gap
  }
  // Trace the words.
  {
    const { svg: hSvg, nextY } = headingSvg('TRACE THE WORDS', bodyX, y)
    svg += hSvg
    const hgt = remaining * fr[1] - (nextY - y)
    svg += traceWordsBlock(list, '', bodyX, nextY, bodyW, hgt)
    y = nextY + hgt + gap
  }
  // Find the words (word search).
  {
    const { svg: hSvg, nextY } = headingSvg('FIND THE WORDS', bodyX, y)
    svg += hSvg
    const hgt = isPro ? remaining * fr[2] - (nextY - y) : bottom - nextY
    svg += miniWordSearchBlock(list, bodyX, nextY, bodyW, hgt)
    y = nextY + hgt + gap
  }
  // Pro: write the words.
  if (isPro) {
    const { svg: hSvg, nextY } = headingSvg('WRITE THE WORDS', bodyX, y)
    svg += hSvg
    svg += writeLinesBlock(list.length, bodyX, nextY, bodyW, bottom - nextY)
  }

  svg += `</svg>`
  return sharp(Buffer.from(svg)).png().toBuffer()
}

// ---------------------------------------------------------------------------
// Composed sheet: a designed sequence of activity blocks (open-ended topics)
// ---------------------------------------------------------------------------

const up = (s: string) => s.toUpperCase().replace(/[^A-Z ]/g, ' ').replace(/\s+/g, ' ').trim()

// A centred definition / caption line (word-wrapped).
function noteBlock(text: string, x: number, top: number, w: number, h: number): string {
  const words = up(text).split(' ').filter(Boolean)
  const fh = Math.min(h * 0.42, 56)
  const maxW = w * 0.86
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    const cand = line ? `${line} ${word}` : word
    if (textWidth(cand, fh) > maxW && line) { lines.push(line); line = word } else line = cand
  }
  if (line) lines.push(line)
  const lineH = fh * 1.25
  let cy = top + Math.max(0, (h - lines.length * lineH) / 2)
  let s = ''
  for (const ln of lines) {
    const lw = textWidth(ln, fh)
    s += textSvg(ln, x + (w - lw) / 2, cy, fh, 11, { color: '#B26A00' })
    cy += lineH
  }
  return s
}

// A grid of words to look at and circle the ones matching the rule.
function circleWordsBlock(words: string[], x: number, top: number, w: number, h: number): string {
  const list = words.map(up).filter(Boolean).slice(0, 8)
  if (!list.length) return ''
  const cols = list.length <= 4 ? list.length : 4
  const rows = Math.ceil(list.length / cols)
  const cellW = w / cols
  const cellH = h / rows
  const gh = Math.max(42, Math.min(cellH * 0.5, 92))
  let s = ''
  list.forEach((word, i) => {
    const c = i % cols
    const r = Math.floor(i / cols)
    const ww = numberWidth(word, gh)
    s += numberSvg(word, x + c * cellW + (cellW - ww) / 2, top + r * cellH + (cellH - gh) / 2, gh, 13)
  })
  return s
}

// Ruled sentence lines.
function sentenceLinesBlock(lines: number, x: number, top: number, w: number, h: number): string {
  const n = Math.max(1, Math.min(lines, 5))
  const rowH = Math.min(130, h / n)
  let s = ''
  for (let i = 0; i < n; i++) {
    const y = top + i * rowH + rowH * 0.7
    s += `<line x1="${x}" y1="${y.toFixed(1)}" x2="${(x + w).toFixed(1)}" y2="${y.toFixed(1)}" stroke="#d0cabf" stroke-width="3"/>`
  }
  return s
}

// A row/grid of pictures to colour (and optionally a blank line to label each).
async function picturesRowBlock(
  bufs: Buffer[],
  label: boolean,
  x: number,
  top: number,
  w: number,
  h: number
): Promise<{ svg: string; composites: sharp.OverlayOptions[] }> {
  const n = bufs.length
  if (!n) return { svg: '', composites: [] }
  const cols = Math.min(n, 4)
  const rows = Math.ceil(n / cols)
  const cellW = w / cols
  const cellH = h / rows
  // Fill the slice: pictures take most of the cell; a label line (write a word)
  // sits snug beneath each so the picture and its word read as one unit.
  const picBoxH = label ? cellH * 0.78 : cellH * 0.96
  let svg = ''
  const composites: sharp.OverlayOptions[] = []
  for (let i = 0; i < n; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    const cx = x + c * cellW
    const cy = top + r * cellH
    const innerW = Math.round(cellW * 0.88)
    const innerH = Math.round(picBoxH * 0.96)
    const pic = await sharp(bufs[i]).greyscale().resize(innerW, innerH, { fit: 'inside', background: '#ffffff' }).flatten({ background: '#ffffff' }).toBuffer()
    const pm = await sharp(pic).metadata()
    composites.push({ input: pic, left: Math.round(cx + (cellW - (pm.width || innerW)) / 2), top: Math.round(cy + (picBoxH - (pm.height || innerH)) / 2) })
    if (label) {
      const ly = cy + picBoxH + (cellH - picBoxH) * 0.55
      svg += `<line x1="${(cx + cellW * 0.14).toFixed(1)}" y1="${ly.toFixed(1)}" x2="${(cx + cellW * 0.86).toFixed(1)}" y2="${ly.toFixed(1)}" stroke="#c9c4ba" stroke-width="3"/>`
    }
  }
  return { svg, composites }
}

// A tiny seeded RNG so a sheet's sums are varied but reproducible (stable to
// eyeball and test). Not for security — just deterministic variety.
function makeRng(seed: number): () => number {
  let s = seed >>> 0 || 1
  return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
}

// The glyph font has no +, −, or =, so draw them as plain strokes.
function opGlyph(kind: '+' | '-' | '=', cx: number, cy: number, size: number, stroke: number): string {
  const h = size / 2
  const L = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#111" stroke-width="${stroke}" stroke-linecap="round"/>`
  if (kind === '-') return L(cx - h, cy, cx + h, cy)
  if (kind === '+') return L(cx - h, cy, cx + h, cy) + L(cx, cy - h, cx, cy + h)
  const g = size * 0.24
  return L(cx - h, cy - g, cx + h, cy - g) + L(cx - h, cy + g, cx + h, cy + g)
}

// Countable dots under an operand (visual aid for the youngest children).
function countDots(n: number, cx: number, top: number, r: number): string {
  if (n < 1) return ''
  const per = Math.min(n, 5)
  const step = r * 2.5
  let s = ''
  for (let i = 0; i < n; i++) {
    const rr = Math.floor(i / per), cc = i % per
    const rowN = Math.min(per, n - rr * per)
    const cxx = cx - (rowN - 1) * step / 2 + cc * step
    const cyy = top + r + rr * step
    s += `<circle cx="${cxx.toFixed(1)}" cy="${cyy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#111" stroke-width="3.5"/>`
  }
  return s
}

// A grid of correct addition/subtraction sums with a box to write the answer.
// `salt` varies the generated sums between two sums blocks on the same sheet.
function sumsBlock(op: 'add' | 'subtract' | 'mixed', maxValue: number, count: number, dots: boolean, x: number, top: number, w: number, h: number, salt = 0): string {
  const maxV = Math.max(5, Math.min(100, Math.round(maxValue)))
  const n = Math.max(2, Math.min(15, Math.round(count)))
  const rng = makeRng(maxV * 131 + n * 17 + (op === 'add' ? 1 : op === 'subtract' ? 2 : 3) + salt * 7919)
  const ri = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1))

  // Generate `n` distinct, always-correct sums (answer written by the child).
  const items: { a: number; b: number; sign: '+' | '-' }[] = []
  const seen = new Set<string>()
  let guard = 0
  while (items.length < n && guard++ < n * 40) {
    const add = op === 'add' || (op === 'mixed' && rng() < 0.5)
    let a: number, b: number
    if (add) { a = ri(1, maxV - 1); b = ri(1, maxV - a) }
    else { a = ri(2, maxV); b = ri(1, a - 1 < 1 ? a : a - 1) } // avoid a-a=0
    const key = `${a}${add ? '+' : '-'}${b}`
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ a, b, sign: add ? '+' : '-' })
  }

  const useDots = dots && maxV <= 10
  const cols = maxV > 20 ? 2 : 3
  const rows = Math.ceil(items.length / cols)
  const cellW = w / cols

  // One shared glyph height for the whole block: fit the widest equation to the
  // column width, then cap by the vertical budget per row.
  const eqW = (it: { a: number; b: number }, gh: number) => {
    const gap = gh * 0.34
    return numberWidth(String(it.a), gh) + gap + gh * 0.62 + gap + numberWidth(String(it.b), gh) + gap + gh * 0.7 + gap + gh * 1.15
  }
  const dotBlockH = (gh: number) => (useDots ? gh * 1.6 : 0) // dots sit under the row
  let gh = Math.min(96, (h / rows) / (useDots ? 2.9 : 1.9))
  const widest = () => Math.max(...items.map((it) => eqW(it, gh)))
  if (widest() > cellW * 0.9) gh = gh * (cellW * 0.9 / widest())
  gh = Math.max(26, gh)

  // Rows fill the slice evenly (each equation centred in its row cell), so the
  // block uses the whole height rather than clustering at the top.
  const rowContentH = gh + dotBlockH(gh)
  const rowPitch = h / rows

  return items.map((it, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const cellX = x + col * cellW
    const rowTop = top + row * rowPitch + Math.max(0, (rowPitch - rowContentH) / 2)
    const gap = gh * 0.34, opW = gh * 0.62, eqSym = gh * 0.7
    const totalW = eqW(it, gh)
    const midY = rowTop + gh / 2
    let cx = cellX + (cellW - totalW) / 2
    const st = Math.max(6, gh * 0.14)
    let s = ''
    s += numberSvg(String(it.a), cx, rowTop, gh, st)
    if (useDots) s += countDots(it.a, cx + numberWidth(String(it.a), gh) / 2, rowTop + gh + gh * 0.18, gh * 0.16)
    cx += numberWidth(String(it.a), gh) + gap
    s += opGlyph(it.sign, cx + opW / 2, midY, opW, st)
    cx += opW + gap
    s += numberSvg(String(it.b), cx, rowTop, gh, st)
    if (useDots) s += countDots(it.b, cx + numberWidth(String(it.b), gh) / 2, rowTop + gh + gh * 0.18, gh * 0.16)
    cx += numberWidth(String(it.b), gh) + gap
    s += opGlyph('=', cx + eqSym / 2, midY, eqSym, st)
    cx += eqSym + gap
    s += `<rect x="${cx.toFixed(1)}" y="${rowTop.toFixed(1)}" width="${(gh * 1.15).toFixed(1)}" height="${gh.toFixed(1)}" rx="10" fill="none" stroke="#c9c4ba" stroke-width="3"/>`
    return s
  }).join('')
}

const ACTIVITY_WEIGHT: Record<string, number> = {
  note: 0.6, pictures: 3, circleWords: 1.8, traceWords: 1.6,
  wordSearch: 2.6, readWords: 1.8, writeLines: 1.4, sentence: 1.4, sums: 3.2,
}

/**
 * Render a designed sheet from a sequence of activity blocks. This is what lets
 * an open-ended request ("an interactive sheet about nouns") become a real,
 * varied worksheet: the planner picks the blocks, we lay them out top-to-bottom.
 * Free sheets drop any block flagged `pro`.
 */
export async function buildComposedSheet(
  title: string | undefined,
  activities: Activity[],
  settings: PhotoJobSettings,
  isPro: boolean,
  genPicture?: (obj: string) => Promise<Buffer | null>
): Promise<Buffer> {
  const acts = activities.filter((a) => isPro || !a.pro).slice(0, 6)
  const bodyX = MARGIN
  const bodyW = A4_W - MARGIN * 2

  // Pre-generate any pictures (parallel); drop a pictures block if none render.
  const picByAct = new Map<Activity, Buffer[]>()
  await Promise.all(
    acts.map(async (a) => {
      if (a.type === 'pictures' && genPicture) {
        const bufs = (await Promise.all(a.items.slice(0, 4).map((o) => genPicture(o).catch(() => null)))).filter((b): b is Buffer => b != null)
        if (bufs.length) picByAct.set(a, bufs)
      }
    })
  )
  const live = acts.filter((a) => a.type !== 'pictures' || picByAct.has(a))

  let overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  overlay += `<rect width="${A4_W}" height="${A4_H}" fill="#ffffff"/>`
  const composites: sharp.OverlayOptions[] = []

  // Title band.
  let y = Math.round(MARGIN * 0.6)
  const t = (title && title.trim()) || 'LEARNING SHEET'
  {
    let th = 72
    let tw = textWidth(t, th)
    const maxTW = bodyW * 0.92
    if (tw > maxTW) { th = Math.max(40, Math.floor(th * maxTW / tw)); tw = textWidth(t, th) }
    overlay += textSvg(t, (A4_W - tw) / 2, y, th, 14, { color: '#111' })
    const uy = y + th + 18
    overlay += `<line x1="${((A4_W - tw) / 2).toFixed(1)}" y1="${uy}" x2="${((A4_W + tw) / 2).toFixed(1)}" y2="${uy}" stroke="#F2A81E" stroke-width="8" stroke-linecap="round"/>`
    y = uy + 34
  }

  const bottom = A4_H - MARGIN
  const gap = 22
  const totalW = live.reduce((s, a) => s + (ACTIVITY_WEIGHT[a.type] || 1.6), 0) || 1
  const bodyH = bottom - y - gap * live.length

  let blockIndex = 0
  for (const a of live) {
    const sliceH = ((ACTIVITY_WEIGHT[a.type] || 1.6) / totalW) * bodyH
    blockIndex++
    if (a.type === 'note') {
      overlay += noteBlock(a.text, bodyX, y, bodyW, sliceH)
    } else {
      const { svg: hSvg, nextY } = headingSvg(up(a.instruction), bodyX, y)
      overlay += hSvg
      const ch = y + sliceH - nextY
      switch (a.type) {
        case 'pictures': {
          const { svg: ps, composites: comps } = await picturesRowBlock(picByAct.get(a) || [], !!a.label, bodyX, nextY, bodyW, ch)
          overlay += ps
          composites.push(...comps)
          break
        }
        case 'circleWords': overlay += circleWordsBlock(a.words, bodyX, nextY, bodyW, ch); break
        case 'traceWords': overlay += traceWordsBlock(a.words, '', bodyX, nextY, bodyW, ch); break
        case 'wordSearch': overlay += miniWordSearchBlock(a.words, bodyX, nextY, bodyW, ch); break
        case 'readWords': overlay += readWordsBlock(a.words.map(up), bodyX, nextY, bodyW, ch); break
        case 'writeLines': overlay += writeLinesBlock(a.count, bodyX, nextY, bodyW, ch); break
        case 'sentence': overlay += sentenceLinesBlock(a.lines, bodyX, nextY, bodyW, ch); break
        case 'sums': overlay += sumsBlock(a.op, a.maxValue, a.count, !!a.dots, bodyX, nextY, bodyW, ch, blockIndex); break
      }
    }
    y += sliceH + gap
  }

  overlay += `</svg>`
  return sharp({ create: { width: A4_W, height: A4_H, channels: 3, background: '#ffffff' } })
    .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }, ...composites])
    .png()
    .toBuffer()
}
