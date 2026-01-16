'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/header'
import { GeneratorCard } from '@/components/generator/generator-card'

export default function Home() {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    // Trigger animations on mount
    const timer = setTimeout(() => {
      setShowContent(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/30 to-white">
      <Header />
      
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-[680px] mx-auto">
          {/* Hero Section - Sequential fade-in */}
          <div className="text-center mb-16">
            <h1 
              className={`
                text-6xl font-black text-gray-900 mb-6 tracking-tight leading-tight
                transition-all duration-700 ease-out
                ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: '0ms' }}
            >
              Upload a Photo,<br />
              Print & Colour
            </h1>
            
            <p 
              className={`
                text-xl text-gray-600 mb-2
                transition-all duration-700 ease-out
                ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: '200ms' }}
            >
              Generate colouring pages in seconds using AI.
            </p>
            
            <p 
              className={`
                text-xl text-gray-900 font-bold
                transition-all duration-700 ease-out
                ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: '400ms' }}
            >
              Try it free.
            </p>
          </div>

          {/* Generator Card - fades in last */}
          <div 
            className={`
              transition-all duration-700 ease-out
              ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
            `}
            style={{ transitionDelay: '600ms' }}
          >
            <GeneratorCard />
          </div>
        </div>
      </main>
    </div>
  )
}