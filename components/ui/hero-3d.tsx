/**
 * Decorative 3D-style objects for the landing hero (sphere, cube, colouring
 * pencil, doodle). Pure SVG, no assets. Sits behind the content (pointer-events
 * none, aria-hidden) and is placed in the margins so it never covers the
 * headline or the generator card. Hidden on small screens.
 */
export function Hero3D() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0" aria-hidden="true">
      <svg width="0" height="0" className="absolute">
        <defs>
          <radialGradient id="h3d-sphere" cx="34%" cy="26%" r="82%">
            <stop offset="0" stopColor="#fff" />
            <stop offset="14%" stopColor="#FFE3A8" />
            <stop offset="55%" stopColor="#F2A81E" />
            <stop offset="100%" stopColor="#A96A05" />
          </radialGradient>
          <radialGradient id="h3d-hl" cx="30%" cy="22%" r="28%">
            <stop offset="0" stopColor="#fff" stopOpacity="0.95" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="h3d-cT" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#5FE6CE" /><stop offset="1" stopColor="#31B79E" />
          </linearGradient>
          <linearGradient id="h3d-cL" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#33A18C" /><stop offset="1" stopColor="#22806E" />
          </linearGradient>
          <linearGradient id="h3d-cR" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#2B8B77" /><stop offset="1" stopColor="#186253" />
          </linearGradient>
          <linearGradient id="h3d-pen" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#FF9077" /><stop offset="46%" stopColor="#FF6A4D" /><stop offset="100%" stopColor="#D9482C" />
          </linearGradient>
        </defs>
      </svg>

      {/* glossy gold sphere — top-right gutter (desktop only, fully in view so it
          never crops at the screen edge; mobile stays clean) */}
      <svg className="absolute hidden lg:block w-28 right-[2%] top-[8%] xl:w-40 h3d-float" viewBox="0 0 200 200"
        style={{ filter: 'drop-shadow(0 24px 26px rgba(0,0,0,.45))' }}>
        <ellipse cx="100" cy="184" rx="60" ry="12" fill="#000" opacity=".3" />
        <circle cx="100" cy="94" r="80" fill="url(#h3d-sphere)" />
        <ellipse cx="74" cy="64" rx="24" ry="18" fill="url(#h3d-hl)" />
      </svg>

      {/* colouring pencil — top-left gutter (desktop only, fully in view so it
          isn't clipped mid-air at the screen edge; mobile stays clean) */}
      <svg className="absolute hidden lg:block w-20 left-[3%] top-[6%] xl:w-28 h3d-float-slow" viewBox="0 0 200 210"
        style={{ filter: 'drop-shadow(0 22px 24px rgba(0,0,0,.45))' }}>
        <g transform="rotate(34 100 105)">
          <path d="M92 184 L108 184 L100 200 Z" fill="#7E2A18" />
          <path d="M86 160 L114 160 L108 184 L92 184 Z" fill="#EBCB9B" />
          <path d="M100 160 L114 160 L108 184 L100 184 Z" fill="#D3AF7C" />
          <rect x="84" y="34" width="32" height="126" rx="9" fill="url(#h3d-pen)" />
          <rect x="89" y="34" width="7" height="126" fill="#fff" opacity=".3" />
          <path d="M84 43 Q84 34 93 34 L107 34 Q116 34 116 43 L116 46 L84 46 Z" fill="#C6402A" />
        </g>
      </svg>

      {/* teal cube — mid left, beside the card (desktop only) */}
      <svg className="absolute hidden lg:block left-[4%] top-[46%] w-20 xl:w-28 h3d-float" viewBox="0 0 200 210"
        style={{ filter: 'drop-shadow(0 22px 24px rgba(0,0,0,.45))' }}>
        <ellipse cx="100" cy="196" rx="56" ry="12" fill="#000" opacity=".28" />
        <path d="M100 20 L180 62 L100 104 L20 62 Z" fill="url(#h3d-cT)" />
        <path d="M20 62 L100 104 L100 188 L20 146 Z" fill="url(#h3d-cL)" />
        <path d="M180 62 L100 104 L100 188 L180 146 Z" fill="url(#h3d-cR)" />
      </svg>

      {/* gold doodle — mid right, beside the card (desktop only) */}
      <svg className="absolute hidden lg:block right-[5%] top-[50%] w-24 xl:w-32 h3d-float-slow" viewBox="0 0 170 90"
        fill="none" stroke="#F2A81E" strokeWidth="6" strokeLinecap="round">
        <path d="M8 52 C 20 14 58 12 60 44 C 61 66 34 66 38 46 C 42 28 78 26 92 46 C 103 61 128 60 160 30" />
      </svg>
    </div>
  )
}
