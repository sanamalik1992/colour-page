'use client'

import { Palette, CircleDot, Printer } from 'lucide-react'

const examples = [
  {
    title: 'Pet Portrait',
    category: 'Photo to Colouring',
    icon: Palette,
    gradient: 'from-brand-primary to-emerald-400',
    svg: (
      <svg viewBox="0 0 100 120" fill="none" stroke="#374151" strokeWidth="1.2" className="w-full h-full">
        {/* Cat outline */}
        <ellipse cx="50" cy="70" rx="30" ry="35" />
        {/* Head */}
        <circle cx="50" cy="35" r="22" />
        {/* Ears */}
        <path d="M33 20 L28 5 L40 15" />
        <path d="M67 20 L72 5 L60 15" />
        {/* Eyes */}
        <ellipse cx="42" cy="32" rx="5" ry="4" />
        <ellipse cx="58" cy="32" rx="5" ry="4" />
        <circle cx="42" cy="32" r="2" fill="#374151" />
        <circle cx="58" cy="32" r="2" fill="#374151" />
        {/* Nose */}
        <path d="M48 38 L50 40 L52 38" />
        {/* Whiskers */}
        <line x1="35" y1="38" x2="20" y2="35" />
        <line x1="35" y1="40" x2="18" y2="42" />
        <line x1="65" y1="38" x2="80" y2="35" />
        <line x1="65" y1="40" x2="82" y2="42" />
        {/* Tail */}
        <path d="M75 80 Q90 60 85 45" strokeWidth="2" />
        {/* Paws */}
        <ellipse cx="38" cy="100" rx="8" ry="5" />
        <ellipse cx="62" cy="100" rx="8" ry="5" />
      </svg>
    ),
  },
  {
    title: 'Butterfly',
    category: 'Print Library',
    icon: Printer,
    gradient: 'from-violet-500 to-purple-500',
    svg: (
      <svg viewBox="0 0 100 120" fill="none" stroke="#374151" strokeWidth="1.2" className="w-full h-full">
        {/* Body */}
        <ellipse cx="50" cy="60" rx="4" ry="25" />
        {/* Antennae */}
        <path d="M48 38 Q40 25 35 20" />
        <path d="M52 38 Q60 25 65 20" />
        <circle cx="35" cy="20" r="2" />
        <circle cx="65" cy="20" r="2" />
        {/* Left wing top */}
        <path d="M46 45 Q20 25 15 50 Q10 65 46 60" />
        {/* Left wing bottom */}
        <path d="M46 62 Q15 70 20 85 Q25 95 46 75" />
        {/* Right wing top */}
        <path d="M54 45 Q80 25 85 50 Q90 65 54 60" />
        {/* Right wing bottom */}
        <path d="M54 62 Q85 70 80 85 Q75 95 54 75" />
        {/* Wing patterns */}
        <circle cx="30" cy="48" r="6" />
        <circle cx="70" cy="48" r="6" />
        <circle cx="28" cy="72" r="4" />
        <circle cx="72" cy="72" r="4" />
      </svg>
    ),
  },
  {
    title: 'Dot-to-Dot Star',
    category: 'Dot-to-Dot',
    icon: CircleDot,
    gradient: 'from-amber-400 to-orange-500',
    svg: (
      <svg viewBox="0 0 100 120" fill="none" stroke="#9CA3AF" strokeWidth="0.5" className="w-full h-full">
        {/* Dots forming a star shape with numbers */}
        {[
          { x: 50, y: 15, n: 1 },
          { x: 62, y: 40, n: 2 },
          { x: 90, y: 45, n: 3 },
          { x: 68, y: 65, n: 4 },
          { x: 78, y: 95, n: 5 },
          { x: 50, y: 78, n: 6 },
          { x: 22, y: 95, n: 7 },
          { x: 32, y: 65, n: 8 },
          { x: 10, y: 45, n: 9 },
          { x: 38, y: 40, n: 10 },
        ].map((dot) => (
          <g key={dot.n}>
            <circle cx={dot.x} cy={dot.y} r="3" fill="#374151" stroke="none" />
            <text x={dot.x + 5} y={dot.y - 4} fill="#6B7280" fontSize="7" fontFamily="sans-serif">{dot.n}</text>
            {dot.n > 1 && (
              <line
                x1={[
                  { x: 50, y: 15 },
                  { x: 62, y: 40 },
                  { x: 90, y: 45 },
                  { x: 68, y: 65 },
                  { x: 78, y: 95 },
                  { x: 50, y: 78 },
                  { x: 22, y: 95 },
                  { x: 32, y: 65 },
                  { x: 10, y: 45 },
                  { x: 38, y: 40 },
                ][dot.n - 2].x}
                y1={[
                  { x: 50, y: 15 },
                  { x: 62, y: 40 },
                  { x: 90, y: 45 },
                  { x: 68, y: 65 },
                  { x: 78, y: 95 },
                  { x: 50, y: 78 },
                  { x: 22, y: 95 },
                  { x: 32, y: 65 },
                  { x: 10, y: 45 },
                  { x: 38, y: 40 },
                ][dot.n - 2].y}
                x2={dot.x}
                y2={dot.y}
                strokeDasharray="3,3"
                stroke="#D1D5DB"
              />
            )}
          </g>
        ))}
      </svg>
    ),
  },
  {
    title: 'Dinosaur',
    category: 'Print Library',
    icon: Printer,
    gradient: 'from-green-400 to-emerald-500',
    svg: (
      <svg viewBox="0 0 100 120" fill="none" stroke="#374151" strokeWidth="1.2" className="w-full h-full">
        {/* T-Rex outline */}
        {/* Head */}
        <path d="M65 25 Q80 20 85 30 Q88 38 80 42 L65 42 Q60 38 65 25" />
        {/* Eye */}
        <circle cx="74" cy="30" r="3" fill="#374151" />
        {/* Mouth */}
        <path d="M80 38 L85 36" />
        {/* Teeth */}
        <path d="M72 42 L74 45 L76 42 L78 45 L80 42" />
        {/* Neck */}
        <path d="M65 35 Q55 40 50 50" />
        <path d="M65 42 Q58 48 55 55" />
        {/* Body */}
        <ellipse cx="45" cy="65" rx="20" ry="18" />
        {/* Tail */}
        <path d="M25 60 Q10 55 5 45" strokeWidth="2" />
        {/* Legs */}
        <path d="M38 80 L35 100 L30 100" strokeWidth="2" />
        <path d="M52 80 L55 100 L60 100" strokeWidth="2" />
        {/* Arms */}
        <path d="M58 58 L62 65 L60 68" strokeWidth="1.5" />
        {/* Spines */}
        <path d="M30 50 L28 44 L35 48" />
        <path d="M38 47 L37 41 L43 46" />
      </svg>
    ),
  },
]

export function ShowcaseGallery() {
  return (
    <section className="container mx-auto px-6 py-20">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
            See What You Can Create
          </h2>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto">
            From photos to print-ready colouring pages in seconds. Here are some examples of what our AI generates.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {examples.map((example, i) => (
            <div key={i} className="group">
              <div className="relative">
                {/* Hover glow */}
                <div className={`absolute -inset-1 bg-gradient-to-br ${example.gradient} rounded-2xl opacity-0 group-hover:opacity-20 blur-lg transition-opacity duration-500`} />

                <div className="relative bg-white rounded-2xl overflow-hidden border border-zinc-700 group-hover:border-zinc-500 transition-colors duration-300">
                  {/* Image area */}
                  <div className="aspect-[3/4] p-4 flex items-center justify-center">
                    {example.svg}
                  </div>

                  {/* Info bar */}
                  <div className="bg-zinc-800 border-t border-zinc-700 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className={`w-6 h-6 rounded-md bg-gradient-to-br ${example.gradient} flex items-center justify-center`}>
                        <example.icon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white leading-tight">{example.title}</p>
                        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{example.category}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
