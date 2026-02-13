'use client'

import { useEffect, useState, useRef } from 'react'
import { ImagePlus, Users, Printer, Sparkles } from 'lucide-react'

function StatItem({ icon: Icon, value, suffix, label, color }: {
  icon: React.ElementType
  value: number
  suffix: string
  label: string
  color: string
}) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const counted = useRef(false)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true
          const startTime = Date.now()
          const duration = 2000
          const tick = () => {
            const elapsed = Date.now() - startTime
            const progress = Math.min(elapsed / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * value))
            if (progress < 1) requestAnimationFrame(tick)
          }
          tick()
        }
      },
      { threshold: 0.3 }
    )
    if (ref.current) observer.observe(ref.current)
    return () => observer.disconnect()
  }, [value])

  return (
    <div ref={ref} className="text-center">
      <Icon className={`w-8 h-8 ${color} mx-auto mb-3`} />
      <div className="text-3xl md:text-4xl font-extrabold text-white mb-1">
        {count.toLocaleString()}{suffix}
      </div>
      <p className="text-sm text-gray-500 font-medium">{label}</p>
    </div>
  )
}

export function StatsSection() {
  return (
    <section className="container mx-auto px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="bg-zinc-800/30 border border-zinc-800 rounded-2xl p-8 md:p-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <StatItem icon={ImagePlus} value={10000} suffix="+" label="Pages Created" color="text-brand-primary" />
            <StatItem icon={Users} value={3500} suffix="+" label="Happy Users" color="text-blue-400" />
            <StatItem icon={Printer} value={300} suffix="+" label="Print Library Pages" color="text-violet-400" />
            <StatItem icon={Sparkles} value={99} suffix="%" label="Satisfaction Rate" color="text-amber-400" />
          </div>
        </div>
      </div>
    </section>
  )
}
