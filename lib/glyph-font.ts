/**
 * Font-free vector glyphs for A-Z and 0-9.
 *
 * Flux (and any diffusion model) renders letters and numbers unreliably, so for
 * the "letter X" and "numbers to N" learning sheets we draw the actual glyph
 * ourselves. These are single-stroke skeletons on a 6 (wide) x 10 (tall) grid,
 * stroked thick — clean, legible and traceable — and they render identically on
 * any server because they're plain SVG paths (no font files, which don't exist
 * in the serverless image renderer).
 */

// Digits 0-9 (shared shapes with the dot-to-dot numberer, on the same grid).
const DIGITS: Record<string, string> = {
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

// Uppercase A-Z, single-stroke skeletons on the same 6x10 grid.
const LETTERS: Record<string, string> = {
  A: 'M0.8,9.5 L3,0.5 L5.2,9.5 M1.7,6.4 L4.3,6.4',
  B: 'M1.2,0.5 L1.2,9.5 M1.2,0.5 L3.6,0.5 C5.4,0.5 5.4,4.6 3.6,4.6 L1.2,4.6 M1.2,4.6 L3.8,4.6 C5.7,4.6 5.7,9.5 3.6,9.5 L1.2,9.5',
  C: 'M5,1.9 C3.8,0.2 1,0.5 1,5 C1,9.5 3.8,9.8 5,8.1',
  D: 'M1.2,0.5 L1.2,9.5 M1.2,0.5 L3.1,0.5 C5.5,0.5 5.5,9.5 3.1,9.5 L1.2,9.5',
  E: 'M5,0.5 L1.2,0.5 L1.2,9.5 L5,9.5 M1.2,5 L4.3,5',
  F: 'M5,0.5 L1.2,0.5 L1.2,9.5 M1.2,5 L4.3,5',
  G: 'M5,1.9 C3.8,0.2 1,0.5 1,5 C1,9.5 3.9,9.8 5,7.9 L5,5.5 L3.3,5.5',
  H: 'M1.2,0.5 L1.2,9.5 M4.8,0.5 L4.8,9.5 M1.2,5 L4.8,5',
  I: 'M3,0.5 L3,9.5 M1.6,0.5 L4.4,0.5 M1.6,9.5 L4.4,9.5',
  J: 'M4.4,0.5 L4.4,7 C4.4,9.6 1.2,9.6 1.2,7.1',
  K: 'M1.2,0.5 L1.2,9.5 M4.9,0.5 L1.2,5.3 M2.5,4.1 L5,9.5',
  L: 'M1.2,0.5 L1.2,9.5 L5,9.5',
  M: 'M1,9.5 L1,0.5 L3,5 L5,0.5 L5,9.5',
  N: 'M1.2,9.5 L1.2,0.5 L4.8,9.5 L4.8,0.5',
  O: 'M3,0.5 C0.9,0.5 0.9,9.5 3,9.5 C5.1,9.5 5.1,0.5 3,0.5 Z',
  P: 'M1.2,9.5 L1.2,0.5 L3.6,0.5 C5.5,0.5 5.5,5 3.6,5 L1.2,5',
  Q: 'M3,0.5 C0.9,0.5 0.9,9.5 3,9.5 C5.1,9.5 5.1,0.5 3,0.5 Z M3.5,7.2 L5.3,9.7',
  R: 'M1.2,9.5 L1.2,0.5 L3.6,0.5 C5.5,0.5 5.5,5 3.6,5 L1.2,5 M3.2,5 L5,9.5',
  S: 'M5,1.9 C4,0.2 1,0.2 1,2.8 C1,5.2 5,4.8 5,7.2 C5,9.8 2,9.8 1,8',
  T: 'M0.8,0.5 L5.2,0.5 M3,0.5 L3,9.5',
  U: 'M1.2,0.5 L1.2,6.8 C1.2,9.6 4.8,9.6 4.8,6.8 L4.8,0.5',
  V: 'M0.8,0.5 L3,9.5 L5.2,0.5',
  W: 'M0.6,0.5 L1.8,9.5 L3,3.6 L4.2,9.5 L5.4,0.5',
  X: 'M1,0.5 L5,9.5 M5,0.5 L1,9.5',
  Y: 'M1,0.5 L3,5 L5,0.5 M3,5 L3,9.5',
  Z: 'M1,0.5 L5,0.5 L1,9.5 L5,9.5',
}

export function glyphPath(ch: string): string | null {
  const c = ch.toUpperCase()
  return LETTERS[c] || DIGITS[c] || null
}

/**
 * SVG markup for a single glyph fitted into a box of the given height (px),
 * stroked at ~`stroke` px. Width works out to height * 0.6. Top-left anchored
 * at (left, top).
 */
export function glyphSvg(ch: string, left: number, top: number, height: number, stroke: number): string {
  const d = glyphPath(ch)
  if (!d) return ''
  const scale = height / 10
  const sw = (stroke / scale).toFixed(2)
  return (
    `<path d="${d}" transform="translate(${left.toFixed(1)},${top.toFixed(1)}) scale(${scale.toFixed(4)})" ` +
    `fill="none" stroke="#111111" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`
  )
}

// Rendered width of a glyph at the given height.
export function glyphWidth(height: number): number {
  return height * 0.6
}

// Spacing between digits in a multi-character number, as a fraction of height.
const DIGIT_GAP = 0.18

// Rendered width of a multi-character string (e.g. "10") at the given height.
export function numberWidth(str: string, height: number): number {
  const n = str.length
  return n * glyphWidth(height) + Math.max(0, n - 1) * DIGIT_GAP * height
}

// SVG for a multi-character number, laying each glyph out left to right.
export function numberSvg(str: string, left: number, top: number, height: number, stroke: number): string {
  let out = ''
  let x = left
  const step = glyphWidth(height) + DIGIT_GAP * height
  for (const ch of str) {
    out += glyphSvg(ch, x, top, height, stroke)
    x += step
  }
  return out
}
