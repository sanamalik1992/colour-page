/**
 * Hero before/after: a small "photo" of a subject → arrow → the generated
 * line-art colouring page, so a first-time visitor understands (and believes)
 * what the tool does at a glance. Pure inline SVG, no external assets — the same
 * teddy is drawn twice, once in soft colour (the "photo") and once as the bold
 * black-outline line art the product actually outputs. Mobile-first: a compact
 * horizontal row that scales up on larger screens.
 *
 * To use a REAL photo pair instead, swap each panel's <Teddy…> for an <img>
 * (a real photo on the left, its generated line-art PNG on the right).
 */
import type { ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'

type Palette = {
  fur: string
  furStroke: string
  light: string
  lightStroke: string
  ink: string
  strokeW: number
  lightW: number
}

// Soft, warm colour — reads as a snapshot.
const PHOTO: Palette = { fur: '#C68A4E', furStroke: '#A9743A', light: '#ECC79B', lightStroke: '#D9AE7C', ink: '#3A2416', strokeW: 1, lightW: 1 }
// White fill, bold black outline — the product's real colouring-page output.
const INK: Palette = { fur: '#ffffff', furStroke: '#141414', light: '#ffffff', lightStroke: '#141414', ink: '#141414', strokeW: 2.4, lightW: 1.8 }

function Teddy({ p }: { p: Palette }) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" role="img" aria-hidden="true">
      {/* legs */}
      <ellipse cx="37" cy="90" rx="9" ry="7" fill={p.fur} stroke={p.furStroke} strokeWidth={p.strokeW} />
      <ellipse cx="63" cy="90" rx="9" ry="7" fill={p.fur} stroke={p.furStroke} strokeWidth={p.strokeW} />
      {/* arms */}
      <ellipse cx="25" cy="64" rx="8" ry="11" fill={p.fur} stroke={p.furStroke} strokeWidth={p.strokeW} />
      <ellipse cx="75" cy="64" rx="8" ry="11" fill={p.fur} stroke={p.furStroke} strokeWidth={p.strokeW} />
      {/* body */}
      <ellipse cx="50" cy="72" rx="23" ry="21" fill={p.fur} stroke={p.furStroke} strokeWidth={p.strokeW} />
      {/* belly */}
      <ellipse cx="50" cy="74" rx="13" ry="14" fill={p.light} stroke={p.lightStroke} strokeWidth={p.lightW} />
      {/* ears */}
      <circle cx="33" cy="24" r="8" fill={p.fur} stroke={p.furStroke} strokeWidth={p.strokeW} />
      <circle cx="67" cy="24" r="8" fill={p.fur} stroke={p.furStroke} strokeWidth={p.strokeW} />
      <circle cx="33" cy="24" r="4" fill={p.light} stroke={p.lightStroke} strokeWidth={p.lightW} />
      <circle cx="67" cy="24" r="4" fill={p.light} stroke={p.lightStroke} strokeWidth={p.lightW} />
      {/* head */}
      <circle cx="50" cy="38" r="21" fill={p.fur} stroke={p.furStroke} strokeWidth={p.strokeW} />
      {/* muzzle */}
      <ellipse cx="50" cy="45" rx="11" ry="8.5" fill={p.light} stroke={p.lightStroke} strokeWidth={p.lightW} />
      {/* eyes */}
      <circle cx="42" cy="35" r="2.6" fill={p.ink} />
      <circle cx="58" cy="35" r="2.6" fill={p.ink} />
      {/* nose + mouth */}
      <ellipse cx="50" cy="41" rx="3.4" ry="2.5" fill={p.ink} />
      <path d="M50 43.5 L50 47 M50 47 Q45.5 49.5 43 47 M50 47 Q54.5 49.5 57 47" fill="none" stroke={p.ink} strokeWidth={p.lightW} strokeLinecap="round" />
    </svg>
  )
}

function Panel({ label, tone, children }: { label: string; tone: 'photo' | 'ink'; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className={`w-24 h-24 sm:w-36 sm:h-36 rounded-2xl overflow-hidden ring-1 ring-black/10 shadow-lg p-2 ${
          tone === 'photo' ? '' : 'bg-white'
        }`}
        style={tone === 'photo' ? { background: 'radial-gradient(circle at 50% 34%, #fdf0d8, #f0d3a6)' } : undefined}
      >
        {children}
      </div>
      <span className="text-[11px] sm:text-xs font-semibold text-gray-300">{label}</span>
    </div>
  )
}

export function BeforeAfter() {
  return (
    <div className="mb-7 flex items-center justify-center gap-3 sm:gap-5">
      <Panel label="Your photo" tone="photo">
        <Teddy p={PHOTO} />
      </Panel>
      <ArrowRight className="w-5 h-5 sm:w-7 sm:h-7 text-brand-glow shrink-0" aria-hidden="true" />
      <Panel label="Colouring page" tone="ink">
        <Teddy p={INK} />
      </Panel>
    </div>
  )
}
