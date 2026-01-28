'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Printer } from 'lucide-react'
import { Hero } from '@/components/sections/hero'
import { GeneratorSection } from '@/components/sections/generator-section'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Footer } from '@/components/sections/footer'

export default function Home() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between h-20">
            <Link href="/" className="relative w-12 h-12">
              <Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized />
            </Link>
            
            <nav className="flex items-center gap-2">
              <Link href="/" className="px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-zinc-800 rounded-lg">Create</Link>
              <Link href="/print" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg flex items-center gap-2">
                <Printer className="w-4 h-4" />
                Print Library
              </Link>
            </nav>

            <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
          </div>
        </div>
      </header>

      <Hero />
      <GeneratorSection />
      <HowItWorks />
      <Footer />
    </div>
  )
}
