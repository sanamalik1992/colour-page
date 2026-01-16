'use client'

import { useEffect, useRef } from 'react'

export function AnimatedBorder({ children }: { children: React.ReactNode }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let rotation = 0

    const animate = () => {
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width
      canvas.height = rect.height

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw rotating gradient border
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      const radius = Math.max(canvas.width, canvas.height)

      const gradient = ctx.createConicGradient(rotation, centerX, centerY)
      gradient.addColorStop(0, 'transparent')
      gradient.addColorStop(0.7, 'transparent')
      gradient.addColorStop(0.75, '#22C55E')
      gradient.addColorStop(0.85, '#4ADE80')
      gradient.addColorStop(0.95, '#86EFAC')
      gradient.addColorStop(1, 'transparent')

      ctx.strokeStyle = gradient
      ctx.lineWidth = 3
      ctx.roundRect(2, 2, canvas.width - 4, canvas.height - 4, 18)
      ctx.stroke()

      rotation += 0.02
      animationId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      cancelAnimationFrame(animationId)
    }
  }, [])

  return (
    <div className="relative">
      {/* Canvas for animated border */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ filter: 'drop-shadow(0 0 10px rgba(34, 197, 94, 0.5))' }}
      />
      
      {/* Pulsing glow */}
      <div className="absolute inset-0 rounded-2xl animate-pulse" style={{
        background: 'radial-gradient(circle at center, rgba(34, 197, 94, 0.2) 0%, transparent 70%)',
        filter: 'blur(20px)'
      }} />
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  )
}