'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Check, Crown, Star, ArrowRight, Sparkles, Zap, Loader2, Printer } from 'lucide-react'

export default function ProPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async (plan: 'monthly' | 'annual') => {
    if (!email) { setError('Please enter your email'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/checkout-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan })
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setError(data.error || 'Failed to start checkout')
    } catch { setError('Something went wrong') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></Link>
          <nav className="flex items-center gap-1">
            <Link href="/" className="px-3 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/print" className="px-3 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg flex items-center gap-1"><Printer className="w-4 h-4" /><span className="hidden sm:inline">Print Library</span></Link>
          </nav>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-primary/20 via-transparent to-brand-border/10" />
        <div className="container mx-auto px-6 py-20 relative">
          <div className="text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/30 rounded-full px-4 py-2 mb-6">
              <Crown className="w-4 h-4 text-brand-primary" /><span className="text-sm font-semibold text-brand-primary">Upgrade to Pro</span>
            </div>
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">Unlimited Coloring Pages</h1>
            <p className="text-xl text-gray-400 mb-8">Create unlimited coloring pages and get HD downloads for just £2.99/month.</p>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 py-8">
        <div className="max-w-md mx-auto mb-12">
          <label className="block text-sm font-medium text-gray-300 mb-2">Enter your email to get started</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary" />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="rounded-2xl p-8 bg-zinc-800/50 border border-zinc-700">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Free</h3>
              <div className="flex items-baseline justify-center gap-1"><span className="text-4xl font-bold text-white">£0</span></div>
              <p className="text-sm text-gray-400 mt-2">Try it out</p>
            </div>
            <ul className="space-y-3 mb-8">
              {['3 coloring pages per day', 'Standard quality', 'Email delivery'].map((f) => (<li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-brand-primary flex-shrink-0" /><span className="text-gray-300 text-sm">{f}</span></li>))}
            </ul>
            <Link href="/" className="w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white">Get Started</Link>
          </div>

          <div className="rounded-2xl p-8 bg-gradient-to-b from-brand-primary/20 to-zinc-800/50 border-2 border-brand-primary shadow-2xl scale-105">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2"><span className="bg-gradient-to-r from-brand-primary to-brand-border text-white text-sm font-bold px-4 py-1 rounded-full">Most Popular</span></div>
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Pro Monthly</h3>
              <div className="flex items-baseline justify-center gap-1"><span className="text-4xl font-bold text-white">£2.99</span><span className="text-gray-400">/month</span></div>
              <p className="text-sm text-gray-400 mt-2">Best for families</p>
            </div>
            <ul className="space-y-3 mb-8">
              {['Unlimited coloring pages', 'HD quality downloads', 'No watermarks', 'Priority processing', 'Direct download'].map((f) => (<li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-brand-primary flex-shrink-0" /><span className="text-gray-300 text-sm">{f}</span></li>))}
            </ul>
            <button onClick={() => handleCheckout('monthly')} disabled={loading} className="w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-border text-white disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Start Pro<ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>

          <div className="rounded-2xl p-8 bg-zinc-800/50 border border-zinc-700">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-white mb-2">Pro Annual</h3>
              <div className="flex items-baseline justify-center gap-1"><span className="text-4xl font-bold text-white">£24.99</span><span className="text-gray-400">/year</span></div>
              <p className="text-sm text-gray-400 mt-2">Save 30%</p>
            </div>
            <ul className="space-y-3 mb-8">
              {['Everything in Pro', '2 months free', 'Commercial license'].map((f) => (<li key={f} className="flex items-start gap-3"><Check className="w-5 h-5 text-brand-primary flex-shrink-0" /><span className="text-gray-300 text-sm">{f}</span></li>))}
            </ul>
            <button onClick={() => handleCheckout('annual')} disabled={loading} className="w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white disabled:opacity-50">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <>Get Annual<ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-12 mt-20">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">© 2025 colour.page</span>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
