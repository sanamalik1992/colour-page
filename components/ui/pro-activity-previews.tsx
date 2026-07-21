'use client'

/**
 * Little worksheet-style thumbnails that show, at a glance, the extra activities
 * Pro adds to a learning sheet. Pure SVG — always crisp, no generation cost.
 * Used on the result screen (after a free sheet) and on the Pro page.
 */

const FONT = 'ui-rounded, "SF Pro Rounded", "Nunito", system-ui, sans-serif'

// A framed card holding one mini activity mock, with a caption.
function Thumb({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-full aspect-[3/4] rounded-xl bg-white border border-zinc-200 shadow-sm overflow-hidden">
        <svg viewBox="0 0 120 160" className="w-full h-full" role="img" aria-label={title}>
          {children}
        </svg>
      </div>
      <span className="text-[11px] font-semibold text-gray-300 text-center leading-tight">{title}</span>
    </div>
  )
}

const t = (x: number, y: number, s: string, size = 11, fill = '#111') =>
  <text x={x} y={y} fontFamily={FONT} fontWeight={700} fontSize={size} fill={fill} textAnchor="middle">{s}</text>

export function ProActivityPreviews() {
  return (
    <div className="grid grid-cols-4 gap-3">
      {/* 1. Letter hunt — grid of letters, some ringed */}
      <Thumb title="Letter hunt">
        <rect width="120" height="160" fill="#fff" />
        {t(60, 26, 'SH', 15)}
        {[['S', 'H', 'K'], ['B', 'SH', 'M'], ['SH', 'R', 'SH']].map((row, r) =>
          row.map((ch, c) => {
            const x = 30 + c * 30
            const y = 62 + r * 30
            const hit = ch === 'SH'
            return (
              <g key={`${r}-${c}`}>
                {hit && <circle cx={x} cy={y - 4} r="13" fill="none" stroke="#F2A81E" strokeWidth="2.5" />}
                {t(x, y, ch, 11)}
              </g>
            )
          })
        )}
      </Thumb>

      {/* 2. Trace the words — dotted words on baselines */}
      <Thumb title="Trace the words">
        <rect width="120" height="160" fill="#fff" />
        {t(60, 24, 'SH', 14)}
        {[0, 1, 2, 3].map((i) => {
          const y = 52 + i * 26
          return (
            <g key={i}>
              <line x1="16" y1={y + 6} x2="104" y2={y + 6} stroke="#e2ded6" strokeWidth="1.5" />
              {[0, 1, 2, 3, 4].map((k) => (
                <line key={k} x1={18 + k * 16} y1={y} x2={28 + k * 16} y2={y} stroke="#b9b9b9" strokeWidth="3" strokeDasharray="2 3" strokeLinecap="round" />
              ))}
            </g>
          )
        })}
      </Thumb>

      {/* 3. Word search — small letter grid */}
      <Thumb title="Word search">
        <rect width="120" height="160" fill="#fff" />
        {t(60, 22, 'SH', 13)}
        <rect x="18" y="32" width="84" height="84" rx="6" fill="none" stroke="#d8d3c9" strokeWidth="2" />
        {Array.from({ length: 6 }).map((_, r) =>
          Array.from({ length: 6 }).map((_, c) => {
            const letters = 'SHIPRKAOEBLMTUVWN'
            const ch = letters[(r * 6 + c * 5 + 3) % letters.length]
            return t(25 + c * 14, 46 + r * 14, ch, 8, '#333')
          })
        )}
        <line x1="16" y1="128" x2="104" y2="128" stroke="#e2ded6" strokeWidth="1.5" />
        <line x1="16" y1="142" x2="104" y2="142" stroke="#e2ded6" strokeWidth="1.5" />
      </Thumb>

      {/* 4. Write a sentence — header + ruled lines + pencil */}
      <Thumb title="Write a sentence">
        <rect width="120" height="160" fill="#fff" />
        {t(60, 26, 'SH', 15)}
        {t(60, 52, 'WRITE', 9, '#111')}
        {[0, 1, 2, 3].map((i) => (
          <line key={i} x1="16" y1={72 + i * 20} x2="104" y2={72 + i * 20} stroke="#d0cabf" strokeWidth="2" />
        ))}
        {/* little pencil */}
        <g transform="translate(78,96) rotate(35)">
          <rect x="0" y="0" width="8" height="34" rx="1.5" fill="#F2A81E" />
          <path d="M0 34 L4 42 L8 34 Z" fill="#2A1E00" />
          <rect x="0" y="0" width="8" height="6" rx="1.5" fill="#D98A0C" />
        </g>
      </Thumb>
    </div>
  )
}
