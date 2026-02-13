'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Sparkles, Star, ArrowRight, Palette, Pencil } from 'lucide-react'

const words = ['Photo', 'Selfie', 'Pet Photo', 'Landscape', 'Memory']

export function Hero() {
  const [wordIndex, setWordIndex] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setWordIndex((i) => (i + 1) % words.length)
        setFade(true)
      }, 300)
    }, 2500)
    return () => clearInterval(interval)
  }, [])

  return (
    <section className="relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-brand-primary/5 rounded-full blur-3xl" />
        <div className="absolute top-40 right-10 w-96 h-96 bg-violet-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-t from-brand-primary/5 to-transparent rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-6 pt-20 pb-16 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-5 py-2.5 mb-8 backdrop-blur-sm">
            <Sparkles className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-semibold text-brand-primary tracking-wide">
              AI-Powered Colouring Pages
            </span>
          </div>

          {/* Main heading */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-white mb-8 leading-[1.1] tracking-tight">
            Turn Any{' '}
            <span
              className={`inline-block text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-glow to-emerald-300 transition-all duration-300 ${
                fade ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
              }`}
            >
              {words[wordIndex]}
            </span>
            <br />
            Into a Colouring Page
          </h1>

          <p className="text-xl md:text-2xl text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload a photo and our AI instantly creates a beautiful, printable colouring page.
            Perfect for kids, classrooms, and creative fun.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/create"
              className="group h-14 px-10 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-2xl flex items-center gap-3 shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 transition-all duration-300"
            >
              <Palette className="w-5 h-5" />
              Create Free Page
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              href="/print-pages"
              className="h-14 px-10 bg-zinc-800/80 border border-zinc-700 text-white font-semibold text-lg rounded-2xl flex items-center gap-3 hover:bg-zinc-700/80 hover:border-zinc-600 transition-all duration-300 backdrop-blur-sm"
            >
              <Pencil className="w-5 h-5" />
              Browse Library
            </Link>
          </div>

          {/* Social proof */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
            <div className="flex items-center gap-1.5">
              <div className="flex -space-x-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
              <span className="font-semibold text-gray-400">4.9/5 rating</span>
            </div>
            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full hidden sm:block" />
            <span className="font-medium">
              <span className="text-white font-bold">10,000+</span> pages created
            </span>
            <div className="w-1.5 h-1.5 bg-gray-600 rounded-full hidden sm:block" />
            <span className="inline-flex items-center gap-1 font-medium">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Free to try
            </span>
          </div>
        </div>

        {/* Preview mockup */}
        <div className="max-w-4xl mx-auto mt-16">
          <div className="relative">
            {/* Glow effect behind the card */}
            <div className="absolute -inset-4 bg-gradient-to-r from-brand-primary/20 via-violet-500/10 to-brand-primary/20 rounded-3xl blur-2xl opacity-60" />

            <div className="relative bg-zinc-800/90 border border-zinc-700 rounded-2xl p-6 md:p-8 backdrop-blur-xl shadow-2xl">
              <div className="grid md:grid-cols-2 gap-6 items-center">
                {/* "Before" side */}
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Your Photo</div>
                  <div className="aspect-[3/4] bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-xl flex items-center justify-center border border-zinc-600 overflow-hidden">
                    <div className="text-center p-6">
                      <div className="w-20 h-20 bg-gradient-to-br from-sky-400 to-blue-600 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                      <p className="text-gray-400 text-sm font-medium">Upload any photo</p>
                      <p className="text-gray-500 text-xs mt-1">JPG, PNG, HEIC</p>
                    </div>
                  </div>
                </div>

                {/* Arrow */}
                <div className="hidden md:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <div className="w-12 h-12 bg-gradient-to-r from-brand-primary to-brand-border rounded-full flex items-center justify-center shadow-glow">
                    <ArrowRight className="w-6 h-6 text-white" />
                  </div>
                </div>

                {/* "After" side */}
                <div className="text-center">
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Colouring Page</div>
                  <div className="aspect-[3/4] bg-white rounded-xl flex items-center justify-center border border-zinc-600 overflow-hidden">
                    <div className="text-center p-6">
                      {/* Stylized line art preview */}
                      <svg className="w-32 h-40 mx-auto mb-3" viewBox="0 0 120 150" fill="none" stroke="#374151" strokeWidth="1.5">
                        {/* Simple house line art */}
                        <path d="M60 20 L100 55 L100 130 L20 130 L20 55 Z" />
                        <path d="M60 20 L20 55" />
                        <path d="M60 20 L100 55" />
                        {/* Door */}
                        <rect x="47" y="90" width="26" height="40" rx="2" />
                        {/* Windows */}
                        <rect x="30" y="70" width="20" height="16" rx="2" />
                        <rect x="70" y="70" width="20" height="16" rx="2" />
                        {/* Chimney */}
                        <rect x="78" y="25" width="12" height="25" />
                        {/* Sun */}
                        <circle cx="20" cy="20" r="8" />
                        <line x1="20" y1="5" x2="20" y2="10" />
                        <line x1="20" y1="30" x2="20" y2="35" />
                        <line x1="5" y1="20" x2="10" y2="20" />
                        <line x1="30" y1="20" x2="35" y2="20" />
                        {/* Cloud */}
                        <ellipse cx="95" cy="15" rx="12" ry="6" />
                        {/* Tree */}
                        <circle cx="110" cy="100" r="15" />
                        <line x1="110" y1="115" x2="110" y2="130" strokeWidth="3" />
                        {/* Path */}
                        <path d="M47 130 Q50 140 55 145" />
                        <path d="M73 130 Q70 140 65 145" />
                      </svg>
                      <p className="text-gray-600 text-sm font-medium">Ready to print & colour!</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
