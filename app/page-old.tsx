'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/ui/header'
import { Hero } from '@/components/sections/hero-v2'
import { GeneratorSection } from '@/components/sections/generator-section-v2'
import { Footer } from '@/components/sections/footer'

export default function Home() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <Header />
      <Hero />
      <GeneratorSection />
      <Footer />
    </div>
  )
}