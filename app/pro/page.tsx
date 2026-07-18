'use client'

import { useState } from 'react'
import { Check, Crown, ArrowRight, Loader2 } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'

export default function ProPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleCheckout = async (plan: string) => {
    if (!email) { setError('Please enter your email'); return }
    if (!email.includes('@')) { setError('Please enter a valid email'); return }
    
    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/stripe/checkout-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, plan })
      })
      const data = await res.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Failed to start checkout')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <NavHeader active="pro" />

      <section className="container mx-auto px-6 py-16">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/30 rounded-full px-4 py-2 mb-6">
            <Crown className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-semibold text-brand-primary">Upgrade to Pro</span>
          </div>
          <h1 className="text-5xl font-bold text-white mb-6">Unlimited Colouring Pages</h1>
          <p className="text-xl text-gray-400">Create unlimited colouring pages and dot-to-dot puzzles for just £2.99/month</p>
        </div>

        <div className="max-w-md mx-auto mb-12">
          <label className="block text-sm font-medium text-gray-300 mb-2">Enter your email to get started</label>
          <input 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="you@example.com" 
            className="w-full h-12 px-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
          />
          {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
          <div className="rounded-2xl p-8 bg-gradient-to-b from-brand-primary/20 to-zinc-800/50 border-2 border-brand-primary">
            <div className="text-center mb-6">
              <span className="bg-brand-primary text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
              <h3 className="text-xl font-bold text-white mt-4 mb-2">Pro Monthly</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-white">£2.99</span>
                <span className="text-gray-400">/month</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {['Unlimited colouring pages', 'Unlimited dot-to-dot', 'HD quality downloads', 'No watermarks', 'Priority processing'].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-brand-primary flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleCheckout('monthly')} 
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-border text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Subscribe Now</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>

          <div className="rounded-2xl p-8 bg-zinc-800/50 border border-zinc-700">
            <div className="text-center mb-6">
              <span className="bg-zinc-700 text-gray-300 text-xs font-bold px-3 py-1 rounded-full">SAVE 30%</span>
              <h3 className="text-xl font-bold text-white mt-4 mb-2">Pro Annual</h3>
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-4xl font-bold text-white">£24.99</span>
                <span className="text-gray-400">/year</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8">
              {['Everything in Monthly', '2 months free', 'Commercial license'].map((f) => (
                <li key={f} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-brand-primary flex-shrink-0" />
                  <span className="text-gray-300 text-sm">{f}</span>
                </li>
              ))}
            </ul>
            <button 
              onClick={() => handleCheckout('annual')} 
              disabled={loading}
              className="w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 bg-zinc-700 hover:bg-zinc-600 text-white disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span>Get Annual</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </div>
        </div>
      </section>

      <PageFooter />
    </div>
  )
}
