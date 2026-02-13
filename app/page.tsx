'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ImagePlus, CircleDot, Printer, ArrowRight, Sparkles, Crown } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { Hero } from '@/components/sections/hero'
import { GeneratorSection } from '@/components/sections/generator-section'
import { HowItWorks } from '@/components/sections/how-it-works'
import { Footer } from '@/components/sections/footer'

function FeatureCard({
  href,
  icon: Icon,
  title,
  description,
  gradient,
  badge,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
  gradient: string
  badge?: string
}) {
  return (
    <Link href={href} className="group relative block">
      {/* Animated gradient border */}
      <div className="absolute -inset-[2px] rounded-2xl overflow-hidden opacity-0 group-hover:opacity-100 transition-opacity duration-500">
        <div
          className="absolute inset-[-200%] animate-border-spin"
          style={{
            background: `conic-gradient(from 0deg, transparent 0deg, transparent 240deg, ${gradient} 280deg, transparent 320deg, transparent 360deg)`,
          }}
        />
      </div>
      <div className="relative bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8 group-hover:border-transparent transition-all duration-300 group-hover:-translate-y-1">
        {badge && (
          <span className="absolute top-4 right-4 text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {badge}
          </span>
        )}
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br ${gradient} shadow-lg`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-primary transition-colors">{title}</h3>
        <p className="text-gray-400 text-sm mb-4">{description}</p>
        <span className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary group-hover:gap-2 transition-all">
          Get Started <ArrowRight className="w-4 h-4" />
        </span>
      </div>
    </Link>
  )
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <NavHeader active="create" />
      <Hero />

      {/* Feature Cards */}
      <section className="container mx-auto px-6 py-12">
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6">
          <FeatureCard
            href="/create"
            icon={ImagePlus}
            title="Photo to Colouring Page"
            description="Upload any photo and AI transforms it into a beautiful, printable A4 colouring page."
            gradient="from-brand-primary to-brand-border"
          />
          <FeatureCard
            href="/dot-to-dot"
            icon={CircleDot}
            title="Dot-to-Dot Puzzles"
            description="Turn photos into numbered connect-the-dots puzzles. Choose 50-200 dots for any difficulty."
            gradient="from-amber-400 to-orange-500"
            badge="1 Free Try"
          />
          <FeatureCard
            href="/print-pages"
            icon={Printer}
            title="Ready-Made Library"
            description="Browse hundreds of original colouring pages. Animals, fantasy, seasonal themes and more."
            gradient="from-violet-500 to-purple-600"
            badge="Free"
          />
        </div>
      </section>

      <GeneratorSection />
      <HowItWorks />

      {/* Pro CTA */}
      <section className="container mx-auto px-6 pb-16">
        <div className="max-w-3xl mx-auto">
          <div className="relative overflow-hidden rounded-2xl">
            {/* Animated border */}
            <div className="absolute -inset-[2px] rounded-2xl overflow-hidden">
              <div
                className="absolute inset-[-200%] animate-border-spin"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, #10B981 240deg, #34D399 280deg, #10B981 320deg, transparent 360deg)',
                }}
              />
            </div>
            <div className="relative bg-gradient-to-r from-zinc-900 to-zinc-800 rounded-2xl p-10 text-center">
              <Crown className="w-10 h-10 text-amber-400 mx-auto mb-4" />
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
                Unlock Everything with Pro
              </h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Unlimited colouring pages, unlimited dot-to-dot puzzles, no watermarks, HD downloads, and priority processing.
              </p>
              <Link
                href="/pro"
                className="inline-flex items-center gap-2 h-12 px-8 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl hover:opacity-90 transition-opacity shadow-glow"
              >
                <Sparkles className="w-5 h-5" />
                Go Pro - From £2.99/month
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
