'use client'

import { Sparkles, Star } from 'lucide-react'

export function Hero() {
  return (
    <section className="container mx-auto px-6 pt-16 pb-12 text-center">
      <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-4 py-2 mb-6">
        <Sparkles className="w-4 h-4 text-brand-primary" />
        <span className="text-sm font-medium text-brand-primary">
          AI-Powered Colouring Pages
        </span>
      </div>
      
      <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
        Transform Any Photo Into a{' '}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary to-brand-glow">
          Colouring Page
        </span>
      </h1>
      
      <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
        Upload a photo and our AI instantly creates a beautiful, printable colouring page. 
        Perfect for kids, classrooms, and creative fun!
      </p>
      
      <div className="flex items-center justify-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-1">
          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
          <span>4.9/5 rating</span>
        </div>
        <div className="w-1 h-1 bg-gray-600 rounded-full" />
        <span>10,000+ pages created</span>
        <div className="w-1 h-1 bg-gray-600 rounded-full" />
        <span>Free to try</span>
      </div>
    </section>
  )
}
