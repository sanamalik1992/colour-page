'use client'

import { useEffect, useState } from 'react'
import { Sparkles } from 'lucide-react'

export function Hero() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    setTimeout(() => setShow(true), 100)
  }, [])

  return (
    <section className="container mx-auto px-6 pt-20 pb-12">
      <div className="max-w-4xl mx-auto text-center">
        {/* Mini Badge */}
        <div 
          className={`inline-flex items-center gap-2 px-4 py-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full mb-6 transition-all duration-700 ${
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          <Sparkles className="w-4 h-4 text-brand-primary" />
          <span className="text-sm font-semibold text-brand-primary">AI Colouring Pages</span>
        </div>
        
        {/* Main Headline */}
        <h1 
          className={`text-5xl md:text-6xl lg:text-7xl font-black text-white mb-6 tracking-tight leading-tight transition-all duration-700 delay-100 ${
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Upload a Photo,<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-glow via-brand-primary to-brand-border">
            Print & Colour
          </span>
        </h1>
        
        {/* Subheadline */}
        <p 
          className={`text-xl md:text-2xl text-gray-400 mb-8 transition-all duration-700 delay-200 ${
            show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Generate beautiful colouring pages in seconds using AI.<br />
          <span className="text-brand-primary font-semibold">Try it free — no signup required.</span>
        </p>
      </div>
    </section>
  )
}
