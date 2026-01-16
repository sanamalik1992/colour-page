'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/header'
import { GeneratorCard } from '@/components/generator/generator-card'

export default function Home() {
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true)
    }, 100)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Header />
      
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-[580px] mx-auto">
          {/* Hero Section - Refined sizing */}
          <div className="text-center mb-10">
            <h1 
              className={`
                text-5xl font-black text-gray-900 mb-4 tracking-tight leading-tight
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
                text-lg text-gray-600 mb-1
                transition-all duration-700 ease-out
                ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: '200ms' }}
            >
              Generate colouring pages in seconds using AI.
            </p>
            
            <p 
              className={`
                text-lg text-gray-900 font-semibold
                transition-all duration-700 ease-out
                ${showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
              `}
              style={{ transitionDelay: '400ms' }}
            >
              Try it free.
            </p>
          </div>

          {/* Generator Card */}
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