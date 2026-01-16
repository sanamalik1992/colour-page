'use client'

export function AnimatedBorderCard({ 
  children, 
  isAnimating = false 
}: { 
  children: React.ReactNode
  isAnimating?: boolean
}) {
  if (!isAnimating) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
        {children}
      </div>
    )
  }

  return (
    <div className="relative p-[2px] rounded-2xl">
      {/* Spinning gradient border */}
      <div 
        className="absolute inset-0 rounded-2xl"
        style={{
          background: 'conic-gradient(from 0deg, transparent 0deg, transparent 240deg, #10B981 260deg, #34D399 280deg, #6EE7B7 300deg, #34D399 320deg, #10B981 340deg, transparent 360deg)',
          animation: 'spin 3s linear infinite',
        }}
      />
      
      {/* Glow effect */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-60"
        style={{
          background: 'radial-gradient(circle at 50% 50%, rgba(16, 185, 129, 0.4), transparent 70%)',
          filter: 'blur(15px)',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />
      
      {/* Content container */}
      <div className="relative bg-white rounded-2xl">
        {children}
      </div>
    </div>
  )
}