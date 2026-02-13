'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ImagePlus, CircleDot, Printer, ArrowRight, Sparkles, Crown, Shield, Zap, Heart } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { Hero } from '@/components/sections/hero'
import { ShowcaseGallery } from '@/components/sections/showcase-gallery'
import { HowItWorks } from '@/components/sections/how-it-works'
import { StatsSection } from '@/components/sections/stats-section'
import { Testimonials } from '@/components/sections/testimonials'
import { Footer } from '@/components/sections/footer'

function FeatureCard({
  href,
  icon: Icon,
  title,
  description,
  gradient,
  badge,
  features,
}: {
  href: string
  icon: React.ElementType
  title: string
  description: string
  gradient: string
  badge?: string
  features: string[]
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
      <div className="relative bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8 group-hover:border-transparent transition-all duration-300 group-hover:-translate-y-1 h-full flex flex-col">
        {badge && (
          <span className="absolute top-4 right-4 text-[10px] font-bold uppercase px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
            {badge}
          </span>
        )}
        <div className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 bg-gradient-to-br ${gradient} shadow-lg group-hover:scale-110 transition-transform duration-300`}>
          <Icon className="w-7 h-7 text-white" />
        </div>
        <h3 className="text-xl font-bold text-white mb-2 group-hover:text-brand-primary transition-colors">{title}</h3>
        <p className="text-gray-400 text-sm mb-5">{description}</p>

        {/* Feature list */}
        <ul className="space-y-2 mb-6 flex-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-500">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-primary flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>

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

      {/* Stats bar */}
      <StatsSection />

      {/* Feature Cards */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 tracking-tight">
              Three Ways to Create
            </h2>
            <p className="text-lg text-gray-400">
              Choose the tool that fits your needs
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <FeatureCard
              href="/create"
              icon={ImagePlus}
              title="Photo to Colouring Page"
              description="Upload any photo and AI transforms it into a beautiful, printable A4 colouring page."
              gradient="from-brand-primary to-brand-border"
              features={[
                'AI-powered line art',
                'Adjustable detail levels',
                'A4 PDF & PNG download',
                '3 free pages per day',
              ]}
            />
            <FeatureCard
              href="/dot-to-dot"
              icon={CircleDot}
              title="Dot-to-Dot Puzzles"
              description="Turn photos into numbered connect-the-dots puzzles. Choose 50-200 dots for any difficulty."
              gradient="from-amber-400 to-orange-500"
              badge="New"
              features={[
                'Custom dot counts (50-200)',
                'Optional guide lines',
                'Numbered dots for easy following',
                '1 free puzzle to try',
              ]}
            />
            <FeatureCard
              href="/print-pages"
              icon={Printer}
              title="Ready-Made Library"
              description="Browse hundreds of original colouring pages. Animals, fantasy, seasonal themes and more."
              gradient="from-violet-500 to-purple-600"
              badge="Free"
              features={[
                '300+ curated pages',
                'Animals, vehicles, fantasy & more',
                'Search & filter by category',
                'Instant download & print',
              ]}
            />
          </div>
        </div>
      </section>

      {/* Showcase */}
      <ShowcaseGallery />

      {/* How it works */}
      <HowItWorks />

      {/* Testimonials */}
      <Testimonials />

      {/* Pro CTA */}
      <section className="container mx-auto px-6 pb-20">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden rounded-3xl">
            {/* Animated border */}
            <div className="absolute -inset-[2px] rounded-3xl overflow-hidden">
              <div
                className="absolute inset-[-200%] animate-border-spin"
                style={{
                  background: 'conic-gradient(from 0deg, transparent 0deg, transparent 200deg, #10B981 240deg, #34D399 280deg, #10B981 320deg, transparent 360deg)',
                }}
              />
            </div>
            <div className="relative bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 rounded-3xl p-10 md:p-14">
              <div className="grid md:grid-cols-2 gap-10 items-center">
                <div>
                  <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-2 mb-6">
                    <Crown className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-semibold text-amber-400">Go Pro</span>
                  </div>
                  <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4 tracking-tight">
                    Unlock Everything
                  </h2>
                  <p className="text-gray-400 mb-8 leading-relaxed">
                    Remove all limits and get the best experience. Unlimited colouring pages, unlimited dot-to-dot puzzles, HD downloads, and priority processing.
                  </p>
                  <Link
                    href="/pro"
                    className="inline-flex items-center gap-2 h-14 px-10 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-2xl hover:opacity-90 transition-all shadow-glow hover:shadow-glow-lg hover:-translate-y-0.5 duration-300"
                  >
                    <Sparkles className="w-5 h-5" />
                    Go Pro — From £2.99/month
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { icon: Zap, label: 'Unlimited Pages', desc: 'No daily limits' },
                    { icon: ImagePlus, label: 'HD Downloads', desc: 'Full resolution' },
                    { icon: Shield, label: 'No Watermarks', desc: 'Clean output' },
                    { icon: Heart, label: 'Priority Queue', desc: 'Faster processing' },
                  ].map((perk, i) => (
                    <div key={i} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 text-center">
                      <perk.icon className="w-6 h-6 text-brand-primary mx-auto mb-2" />
                      <p className="text-sm font-semibold text-white">{perk.label}</p>
                      <p className="text-xs text-gray-500">{perk.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
