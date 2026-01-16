'use client'

import { useState } from 'react'
import { Header } from '@/components/ui/header'
import { GeneratorCard } from '@/components/generator/generator-card'
import { TypewriterText } from '@/components/ui/typewriter-text'

export default function Home() {
  const [showLine2, setShowLine2] = useState(false)
  const [showLine3, setShowLine3] = useState(false)

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-green-50/30 to-white">
      <Header />
      
      <main className="container mx-auto px-6 py-20">
        <div className="max-w-[680px] mx-auto">
          {/* Hero Section - Typewriter effect */}
          <div className="text-center mb-16">
            <h1 className="text-6xl font-black text-gray-900 mb-6 tracking-tight leading-tight min-h-[140px]">
              <TypewriterText 
                text="Upload a Photo,"
                speed={80}
                onComplete={() => setShowLine2(true)}
              />
              <br />
              {showLine2 && (
                <TypewriterText 
                  text="Print & Colour"
                  speed={80}
                  onComplete={() => setShowLine3(true)}
                />
              )}
            </h1>
            
            {showLine3 && (
              <div className="animate-in fade-in duration-500">
                <p className="text-xl text-gray-600 mb-2">
                  <TypewriterText 
                    text="Generate colouring pages in seconds using AI."
                    speed={40}
                  />
                </p>
                <p className="text-xl text-gray-900 font-bold">
                  Try it free.
                </p>
              </div>
            )}
          </div>

          {/* Generator Card - fades in after text */}
          {showLine3 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <GeneratorCard />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}