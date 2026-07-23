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
// Build a word-search and report which words were ACTUALLY placed, so the
// "FIND" list can show only findable words (never list a word that isn't in the
// grid). Words longer than the grid are skipped and reported as unplaced.
function makeWordSearch(words: string[], size: number): { grid: string[][]; placed: string[] } {
  const G: string[][] = Array.from({ length: size }, () => Array(size).fill(''))
  const dirs = [[0, 1], [1, 0], [1, 1]]
  const placed: string[] = []
  for (const raw of words) {
    const w = raw.toUpperCase().replace(/[^A-Z]/g, '')
    if (!w || w.length > size) continue
    let done = false
    for (let tries = 0; tries < 400 && !done; tries++) {
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
      placed.push(w)
      done = true
    }
  }
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) if (!G[r][c]) G[r][c] = A[Math.floor(Math.random() * 26)]
  return { grid: G, placed }
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
  // Size to the LONGEST word so every listed word fits and can be placed.
  const maxLen = list.reduce((m, word) => Math.max(m, word.length), 0)
  const size = Math.max(7, Math.min(10, maxLen + 2))
  const { grid } = makeWordSearch(list, size)
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

// Deterministic letter shuffle (stable across renders, no Math.random so the
// output is reproducible) for the "unscramble the word" activity. Guarantees
// the result differs from the original spelling when the word allows it.
function scrambleWord(word: string, seed: number): string {
  const chars = word.split('')
  let state = ((seed + 1) * 2654435761) >>> 0
  const rnd = () => { state = (state * 1103515245 + 12345) >>> 0; return state / 0x100000000 }
  for (let i = chars.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  let out = chars.join('')
  if (out === word && word.length > 1) out = word.slice(1) + word[0]
  return out
}

// "Unscramble the word": scrambled letters on the left, an arrow, then a
// write-in line to spell the word correctly. Age 9–10 spelling practice.
function unscrambleBlock(words: string[], x: number, top: number, w: number, h: number): string {
  const list = words.map((word) => word.toUpperCase().replace(/[^A-Z]/g, '')).filter((word) => word.length >= 3).slice(0, 4)
  if (!list.length) return ''
  const rowH = Math.min(150, h / list.length)
  const longest = list.reduce((m, word) => Math.max(m, word.length), 1)
  const spreadLen = longest * 2 - 1 // letters interleaved with spaces
  let gh = Math.max(40, Math.min(rowH * 0.5, 88))
  const maxSpreadW = w * 0.46
  while (numberWidth('X'.repeat(spreadLen), gh) > maxSpreadW && gh > 40) gh -= 6
  const numH = Math.round(gh * 0.72)
  let s = ''
  list.forEach((word, i) => {
    const scr = scrambleWord(word, i)
    const y = top + i * rowH
    const gy = y + (rowH - gh) / 2
    s += numberSvg(String(i + 1), x, gy + (gh - numH) / 2, numH, 12)
    let cx = x + numberWidth(String(i + 1), numH) + 44
    const spread = scr.split('').join(' ')
    s += numberSvg(spread, cx, gy, gh, 10, { color: '#111' })
    cx += maxSpreadW + gh * 0.4
    // arrow →
    const midY = gy + gh / 2
    const aLen = gh * 0.7
    s += `<path d="M${cx.toFixed(1)},${midY.toFixed(1)} h${aLen.toFixed(1)}" stroke="#c9c4ba" stroke-width="4" fill="none" stroke-linecap="round"/>`
    s += `<path d="M${(cx + aLen).toFixed(1)},${midY.toFixed(1)} l${(-gh * 0.2).toFixed(1)},${(-gh * 0.15).toFixed(1)} m${(gh * 0.2).toFixed(1)},${(gh * 0.15).toFixed(1)} l${(-gh * 0.2).toFixed(1)},${(gh * 0.15).toFixed(1)}" stroke="#c9c4ba" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    cx += aLen + gh * 0.5
    // write-in line
    const lineY = gy + gh
    s += `<line x1="${cx.toFixed(1)}" y1="${lineY.toFixed(1)}" x2="${(x + w).toFixed(1)}" y2="${lineY.toFixed(1)}" stroke="#d0cabf" stroke-width="3"/>`
  })
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
 * 9–10 band: a full, varied worksheet — word search → unscramble the words →
 * put them in ABC order (→ write a sentence, for Pro). Fully deterministic; no
 * image model needed. Matches the 3–4 activity mix younger age bands get.
 */
export async function buildLetterPuzzleSheet(letter: string, words: string[], settings: PhotoJobSettings, isPro = false): Promise<Buffer> {
  const chars = letter.toUpperCase().slice(0, 3)
  const requested = words.map((w) => w.toUpperCase().replace(/[^A-Z]/g, '')).filter(Boolean).slice(0, 6)
  const bodyX = MARGIN
  const bodyW = A4_W - MARGIN * 2

  let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${A4_W}" height="${A4_H}" viewBox="0 0 ${A4_W} ${A4_H}">`
  svg += `<rect width="${A4_W}" height="${A4_H}" fill="#ffffff"/>`

  // Title + header grapheme.
  let y = MARGIN * 0.4
  if (settings.title) {
    const th = 52
    const tw = textWidth(settings.title, th)
    svg += textSvg(settings.title, (A4_W - tw) / 2, y, th, 12, { color: '#111' })
    const uy = y + th + 14
    svg += `<line x1="${((A4_W - tw) / 2).toFixed(1)}" y1="${uy}" x2="${((A4_W + tw) / 2).toFixed(1)}" y2="${uy}" stroke="#F2A81E" stroke-width="6" stroke-linecap="round"/>`
    y = uy + 26
  }
  const hGlyphH = Math.round(A4_H * 0.064)
  svg += numberSvg(chars, (A4_W - numberWidth(chars, hGlyphH)) / 2, y, hGlyphH, 22)
  y += hGlyphH + Math.round(A4_H * 0.018)

  const bottom = A4_H - MARGIN
  const remaining = bottom - y
  const gap = 40
  // Region proportions. Free: search / unscramble / ABC order (3 activities).
  // Pro: the same three, tighter, plus a write-a-sentence region (4 activities).
  const fr = isPro ? [0.40, 0.22, 0.20, 0.18] : [0.48, 0.26, 0.26]

  // --- Activity 1: word search (grid + a "find" list under it) ---------------
  {
    const { svg: hSvg, nextY } = headingSvg('WORD SEARCH', bodyX, y)
    svg += hSvg
    const h1 = remaining * fr[0] - (nextY - y)
    // Size the grid to the LONGEST word so every word fits and can be placed.
    const maxLen = requested.reduce((m, w) => Math.max(m, w.length), 0)
    const size = Math.max(9, Math.min(14, maxLen + 2))
    const { grid, placed } = makeWordSearch(requested, size)
    // Only list words actually placed — never ask for one that isn't in the grid.
    const list = placed.length ? placed : requested
    const findH = 150
    const gridArea = Math.max(0, h1 - findH)
    const gridMax = Math.min(bodyW, gridArea)
    const cell = Math.floor(gridMax / size)
    const gridSize = cell * size
    const gridX = Math.round((A4_W - gridSize) / 2)
    const gridTop = nextY
    svg += `<rect x="${gridX}" y="${gridTop}" width="${gridSize}" height="${gridSize}" fill="none" stroke="#c9c4ba" stroke-width="3" rx="24"/>`
    const letterH = Math.round(cell * 0.6)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const ch = grid[r][c]
        const lw = numberWidth(ch, letterH)
        svg += numberSvg(ch, gridX + c * cell + (cell - lw) / 2, gridTop + r * cell + (cell - letterH) / 2, letterH, 8)
      }
    }
    // "FIND" list, wrapping onto new lines when it runs out of width.
    const listY = gridTop + gridSize + 30
    const labelH = 46
    svg += textSvg('FIND', bodyX, listY, labelH, 11)
    const listStartX = bodyX + textWidth('FIND', labelH) + labelH * 0.6
    const wordH = 42
    const wordGap = wordH * 0.7
    const lineGap = wordH * 1.5
    const maxX = A4_W - MARGIN
    let wx = listStartX
    let wy = listY
    for (const w of list) {
      const ww = numberWidth(w, wordH)
      if (wx > listStartX && wx + ww > maxX) { wx = listStartX; wy += lineGap }
      svg += numberSvg(w, wx, wy + (labelH - wordH) / 2, wordH, 8)
      wx += ww + wordGap
    }
    y = nextY + h1 + gap
  }

  // --- Activity 2: unscramble the words --------------------------------------
  {
    const { svg: hSvg, nextY } = headingSvg('UNSCRAMBLE THE WORDS', bodyX, y)
    svg += hSvg
    const h2 = remaining * fr[1] - (nextY - y)
    svg += unscrambleBlock(requested, bodyX, nextY, bodyW, h2)
    y = nextY + h2 + gap
  }

  // --- Activity 3: put the words in ABC order (now free, not Pro-only) --------
  {
    const { svg: hSvg, nextY } = headingSvg('WRITE IN ABC ORDER', bodyX, y)
    svg += hSvg
    // One-line instruction so the task is self-explanatory (the heading alone
    // wasn't clear). Punctuation-free — the glyph font only draws A-Z/0-9.
    const instr = 'WRITE THE WORDS IN ALPHABETICAL ORDER FROM A TO Z'
    let iH = 34
    const iw = textWidth(instr, iH)
    const maxIW = bodyW * 0.95
    if (iw > maxIW) iH = Math.floor(iH * (maxIW / iw))
    svg += textSvg(instr, bodyX, nextY, iH, 8, { color: '#8a8f96' })
    const blockTop = nextY + iH + 24
    const h3 = (isPro ? remaining * fr[2] - (blockTop - y) : bottom - blockTop)
    svg += abcOrderBlock(requested, bodyX, blockTop, bodyW, h3)
    y = blockTop + h3 + gap
  }

  // --- Activity 4 (Pro): write a sentence ------------------------------------
  if (isPro) {
    const { svg: hSvg, nextY } = headingSvg('WRITE A SENTENCE', bodyX, y)
    svg += hSvg
    const h4 = bottom - nextY
    const lines = Math.max(2, Math.min(3, Math.floor(h4 / 130)))
    const lineStep = h4 / (lines + 0.5)
    for (let i = 0; i < lines; i++) {
      const ly = nextY + (i + 1) * lineStep
      svg += `<line x1="${bodyX}" y1="${ly.toFixed(1)}" x2="${A4_W - MARGIN}" y2="${ly.toFixed(1)}" stroke="#d0cabf" stroke-width="3"/>`
    }
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
  // Fewer columns = bigger, clearer pictures. The common "colour & label 4
  // things" case becomes a 2×2 grid rather than a cramped 1×4 row.
  const cols = n === 4 ? 2 : Math.min(n, 3)
  const rows = Math.ceil(n / cols)
  const cellW = w / cols
  const cellH = h / rows
  // Fill the slice: pictures take most of the cell; a label line (write a word)
  // sits snug beneath each so the picture and its word read as one unit.
  const picBoxH = label ? cellH * 0.82 : cellH * 0.96
  let svg = ''
  const composites: sharp.OverlayOptions[] = []
  for (let i = 0; i < n; i++) {
    const c = i % cols
    const r = Math.floor(i / cols)
    const cx = x + c * cellW
    const cy = top + r * cellH
    const innerW = Math.round(cellW * 0.94)
    const innerH = Math.round(picBoxH * 0.98)
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
function opGlyph(kind: '+' | '-' | '=' | '×' | '÷', cx: number, cy: number, size: number, stroke: number): string {
  const h = size / 2
  const L = (x1: number, y1: number, x2: number, y2: number) =>
    `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#111" stroke-width="${stroke}" stroke-linecap="round"/>`
  if (kind === '-') return L(cx - h, cy, cx + h, cy)
  if (kind === '+') return L(cx - h, cy, cx + h, cy) + L(cx, cy - h, cx, cy + h)
  if (kind === '×') { const d = h * 0.72; return L(cx - d, cy - d, cx + d, cy + d) + L(cx - d, cy + d, cx + d, cy - d) }
  if (kind === '÷') {
    const g = size * 0.36
    const rr = Math.max(2.5, stroke * 0.62)
    const dot = (yy: number) => `<circle cx="${cx.toFixed(1)}" cy="${yy.toFixed(1)}" r="${rr.toFixed(1)}" fill="#111"/>`
    return L(cx - h * 0.9, cy, cx + h * 0.9, cy) + dot(cy - g) + dot(cy + g)
  }
  const g = size * 0.24
  return L(cx - h, cy - g, cx + h, cy - g) + L(cx - h, cy + g, cx + h, cy + g)
}

// A times-table block: `table × k = [box]` for k = 1..upTo, in order (a ladder to
// learn) or shuffled (mixed practice); `op:'divide'` renders the inverse
// `(table·k) ÷ table = [box]`. All facts are correct by construction.
function timesTableBlock(table: number, upTo: number, op: 'multiply' | 'divide', shuffle: boolean, x: number, top: number, w: number, h: number, salt = 0): string {
  const n = Math.max(2, Math.min(12, Math.round(upTo)))
  const ks = Array.from({ length: n }, (_, i) => i + 1)
  if (shuffle) {
    const rng = makeRng(table * 97 + n * 13 + (op === 'divide' ? 5 : 3) + salt * 131)
    for (let i = ks.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ks[i], ks[j]] = [ks[j], ks[i]] }
  }
  const items = ks.map((k) => op === 'divide'
    ? { a: table * k, b: table, sign: '÷' as const }
    : { a: table, b: k, sign: '×' as const })

  const cols = items.length > 6 ? 2 : 1
  const rows = Math.ceil(items.length / cols)
  const cellW = w / cols
  const rowPitch = h / rows

  const eqW = (it: { a: number; b: number }, gh: number) => {
    const gap = gh * 0.34, opW = gh * 0.62, eqSym = gh * 0.7
    return numberWidth(String(it.a), gh) + gap + opW + gap + numberWidth(String(it.b), gh) + gap + eqSym + gap + gh * 1.15
  }
  let gh = Math.min(84, rowPitch / 1.7)
  const widest = () => Math.max(...items.map((it) => eqW(it, gh)))
  if (widest() > cellW * 0.9) gh = gh * (cellW * 0.9 / widest())
  gh = Math.max(24, gh)

  return items.map((it, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const cellX = x + col * cellW
    const rowTop = top + row * rowPitch + Math.max(0, (rowPitch - gh) / 2)
    const gap = gh * 0.34, opW = gh * 0.62, eqSym = gh * 0.7
    const midY = rowTop + gh / 2
    let cx = cellX + (cellW - eqW(it, gh)) / 2
    const st = Math.max(6, gh * 0.14)
    let s = ''
    s += numberSvg(String(it.a), cx, rowTop, gh, st); cx += numberWidth(String(it.a), gh) + gap
    s += opGlyph(it.sign, cx + opW / 2, midY, opW, st); cx += opW + gap
    s += numberSvg(String(it.b), cx, rowTop, gh, st); cx += numberWidth(String(it.b), gh) + gap
    s += opGlyph('=', cx + eqSym / 2, midY, eqSym, st); cx += eqSym + gap
    s += `<rect x="${cx.toFixed(1)}" y="${rowTop.toFixed(1)}" width="${(gh * 1.15).toFixed(1)}" height="${gh.toFixed(1)}" rx="10" fill="none" stroke="#c9c4ba" stroke-width="3"/>`
    return s
  }).join('')
}

// Visual multiplication for the youngest: each fact drawn as `k` groups of
// `table` countable circles (k lots of `table`), with the equation and an answer
// box. Shows what multiplication MEANS (repeated groups) the way the sums block
// uses countable dots — so a 5–7 year old can count the groups to find each answer.
function multiplyGroupsBlock(table: number, upTo: number, x: number, top: number, w: number, h: number): string {
  const kMax = Math.max(2, Math.min(6, Math.round(upTo)))
  const ks = Array.from({ length: kMax }, (_, i) => i + 1)
  const rowH = h / ks.length
  const perGroupCols = Math.min(Math.max(1, table), 5)
  const groupRows = Math.ceil(Math.max(1, table) / perGroupCols)
  const availW = w * 0.56
  const eqX = x + w * 0.6
  const unitsW = kMax * perGroupCols + (kMax - 1) // circle-columns incl 1-col gap between groups
  let cs = Math.min(availW / unitsW, (rowH * 0.72) / Math.max(1, groupRows))
  cs = Math.max(9, cs)
  const r = cs * 0.4

  let s = ''
  ks.forEach((k, idx) => {
    const rowMid = top + idx * rowH + rowH / 2
    const cy0 = rowMid - (groupRows - 1) * cs / 2
    let gx = x
    for (let g = 0; g < k; g++) {
      for (let c = 0; c < table; c++) {
        const rr = Math.floor(c / perGroupCols), cc = c % perGroupCols
        const cxx = gx + cc * cs + cs / 2
        const cyy = cy0 + rr * cs
        s += `<circle cx="${cxx.toFixed(1)}" cy="${cyy.toFixed(1)}" r="${r.toFixed(1)}" fill="none" stroke="#111" stroke-width="3"/>`
      }
      gx += perGroupCols * cs + cs
    }
    // Equation: table × k = [box], aligned across rows.
    const gh = Math.min(rowH * 0.5, 52)
    const st = Math.max(6, gh * 0.14)
    const gap = gh * 0.3, opW = gh * 0.6, eqSym = gh * 0.68
    let cx = eqX
    s += numberSvg(String(table), cx, rowMid - gh / 2, gh, st); cx += numberWidth(String(table), gh) + gap
    s += opGlyph('×', cx + opW / 2, rowMid, opW, st); cx += opW + gap
    s += numberSvg(String(k), cx, rowMid - gh / 2, gh, st); cx += numberWidth(String(k), gh) + gap
    s += opGlyph('=', cx + eqSym / 2, rowMid, eqSym, st); cx += eqSym + gap
    s += `<rect x="${cx.toFixed(1)}" y="${(rowMid - gh / 2).toFixed(1)}" width="${(gh * 1.15).toFixed(1)}" height="${gh.toFixed(1)}" rx="8" fill="none" stroke="#c9c4ba" stroke-width="3"/>`
  })
  return s
}

// Render a row of "equation tokens" (numbers, operators, and blank boxes) at a
// shared glyph height, left-to-right from x. Used by the number-bond block so a
// blank can sit anywhere in the sentence ("7 + ▢ = 10", "▢ + 3 = 10", "10 − 4 = ▢").
type EqTok = number | '+' | '-' | '=' | 'box'
function equationTokens(tokens: EqTok[], x: number, midY: number, gh: number, st: number): { svg: string; width: number } {
  const gap = gh * 0.3, opW = gh * 0.6, eqSym = gh * 0.66, box = gh * 1.15
  const tokW = (t: EqTok): number => typeof t === 'number' ? numberWidth(String(t), gh) : t === 'box' ? box : t === '=' ? eqSym : opW
  const width = tokens.reduce((acc: number, t, i) => acc + tokW(t) + (i < tokens.length - 1 ? gap : 0), 0)
  let cx = x, s = ''
  for (const t of tokens) {
    if (typeof t === 'number') { s += numberSvg(String(t), cx, midY - gh / 2, gh, st); cx += numberWidth(String(t), gh) + gap }
    else if (t === 'box') { s += `<rect x="${cx.toFixed(1)}" y="${(midY - gh / 2).toFixed(1)}" width="${box.toFixed(1)}" height="${gh.toFixed(1)}" rx="8" fill="none" stroke="#c9c4ba" stroke-width="3"/>`; cx += box + gap }
    else { const sym = t === '=' ? eqSym : opW; s += opGlyph(t, cx + sym / 2, midY, sym, st); cx += sym + gap }
  }
  return { svg: s, width }
}

// A ten-frame make-N visual: a 2×5 frame (two for 20) with `a` counters filled
// and the rest empty, plus "▢ + ▢ = N" to write the two parts. Concrete support
// for number bonds — the youngest can count the filled and empty cells.
function tenFrameBlock(whole: number, count: number, x: number, top: number, w: number, h: number, salt = 0): string {
  const W = Math.max(5, Math.min(20, Math.round(whole)))
  const frames = W > 10 ? 2 : 1
  const cellsPer = frames === 2 ? 10 : W
  const n = Math.max(2, Math.min(5, Math.round(count)))
  const rng = makeRng(W * 131 + n * 17 + salt * 7919)
  const rowH = h / n
  const availW = w * 0.54
  const eqX = x + w * 0.58
  const totalCols = frames * 5 + (frames - 1)
  let cell = Math.min(availW / totalCols, (rowH * 0.72) / 2)
  cell = Math.max(13, cell)
  const r = cell * 0.3
  const used = new Set<number>()
  const pick = () => { let a = 1, g = 0; do { a = 1 + Math.floor(rng() * (W - 1)) } while (used.has(a) && used.size < W - 1 && g++ < 40); used.add(a); return a }
  let s = ''
  for (let i = 0; i < n; i++) {
    const a = pick()
    const rowTop = top + i * rowH
    const gridTop = rowTop + (rowH - 2 * cell) / 2
    let filled = 0
    for (let f = 0; f < frames; f++) {
      const fx = x + f * (5 * cell + cell)
      const cells = frames === 2 ? 10 : cellsPer
      for (let idx = 0; idx < cells; idx++) {
        const cc = idx % 5, rr = Math.floor(idx / 5)
        const cx = fx + cc * cell, cy = gridTop + rr * cell
        s += `<rect x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" width="${cell.toFixed(1)}" height="${cell.toFixed(1)}" fill="none" stroke="#c9c4ba" stroke-width="2.5"/>`
        if (filled < a) { s += `<circle cx="${(cx + cell / 2).toFixed(1)}" cy="${(cy + cell / 2).toFixed(1)}" r="${r.toFixed(1)}" fill="#111"/>`; filled++ }
      }
    }
    const gh = Math.min(rowH * 0.42, 48)
    const st = Math.max(6, gh * 0.14)
    const midY = rowTop + rowH / 2
    s += equationTokens(['box', '+', 'box', '=', W], eqX, midY, gh, st).svg
  }
  return s
}

// Part-whole ("cherry") model: whole on top joined by lines to two parts, one
// given and one blank — the core number-bond model. `count` diagrams in a row.
function partWholeBlock(whole: number, count: number, x: number, top: number, w: number, h: number, salt = 0): string {
  const W = Math.max(5, Math.min(100, Math.round(whole)))
  const n = Math.max(2, Math.min(4, Math.round(count)))
  const rng = makeRng(W * 977 + n * 13 + salt * 131)
  const cellW = w / n
  const cr = Math.min(cellW * 0.19, h * 0.34, 58)
  const numH = cr * 0.95
  const st = Math.max(4, numH * 0.14)
  const used = new Set<number>()
  const pick = () => { let a = 1, g = 0; do { a = 1 + Math.floor(rng() * (W - 1)) } while (used.has(a) && used.size < W - 1 && g++ < 40); used.add(a); return a }
  let s = ''
  for (let i = 0; i < n; i++) {
    const a = pick()
    const cx0 = x + i * cellW + cellW / 2
    // Centre the diagram vertically in the slice (total height ≈ 4.7·cr).
    const topY = top + Math.max(0, (h - cr * 4.7) / 2) + cr
    const botY = topY + cr * 2.7
    const lx = cx0 - cellW * 0.24, rx = cx0 + cellW * 0.24
    s += `<line x1="${cx0.toFixed(1)}" y1="${(topY + cr).toFixed(1)}" x2="${lx.toFixed(1)}" y2="${(botY - cr).toFixed(1)}" stroke="#c9c4ba" stroke-width="3"/>`
    s += `<line x1="${cx0.toFixed(1)}" y1="${(topY + cr).toFixed(1)}" x2="${rx.toFixed(1)}" y2="${(botY - cr).toFixed(1)}" stroke="#c9c4ba" stroke-width="3"/>`
    s += `<circle cx="${cx0.toFixed(1)}" cy="${topY.toFixed(1)}" r="${cr.toFixed(1)}" fill="none" stroke="#111" stroke-width="3.5"/>`
    s += numberSvg(String(W), cx0 - numberWidth(String(W), numH) / 2, topY - numH / 2, numH, st)
    s += `<circle cx="${lx.toFixed(1)}" cy="${botY.toFixed(1)}" r="${cr.toFixed(1)}" fill="none" stroke="#111" stroke-width="3.5"/>`
    s += numberSvg(String(a), lx - numberWidth(String(a), numH) / 2, botY - numH / 2, numH, st)
    s += `<circle cx="${rx.toFixed(1)}" cy="${botY.toFixed(1)}" r="${cr.toFixed(1)}" fill="none" stroke="#c9c4ba" stroke-width="3.5" stroke-dasharray="9 8"/>`
  }
  return s
}

// Number-fact sentences with a blank anywhere. 'missing' = addition bonds
// ("a + ▢ = W", "▢ + b = W"); 'subtract' = the inverse ("W − a = ▢",
// "W − ▢ = a"). All correct by construction.
function bondsBlock(whole: number, count: number, style: 'missing' | 'subtract', x: number, top: number, w: number, h: number, salt = 0): string {
  const W = Math.max(5, Math.min(100, Math.round(whole)))
  const n = Math.max(2, Math.min(12, Math.round(count)))
  const rng = makeRng(W * 131 + n * 17 + (style === 'subtract' ? 5 : 3) + salt * 7919)
  const items: (number | '+' | '-' | '=' | 'box')[][] = []
  const seen = new Set<string>()
  let guard = 0
  while (items.length < n && guard++ < n * 50) {
    const a = 1 + Math.floor(rng() * (W - 1))
    const forms: (number | '+' | '-' | '=' | 'box')[][] = style === 'subtract'
      ? [[W, '-', a, '=', 'box'], [W, '-', 'box', '=', a]]
      : [[a, '+', 'box', '=', W], ['box', '+', a, '=', W]]
    const form = forms[Math.floor(rng() * forms.length)]
    const key = form.join('|')
    if (seen.has(key)) continue
    seen.add(key)
    items.push(form)
  }
  const cols = 2
  const rows = Math.ceil(items.length / cols)
  const cellW = w / cols
  const rowPitch = h / rows
  const gh = Math.max(26, Math.min(72, rowPitch / 1.7))
  const st = Math.max(6, gh * 0.14)
  return items.map((tokens, i) => {
    const col = i % cols, row = Math.floor(i / cols)
    const midY = top + row * rowPitch + rowPitch / 2
    const { width } = equationTokens(tokens, 0, midY, gh, st)
    const startX = x + col * cellW + (cellW - width) / 2
    return equationTokens(tokens, startX, midY, gh, st).svg
  }).join('')
}

// ---------------------------------------------------------------------------
// Shapes: draw 2D and 3D shapes deterministically + property/sort blocks.
// ---------------------------------------------------------------------------

// Draw a shape as clean colour-in line art, centred at (cx, cy) within a box of
// side `s`. 2D shapes are exact polygons; 3D shapes are simple, recognisable
// wireframe representations.
function drawShapeSvg(name: string, cx: number, cy: number, s: number): string {
  const r = s / 2
  const A = 'fill="none" stroke="#111" stroke-width="4" stroke-linejoin="round" stroke-linecap="round"'
  const line = (x1: number, y1: number, x2: number, y2: number) => `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#111" stroke-width="4" stroke-linecap="round"/>`
  const poly = (pts: number[][]) => `<polygon points="${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')}" ${A}/>`
  const regular = (nn: number, rot: number) => { const pts: number[][] = []; for (let i = 0; i < nn; i++) { const a = rot + i * 2 * Math.PI / nn; pts.push([cx + Math.sin(a) * r, cy - Math.cos(a) * r]) } return poly(pts) }
  switch (name) {
    case 'circle': return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" ${A}/>`
    case 'oval': return `<ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.68).toFixed(1)}" ${A}/>`
    case 'square': return `<rect x="${(cx - r).toFixed(1)}" y="${(cy - r).toFixed(1)}" width="${s.toFixed(1)}" height="${s.toFixed(1)}" rx="4" ${A}/>`
    case 'rectangle': return `<rect x="${(cx - r).toFixed(1)}" y="${(cy - r * 0.64).toFixed(1)}" width="${s.toFixed(1)}" height="${(s * 0.64).toFixed(1)}" rx="4" ${A}/>`
    case 'triangle': return regular(3, 0)
    case 'pentagon': return regular(5, 0)
    case 'hexagon': return regular(6, Math.PI / 6)
    case 'sphere': return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" ${A}/><ellipse cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" rx="${r.toFixed(1)}" ry="${(r * 0.32).toFixed(1)}" fill="none" stroke="#111" stroke-width="2.5" stroke-dasharray="7 6"/>`
    case 'cube':
    case 'cuboid': {
      const L = name === 'cuboid' ? s * 0.6 : s * 0.56
      const Lh = name === 'cuboid' ? L * 0.66 : L
      const d = s * 0.24
      const bx = cx - (L + d) / 2, by = cy - (Lh + d) / 2
      const fx = bx, fy = by + d, gx = bx + d, gy = by
      let o = `<rect x="${fx.toFixed(1)}" y="${fy.toFixed(1)}" width="${L.toFixed(1)}" height="${Lh.toFixed(1)}" ${A}/>`
      o += `<rect x="${gx.toFixed(1)}" y="${gy.toFixed(1)}" width="${L.toFixed(1)}" height="${Lh.toFixed(1)}" ${A}/>`
      o += line(fx, fy, gx, gy) + line(fx + L, fy, gx + L, gy) + line(fx, fy + Lh, gx, gy + Lh) + line(fx + L, fy + Lh, gx + L, gy + Lh)
      return o
    }
    case 'cylinder': {
      const rw = s * 0.36, rh = s * 0.13, bh = s * 0.62
      const tY = cy - bh / 2, bY = cy + bh / 2
      let o = `<ellipse cx="${cx.toFixed(1)}" cy="${bY.toFixed(1)}" rx="${rw.toFixed(1)}" ry="${rh.toFixed(1)}" ${A}/>`
      o += line(cx - rw, tY, cx - rw, bY) + line(cx + rw, tY, cx + rw, bY)
      o += `<ellipse cx="${cx.toFixed(1)}" cy="${tY.toFixed(1)}" rx="${rw.toFixed(1)}" ry="${rh.toFixed(1)}" ${A}/>`
      return o
    }
    case 'cone': {
      const rw = s * 0.36, rh = s * 0.12, apexY = cy - s * 0.42, baseY = cy + s * 0.34
      let o = `<ellipse cx="${cx.toFixed(1)}" cy="${baseY.toFixed(1)}" rx="${rw.toFixed(1)}" ry="${rh.toFixed(1)}" ${A}/>`
      o += line(cx, apexY, cx - rw, baseY) + line(cx, apexY, cx + rw, baseY)
      return o
    }
    case 'pyramid': {
      const apexY = cy - s * 0.4
      const fl = [cx - s * 0.38, cy + s * 0.3], fr = [cx + s * 0.38, cy + s * 0.3]
      const br = [cx + s * 0.16, cy + s * 0.14], bl = [cx - s * 0.16, cy + s * 0.14]
      let o = poly([fl, fr, br, bl])
      o += line(cx, apexY, fl[0], fl[1]) + line(cx, apexY, fr[0], fr[1]) + line(cx, apexY, br[0], br[1])
      return o
    }
    default: return `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${r.toFixed(1)}" ${A}/>`
  }
}

// Grid of shapes to name (write-line under) and/or colour.
function shapeGalleryBlock(names: string[], label: boolean, x: number, top: number, w: number, h: number): string {
  const list = names.slice(0, 4)
  const cols = list.length <= 2 ? list.length : list.length === 3 ? 3 : 2
  const rows = Math.ceil(list.length / cols)
  const cellW = w / cols, cellH = h / rows
  const shapeSize = Math.min(cellW * 0.5, cellH * (label ? 0.56 : 0.72))
  let s = ''
  list.forEach((name, i) => {
    const c = i % cols, rr = Math.floor(i / cols)
    const cx = x + c * cellW + cellW / 2
    const cy = top + rr * cellH + (label ? cellH * 0.42 : cellH * 0.5)
    s += drawShapeSvg(name, cx, cy, shapeSize)
    if (label) {
      const ly = top + rr * cellH + cellH * 0.86
      s += `<line x1="${(cx - cellW * 0.32).toFixed(1)}" y1="${ly.toFixed(1)}" x2="${(cx + cellW * 0.32).toFixed(1)}" y2="${ly.toFixed(1)}" stroke="#d0cabf" stroke-width="3"/>`
    }
  })
  return s
}

// Each row: a shape, then its properties to fill in ("SIDES ▢", "CORNERS ▢",
// or "FACES ▢ / EDGES ▢ / VERTICES ▢"), stacked beside the shape.
function shapePropsBlock(names: string[], dims: string[], x: number, top: number, w: number, h: number): string {
  const list = names.slice(0, 5)
  const rowH = h / list.length
  const shapeSize = Math.min(rowH * 0.72, w * 0.2)
  let s = ''
  list.forEach((name, i) => {
    const rowMid = top + i * rowH + rowH / 2
    s += drawShapeSvg(name, x + shapeSize * 0.6 + 8, rowMid, shapeSize)
    const lineH = Math.min(rowH / (dims.length + 0.6), 46)
    const labelH = Math.min(lineH * 0.62, 34)
    const boxH = labelH * 1.15
    const px = x + w * 0.34
    const startY = rowMid - (dims.length - 1) * lineH / 2
    dims.forEach((dim, j) => {
      const ly = startY + j * lineH
      const lbl = dim.toUpperCase()
      s += textSvg(lbl, px, ly - labelH / 2, labelH, 8)
      const bx = px + textWidth(lbl, labelH) + labelH * 0.5
      s += `<rect x="${bx.toFixed(1)}" y="${(ly - boxH / 2).toFixed(1)}" width="${(boxH * 1.2).toFixed(1)}" height="${boxH.toFixed(1)}" rx="7" fill="none" stroke="#c9c4ba" stroke-width="3"/>`
    })
  })
  return s
}

// Sort shapes into 2D and 3D: a word bank on top, two labelled boxes to write
// each shape name into the right group.
function shapeSortBlock(names: string[], x: number, top: number, w: number, h: number): string {
  const bank = names.map((n) => n.toUpperCase()).join('   ')
  const bankH = Math.min(h * 0.14, 46)
  let bw = textWidth(bank, bankH)
  if (bw > w * 0.96) { /* shrink */ }
  let bankH2 = bankH
  while (textWidth(bank, bankH2) > w * 0.96 && bankH2 > 22) bankH2 -= 2
  bw = textWidth(bank, bankH2)
  let s = textSvg(bank, x + Math.max(0, (w - bw) / 2), top, bankH2, 9, { color: '#9aa0a6' })
  const boxTop = top + bankH2 + h * 0.08
  const boxH = h - (bankH2 + h * 0.08) - 10
  const gap = w * 0.05
  const boxW = (w - gap) / 2
  const labelH = Math.min(boxH * 0.16, 40)
  const mk = (bx: number, lbl: string) => {
    let o = `<rect x="${bx.toFixed(1)}" y="${boxTop.toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" rx="18" fill="none" stroke="#c9c4ba" stroke-width="3"/>`
    o += textSvg(lbl, bx + 24, boxTop + 16, labelH, 9, { color: '#111' })
    return o
  }
  s += mk(x, '2D') + mk(x + boxW + gap, '3D')
  return s
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

// "Count and colour": groups of hollow (colour-in) dots, each with a box to
// write how many. Colour + count in one deterministic block.
function countObjectsBlock(count: number, maxCount: number, x: number, top: number, w: number, h: number, salt = 0): string {
  const n = Math.max(2, Math.min(8, Math.round(count)))
  const maxC = Math.max(2, Math.min(12, Math.round(maxCount)))
  const rng = makeRng(n * 53 + maxC * 131 + salt * 7919)
  const groups = Array.from({ length: n }, () => 1 + Math.floor(rng() * maxC))
  const cols = n <= 4 ? n : Math.ceil(n / 2)
  const rows = Math.ceil(n / cols)
  const cellW = w / cols
  const cellH = h / rows
  let s = ''
  groups.forEach((g, i) => {
    const c = i % cols, r = Math.floor(i / cols)
    const cx = x + c * cellW + cellW / 2
    const cyTop = top + r * cellH
    // dots grid (up to 5 per row)
    const per = Math.min(g, 5)
    const dRows = Math.ceil(g / per)
    const dotArea = cellH * 0.62
    const rad = Math.max(9, Math.min(26, dotArea / (dRows * 2.6), cellW * 0.8 / (per * 2.6)))
    const step = rad * 2.5
    const gridTop = cyTop + (dotArea - (dRows * step - (step - rad * 2))) / 2
    for (let k = 0; k < g; k++) {
      const rr = Math.floor(k / per), cc = k % per
      const rowN = Math.min(per, g - rr * per)
      const dx = cx - (rowN - 1) * step / 2 + cc * step
      const dy = gridTop + rad + rr * step
      s += `<circle cx="${dx.toFixed(1)}" cy="${dy.toFixed(1)}" r="${rad.toFixed(1)}" fill="none" stroke="#111" stroke-width="4"/>`
    }
    // answer box beneath the group
    const boxH = Math.min(cellH * 0.24, 90)
    const boxW = boxH * 1.1
    s += `<rect x="${(cx - boxW / 2).toFixed(1)}" y="${(cyTop + cellH - boxH - 6).toFixed(1)}" width="${boxW.toFixed(1)}" height="${boxH.toFixed(1)}" rx="10" fill="none" stroke="#c9c4ba" stroke-width="3"/>`
  })
  return s
}

// "Trace the numbers": dotted numerals 1..N to write over, on baselines.
function traceNumbersBlock(upTo: number, x: number, top: number, w: number, h: number): string {
  const N = Math.max(3, Math.min(20, Math.round(upTo)))
  const nums = Array.from({ length: N }, (_, i) => String(i + 1))
  const perRow = N <= 10 ? Math.min(N, 5) : Math.ceil(N / Math.ceil(N / 6))
  const rows = Math.ceil(N / perRow)
  const cellW = w / perRow
  const rowH = h / rows
  const gh = Math.max(40, Math.min(rowH * 0.6, cellW * 0.5, 150))
  let s = ''
  nums.forEach((num, i) => {
    const c = i % perRow, r = Math.floor(i / perRow)
    const cx = x + c * cellW
    const yTop = top + r * rowH + (rowH - gh) / 2
    const nw = numberWidth(num, gh)
    const baseY = yTop + gh + gh * 0.06
    s += `<line x1="${(cx + cellW * 0.1).toFixed(1)}" y1="${baseY.toFixed(1)}" x2="${(cx + cellW * 0.9).toFixed(1)}" y2="${baseY.toFixed(1)}" stroke="#e0dbd0" stroke-width="3"/>`
    s += numberSvg(num, cx + (cellW - nw) / 2, yTop, gh, Math.max(6, gh * 0.14), { dashed: true, color: '#9aa0a6' })
  })
  return s
}

// "Count and colour" using the topic's OWN pictures: each cell shows K copies
// of one object with a box to write how many. Stays on-topic (count the moons,
// the lanterns…) and reuses thumbnails already generated for the sheet.
async function countPicturesBlock(
  entries: { buf: Buffer; count: number }[],
  x: number,
  top: number,
  w: number,
  h: number
): Promise<{ svg: string; composites: sharp.OverlayOptions[] }> {
  const n = entries.length
  if (!n) return { svg: '', composites: [] }
  const cols = Math.min(n, 4)
  const rows = Math.ceil(n / cols)
  const cellW = w / cols
  const cellH = h / rows
  const boxH = Math.min(64, cellH * 0.2)
  const gapBox = 14
  let svg = ''
  const composites: sharp.OverlayOptions[] = []
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = Math.floor(i / cols)
    const cellX = x + c * cellW
    const cellY = top + r * cellH
    const K = Math.max(2, Math.min(5, entries[i].count))
    const gapT = 8
    // Thumbnails as big as fit across the cell, and within the picture budget.
    const picBudget = cellH - boxH - gapBox
    const t = Math.max(24, Math.floor(Math.min(picBudget * 0.96, (cellW * 0.92 - (K - 1) * gapT) / K)))
    const thumb = await sharp(entries[i].buf).greyscale().resize(t, t, { fit: 'inside', background: '#ffffff' }).flatten({ background: '#ffffff' }).toBuffer()
    const tm = await sharp(thumb).metadata()
    const tw = tm.width || t, thh = tm.height || t
    // Group the K pictures and the answer box as ONE unit, centred in the cell.
    const unitH = thh + gapBox + boxH
    const unitTop = cellY + Math.max(0, (cellH - unitH) / 2)
    const rowW = K * tw + (K - 1) * gapT
    const startX = cellX + (cellW - rowW) / 2
    for (let k = 0; k < K; k++) {
      composites.push({ input: thumb, left: Math.round(startX + k * (tw + gapT)), top: Math.round(unitTop) })
    }
    const bw = boxH * 1.3
    const bx = cellX + (cellW - bw) / 2
    const by = unitTop + thh + gapBox
    svg += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${boxH.toFixed(1)}" rx="10" fill="none" stroke="#c9c4ba" stroke-width="3"/>`
  }
  return { svg, composites }
}

// Draw a digital time label "H:MM" centred at (cx, midY) using the glyph font
// (the font has no colon, so draw it as two dots).
function timeLabelSvg(hour: number, minute: number, cx: number, midY: number, gh: number): string {
  const hs = String(hour)
  const ms = minute < 10 ? `0${minute}` : String(minute)
  const colonW = gh * 0.34
  const gap = gh * 0.12
  const total = numberWidth(hs, gh) + gap + colonW + gap + numberWidth(ms, gh)
  let px = cx - total / 2
  const yTop = midY - gh / 2
  const st = Math.max(5, gh * 0.13)
  let s = numberSvg(hs, px, yTop, gh, st)
  px += numberWidth(hs, gh) + gap
  const dotR = Math.max(2.5, gh * 0.07)
  const colX = px + colonW / 2
  s += `<circle cx="${colX.toFixed(1)}" cy="${(yTop + gh * 0.34).toFixed(1)}" r="${dotR.toFixed(1)}" fill="#111"/>`
  s += `<circle cx="${colX.toFixed(1)}" cy="${(yTop + gh * 0.66).toFixed(1)}" r="${dotR.toFixed(1)}" fill="#111"/>`
  px += colonW + gap
  s += numberSvg(ms, px, yTop, gh, st)
  return s
}

// One analogue clock face at (cx, cy) radius r. Hands are drawn only when
// `hands` is true (read-the-clock); otherwise the face is left empty for the
// child to draw them (draw-the-hands).
function clockFaceSvg(cx: number, cy: number, r: number, hour: number, minute: number, hands: boolean): string {
  const P = (n: number) => n.toFixed(1)
  let s = `<circle cx="${P(cx)}" cy="${P(cy)}" r="${P(r)}" fill="none" stroke="#111" stroke-width="${Math.max(3, r * 0.045)}"/>`
  // Minute ticks (long every 5).
  for (let m = 0; m < 60; m++) {
    const a = (m / 60) * 2 * Math.PI
    const outer = r * 0.96
    const inner = m % 5 === 0 ? r * 0.86 : r * 0.92
    const sw = m % 5 === 0 ? Math.max(2, r * 0.03) : Math.max(1, r * 0.015)
    s += `<line x1="${P(cx + Math.sin(a) * inner)}" y1="${P(cy - Math.cos(a) * inner)}" x2="${P(cx + Math.sin(a) * outer)}" y2="${P(cy - Math.cos(a) * outer)}" stroke="#111" stroke-width="${sw}"/>`
  }
  // Hour numbers 1..12.
  const gh = r * 0.24
  for (let i = 1; i <= 12; i++) {
    const a = (i / 12) * 2 * Math.PI
    const nx = cx + Math.sin(a) * r * 0.72
    const ny = cy - Math.cos(a) * r * 0.72
    const str = String(i)
    s += numberSvg(str, nx - numberWidth(str, gh) / 2, ny - gh / 2, gh, Math.max(3, gh * 0.14))
  }
  if (hands) {
    const ma = (minute / 60) * 2 * Math.PI
    const ha = ((hour % 12) / 12 + minute / 720) * 2 * Math.PI
    const hand = (ang: number, len: number, sw: number) =>
      `<line x1="${P(cx)}" y1="${P(cy)}" x2="${P(cx + Math.sin(ang) * len)}" y2="${P(cy - Math.cos(ang) * len)}" stroke="#111" stroke-width="${sw}" stroke-linecap="round"/>`
    s += hand(ha, r * 0.5, Math.max(4, r * 0.06))
    s += hand(ma, r * 0.8, Math.max(3, r * 0.045))
  }
  s += `<circle cx="${P(cx)}" cy="${P(cy)}" r="${Math.max(3, r * 0.05).toFixed(1)}" fill="#111"/>`
  return s
}

// "Telling the time": a row of analogue clocks. read = clock shows a time and
// the child writes it; draw = the time is printed and the child draws the hands.
// Times are generated to match the age level. Deterministic — never the model.
function clocksBlock(
  mode: 'read' | 'draw',
  level: 'oclock' | 'half' | 'quarter' | 'five',
  count: number,
  x: number,
  top: number,
  w: number,
  h: number,
  salt = 0
): string {
  const n = Math.max(2, Math.min(6, Math.round(count)))
  const rng = makeRng(n * 71 + (mode === 'read' ? 3 : 5) + level.length * 13 + salt * 7919)
  const ri = (min: number, max: number) => min + Math.floor(rng() * (max - min + 1))
  const minutesFor = (): number => {
    if (level === 'oclock') return 0
    if (level === 'half') return [0, 30][ri(0, 1)]
    if (level === 'quarter') return [0, 15, 30, 45][ri(0, 3)]
    return ri(0, 11) * 5
  }
  const times: { h: number; m: number }[] = []
  const seen = new Set<string>()
  let guard = 0
  while (times.length < n && guard++ < n * 40) {
    const t = { h: ri(1, 12), m: minutesFor() }
    const key = `${t.h}:${t.m}`
    if (seen.has(key)) continue
    seen.add(key)
    times.push(t)
  }

  const cols = Math.min(n, n <= 3 ? n : 3)
  const rows = Math.ceil(n / cols)
  const cellW = w / cols
  const cellH = h / rows
  const labelH = Math.min(64, cellH * 0.22)
  const faceArea = cellH - labelH - 8
  const r = Math.max(28, Math.min(cellW * 0.42, faceArea * 0.46))
  let s = ''
  times.forEach((t, i) => {
    const c = i % cols, row = Math.floor(i / cols)
    const cellX = x + c * cellW
    const cellY = top + row * cellH
    const cx = cellX + cellW / 2
    // Read: hands on the face, blank line below to write the time.
    // Draw: empty face, printed time below to draw the hands for.
    const faceCy = cellY + (mode === 'draw' ? faceArea * 0.5 : faceArea * 0.5) + 4
    s += clockFaceSvg(cx, faceCy, r, t.h, t.m, mode === 'read')
    const labY = cellY + faceArea + 8
    if (mode === 'read') {
      s += `<line x1="${(cx - r * 0.85).toFixed(1)}" y1="${(labY + labelH * 0.7).toFixed(1)}" x2="${(cx + r * 0.85).toFixed(1)}" y2="${(labY + labelH * 0.7).toFixed(1)}" stroke="#c9c4ba" stroke-width="3"/>`
    } else {
      s += timeLabelSvg(t.h, t.m, cx, labY + labelH * 0.5, Math.min(labelH * 0.9, r * 0.6))
    }
  })
  return s
}

const ACTIVITY_WEIGHT: Record<string, number> = {
  note: 0.6, pictures: 4.4, circleWords: 1.8, traceWords: 1.6,
  wordSearch: 2.6, readWords: 1.8, writeLines: 1.4, sentence: 1.4, sums: 3.2,
  countObjects: 2.6, countPictures: 3, traceNumbers: 1.8, clocks: 3.2,
  timesTable: 3.6, multiplyGroups: 4.2,
  tenFrame: 3.8, partWhole: 0.9, bonds: 3,
  shapeGallery: 3.4, shapeProps: 3.6, shapeSort: 3.2,
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
  genPicture?: (obj: string) => Promise<Buffer | null>,
  // Fires as each unique object finishes so the caller can show honest progress
  // during the (otherwise silent) picture-generation phase.
  onPicProgress?: (done: number, total: number) => void
): Promise<Buffer> {
  // Every sheet renders ALL its activities — free and Pro are identical in
  // content. Quality is for everyone; Pro is more sheets, not better ones.
  const acts = activities.slice(0, 6)
  const bodyX = MARGIN
  const bodyW = A4_W - MARGIN * 2

  // Every picture-based block (colour-and-label, count-the-pictures) draws the
  // topic's own objects. Generate each unique object ONCE (parallel) into a
  // shared map so both block types reuse the same thumbnail — no double cost.
  const needsPic = (a: Activity): a is Extract<Activity, { items: string[] }> =>
    a.type === 'pictures' || a.type === 'countPictures'
  const picNeeds = new Set<string>()
  for (const a of acts) if (needsPic(a)) a.items.slice(0, 4).forEach((o) => picNeeds.add(o))

  const picMap = new Map<string, Buffer>()
  if (genPicture && picNeeds.size) {
    // Hard cap on how many pictures we ever generate for one sheet. A broad
    // topic can otherwise fan out into a dozen parallel model calls and stall
    // the job near the end. Four reads as a full colouring sheet and — paired
    // with the process route's concurrency pool of 4 — completes in a SINGLE
    // generation wave, roughly halving wall-clock vs. the old 6.
    const MAX_OBJECTS = 4
    const names = [...picNeeds].slice(0, MAX_OBJECTS)
    let done = 0
    const results = await Promise.all(
      names.map(async (o) => {
        const b = await genPicture(o).catch(() => null)
        onPicProgress?.(++done, names.length)
        return b
      })
    )
    names.forEach((o, i) => { if (results[i]) picMap.set(o, results[i]!) })
  }
  const picsFor = (a: Extract<Activity, { items: string[] }>): Buffer[] =>
    a.items.slice(0, 4).map((o) => picMap.get(o)).filter((b): b is Buffer => b != null)
  // Drop a picture-based block if none of its objects rendered.
  const live = acts.filter((a) => !needsPic(a) || picsFor(a).length > 0)

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
          const { svg: ps, composites: comps } = await picturesRowBlock(picsFor(a), !!a.label, bodyX, nextY, bodyW, ch)
          overlay += ps
          composites.push(...comps)
          break
        }
        case 'countPictures': {
          // Count the topic's own pictures: each group is K copies of one object
          // with a box to write how many. Counts are stable per block/position.
          const bufs = picsFor(a)
          const entries = bufs.map((buf, i) => ({ buf, count: 2 + ((blockIndex * 7 + i * 3) % 4) }))
          const { svg: cs, composites: comps } = await countPicturesBlock(entries, bodyX, nextY, bodyW, ch)
          overlay += cs
          composites.push(...comps)
          break
        }
        case 'clocks': overlay += clocksBlock(a.mode, a.level, a.count, bodyX, nextY, bodyW, ch, blockIndex); break
        case 'circleWords': overlay += circleWordsBlock(a.words, bodyX, nextY, bodyW, ch); break
        case 'traceWords': overlay += traceWordsBlock(a.words, '', bodyX, nextY, bodyW, ch); break
        case 'wordSearch': overlay += miniWordSearchBlock(a.words, bodyX, nextY, bodyW, ch); break
        case 'readWords': overlay += readWordsBlock(a.words.map(up), bodyX, nextY, bodyW, ch); break
        case 'writeLines': overlay += writeLinesBlock(a.count, bodyX, nextY, bodyW, ch); break
        case 'sentence': overlay += sentenceLinesBlock(a.lines, bodyX, nextY, bodyW, ch); break
        case 'sums': overlay += sumsBlock(a.op, a.maxValue, a.count, !!a.dots, bodyX, nextY, bodyW, ch, blockIndex); break
        case 'timesTable': overlay += timesTableBlock(a.table, a.upTo, a.op, a.shuffle, bodyX, nextY, bodyW, ch, blockIndex); break
        case 'multiplyGroups': overlay += multiplyGroupsBlock(a.table, a.upTo, bodyX, nextY, bodyW, ch); break
        case 'tenFrame': overlay += tenFrameBlock(a.whole, a.count, bodyX, nextY, bodyW, ch, blockIndex); break
        case 'partWhole': overlay += partWholeBlock(a.whole, a.count, bodyX, nextY, bodyW, ch, blockIndex); break
        case 'bonds': overlay += bondsBlock(a.whole, a.count, a.style, bodyX, nextY, bodyW, ch, blockIndex); break
        case 'shapeGallery': overlay += shapeGalleryBlock(a.shapes, a.label, bodyX, nextY, bodyW, ch); break
        case 'shapeProps': overlay += shapePropsBlock(a.shapes, a.dims, bodyX, nextY, bodyW, ch); break
        case 'shapeSort': overlay += shapeSortBlock(a.shapes, bodyX, nextY, bodyW, ch); break
        case 'countObjects': overlay += countObjectsBlock(a.count, a.maxCount, bodyX, nextY, bodyW, ch, blockIndex); break
        case 'traceNumbers': overlay += traceNumbersBlock(a.upTo, bodyX, nextY, bodyW, ch); break
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
