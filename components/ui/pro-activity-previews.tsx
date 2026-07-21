'use client'

/**
 * Little worksheet-style thumbnails that show, at a glance, the extra activities
 * Pro adds to a learning sheet. Pure SVG — always crisp, no generation cost.
 *
 * They reflect what was actually searched: pass the grapheme/topic `token`
 * (e.g. "SH", "B", "SPACE") and its related `words` (e.g. ship, shark…) and the
 * mock activities fill in with that content. Bright, sticker-like styling makes
 * the upgrade feel fun rather than clinical.
 */

const FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif'
const BRIGHTS = ['#F472B6', '#2DD4BF', '#F2A81E', '#A78BFA', '#38BDF8', '#FB7185']

const clean = (s: string) => (s || '').toUpperCase().replace(/[^A-Z]/g, '')
const txt = (x: number, y: number, s: string, size = 11, fill = '#111', weight = 700, opacity = 1) =>
  `<text x="${x}" y="${y}" font-family="${FONT}" font-weight="${weight}" font-size="${size}" fill="${fill}" fill-opacity="${opacity}" text-anchor="middle">${s}</text>`

// Rounded header chip carrying the searched token.
function chip(token: string): string {
  const len = Math.max(1, token.length)
  const size = len <= 2 ? 15 : len <= 4 ? 11 : len <= 6 ? 9 : 7
  const w = Math.max(30, size * len * 0.72 + 18)
  const x = 60 - w / 2
  return (
    `<rect x="${x.toFixed(1)}" y="7" width="${w.toFixed(1)}" height="23" rx="11.5" fill="#FEF3E0" stroke="#F2A81E" stroke-width="1.5"/>` +
    txt(60, 24, token, size, '#B26A00', 800)
  )
}

// Four decorative confetti dots per card, coloured by seed.
function confetti(seed: number): string {
  const pts = [[13, 132], [107, 42], [104, 128], [16, 44]]
  return pts.map((p, i) => `<circle cx="${p[0]}" cy="${p[1]}" r="2.6" fill="${BRIGHTS[(i + seed) % BRIGHTS.length]}"/>`).join('')
}

function star(cx: number, cy: number, c: string): string {
  return `<path d="M0 -5 L1.5 -1.5 L5 -1.5 L2 1 L3 5 L0 2.5 L-3 5 L-2 1 L-5 -1.5 L-1.5 -1.5 Z" transform="translate(${cx},${cy}) scale(1.3)" fill="${c}"/>`
}

function letterHunt(token: string): string {
  const c = clean(token)
  // A phonics grapheme (≤3 letters) is hunted whole; a longer topic word hunts
  // just its first letter so cells stay a single, sensible glyph.
  const hunt = (c.length <= 3 ? c : c[0]) || 'A'
  const distract = 'ABCDEFGKMNPRTUVWXY'.split('')
  const hits = new Set([1, 4, 6, 8])
  let s = chip(token) + confetti(0) + star(104, 128, BRIGHTS[0])
  for (let i = 0; i < 9; i++) {
    const r = Math.floor(i / 3)
    const c = i % 3
    const x = 30 + c * 30
    const y = 62 + r * 28
    const hit = hits.has(i)
    const ch = hit ? hunt : distract[(i * 5 + 2) % distract.length]
    if (hit) s += `<circle cx="${x}" cy="${y - 4}" r="13" fill="none" stroke="${BRIGHTS[i % BRIGHTS.length]}" stroke-width="2.6"/>`
    s += txt(x, y, ch, ch.length > 1 ? 10 : 12)
  }
  return s
}

function traceWords(token: string, words: string[]): string {
  const wl = (words.length ? words : [token]).map(clean).filter(Boolean).slice(0, 4)
  const rows = wl.length ? wl : [clean(token) || 'FUN']
  let s = chip(token) + confetti(1)
  rows.forEach((w, i) => {
    const y = 56 + i * 24
    const col = BRIGHTS[i % BRIGHTS.length]
    const size = Math.min(15, Math.max(8, 150 / Math.max(3, w.length)))
    s += `<line x1="16" y1="${y + 7}" x2="104" y2="${y + 7}" stroke="#ece8e0" stroke-width="1.5"/>`
    s += txt(60, y + 4, w, size, col, 800, 0.42)
  })
  return s
}

function wordSearch(token: string, words: string[]): string {
  const wl = (words.length ? words : [token]).map(clean).filter(Boolean)
  const target = (wl[0] || clean(token) || 'FUN').slice(0, 6)
  const pool = 'ABCDEFGHIKLMNOPRSTUVW'
  const gx = 24
  const gy = 50
  const step = 13
  const hitRow = 1
  let s = chip(token) + confetti(2)
  s += `<rect x="15" y="35" width="90" height="90" rx="7" fill="none" stroke="#e5e0d6" stroke-width="1.5"/>`
  // highlight the hidden word
  s += `<rect x="${gx - 7}" y="${gy + hitRow * step - 9}" width="${target.length * step}" height="15" rx="7.5" fill="${BRIGHTS[2]}" fill-opacity="0.28"/>`
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 6; c++) {
      const ch = r === hitRow && c < target.length ? target[c] : pool[(r * 6 + c * 5 + 3) % pool.length]
      s += txt(gx + c * step, gy + r * step, ch, 8, '#3a3a3a')
    }
  }
  return s
}

function writeSentence(token: string): string {
  let s = chip(token) + confetti(3) + star(15, 46, BRIGHTS[3])
  s += txt(60, 52, 'WRITE', 9, '#111', 800)
  for (let i = 0; i < 4; i++) s += `<line x1="16" y1="${72 + i * 20}" x2="104" y2="${72 + i * 20}" stroke="#d0cabf" stroke-width="2"/>`
  s += `<g transform="translate(78,94) rotate(35)"><rect x="0" y="0" width="8" height="34" rx="1.5" fill="#F2A81E"/><path d="M0 34 L4 42 L8 34 Z" fill="#2A1E00"/><rect x="0" y="0" width="8" height="6" rx="1.5" fill="#D98A0C"/></g>`
  return s
}

function Thumb({ title, inner }: { title: string; inner: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-full aspect-[3/4] rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <svg viewBox="0 0 120 160" className="w-full h-full" role="img" aria-label={title} dangerouslySetInnerHTML={{ __html: inner }} />
      </div>
      <span className="text-[11px] font-semibold text-gray-300 text-center leading-tight">{title}</span>
    </div>
  )
}

export function ProActivityPreviews({ token, words }: { token?: string; words?: string[] }) {
  const tk = clean(token || '').slice(0, 8) || 'SH'
  const ws = (words || []).map(clean).filter(Boolean)
  return (
    <div className="grid grid-cols-4 gap-3">
      <Thumb title="Letter hunt" inner={letterHunt(tk)} />
      <Thumb title="Trace the words" inner={traceWords(tk, ws)} />
      <Thumb title="Word search" inner={wordSearch(tk, ws)} />
      <Thumb title="Write a sentence" inner={writeSentence(tk)} />
    </div>
  )
}
