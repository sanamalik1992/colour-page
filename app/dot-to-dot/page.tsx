'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Printer, Clock, Bell, CheckCircle, ArrowRight } from 'lucide-react'

export default function DotToDotPage() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  const handleNotify = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email')
      return
    }
    setError('')
    setSubmitted(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12">
            <Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/print" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg flex items-center gap-2">
              <Printer className="w-4 h-4" />Print Library
            </Link>
            <Link href="/dot-to-dot" className="px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-zinc-800 rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4" />Dot-to-Dot
            </Link>
          </nav>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          <div className="w-28 h-28 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-amber-500/30">
            <span className="text-5xl">🔢</span>
          </div>
          
          <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 rounded-full px-5 py-2.5 mb-6">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-bold text-amber-400">Coming Soon</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6">Dot-to-Dot Generator</h1>
          
          <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Transform any photo into a numbered connect-the-dots puzzle that kids will love! 
            Perfect for educational activities and creative fun.
          </p>

          <div className="bg-zinc-800/50 border border-zinc-700 rounded-3xl p-8 mb-10">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <div className="bg-zinc-900/50 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">📸</div>
                <h3 className="font-semibold text-white mb-1">Upload Photo</h3>
                <p className="text-sm text-gray-500">Any image works</p>
              </div>
              <div className="bg-zinc-900/50 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">✨</div>
                <h3 className="font-semibold text-white mb-1">AI Processing</h3>
                <p className="text-sm text-gray-500">Edge detection magic</p>
              </div>
              <div className="bg-zinc-900/50 rounded-2xl p-6 text-center">
                <div className="text-4xl mb-3">🖨️</div>
                <h3 className="font-semibold text-white mb-1">Print & Play</h3>
                <p className="text-sm text-gray-500">Connect the dots!</p>
              </div>
            </div>
            
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 rounded-2xl p-6">
              <div className="flex items-center justify-center gap-4 text-amber-400">
                <span className="text-2xl font-bold">1</span>
                <ArrowRight className="w-5 h-5" />
                <span className="text-2xl font-bold">2</span>
                <ArrowRight className="w-5 h-5" />
                <span className="text-2xl font-bold">3</span>
                <ArrowRight className="w-5 h-5" />
                <span className="text-2xl font-bold">...</span>
                <ArrowRight className="w-5 h-5" />
                <span className="text-2xl font-bold">🎨</span>
              </div>
              <p className="text-gray-400 text-sm mt-3">Numbered dots that reveal a hidden picture</p>
            </div>
          </div>

          <div className="bg-zinc-800/70 border border-zinc-700 rounded-3xl p-8 mb-10 max-w-xl mx-auto">
            {submitted ? (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white">You&apos;re on the list!</h3>
                <p className="text-gray-400">We&apos;ll email you when Dot-to-Dot launches.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2 mb-5">
                  <Bell className="w-5 h-5 text-amber-400" />
                  <h3 className="text-lg font-bold text-white">Get notified when it launches</h3>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setError('') }}
                    placeholder="Enter your email" 
                    className="flex-1 h-14 px-5 bg-zinc-900 border border-zinc-600 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-amber-500" 
                  />
                  <button 
                    onClick={handleNotify}
                    className="h-14 px-8 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all"
                  >
                    Notify Me
                  </button>
                </div>
                {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
              </>
            )}
          </div>

          <div className="pt-8 border-t border-zinc-800">
            <p className="text-gray-400 mb-4">In the meantime, try our colouring page generator:</p>
            <Link href="/" className="inline-flex items-center gap-2 text-brand-primary hover:text-white transition-colors font-semibold">
              <Sparkles className="w-5 h-5" />
              Create Colouring Pages Now
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-12">
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
