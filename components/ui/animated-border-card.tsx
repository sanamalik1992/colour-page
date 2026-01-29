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
    <div className="relative rounded-2xl">
      <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
        <div 
          className="absolute inset-[-200%] animate-border-spin motion-reduce:animate-none"
          style={{
            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 240deg, #10B981 260deg, #34D399 280deg, #6EE7B7 300deg, #34D399 320deg, #10B981 340deg, transparent 360deg)',
            animation: 'spin 3s linear infinite',
          }}
        />
      </div>
      
      <div 
        className="absolute -inset-4 rounded-2xl opacity-50 blur-xl animate-pulse motion-reduce:animate-none"
        style={{
          background: 'radial-gradient(circle at center, rgba(16, 185, 129, 0.4), transparent 70%)',
        }}
      />
      
      <div className="relative bg-white rounded-2xl">
        {children}
      </div>
    </div>
  )
}