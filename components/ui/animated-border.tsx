'use client'

export function AnimatedBorder({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative p-[3px] rounded-2xl overflow-visible">
      {/* Rotating background */}
      <div 
        className="absolute inset-0 rounded-2xl animate-spin"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, transparent 250deg, #22C55E 270deg, #4ADE80 290deg, #86EFAC 310deg, #4ADE80 330deg, #22C55E 350deg, transparent 360deg)',
          animationDuration: '3s',
        }}
      />
      
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-2xl animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(34, 197, 94, 0.4) 0%, transparent 70%)',
          filter: 'blur(20px)',
          transform: 'scale(1.1)',
        }}
      />
      
      {/* White background to create border effect */}
      <div className="absolute inset-[3px] bg-white rounded-2xl z-10" />
      
      {/* Content */}
      <div className="relative z-20">
        {children}
      </div>
    </div>
  )
}