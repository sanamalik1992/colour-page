'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Sparkles, ArrowRight } from 'lucide-react'

export default function ProSuccessPage() {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <Link href="/" className="inline-block mb-8">
          <div className="relative w-16 h-16 mx-auto">
            <Image src="/logo.png" alt="colour.page" fill className="object-contain" />
          </div>
        </Link>

        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        <h1 className="text-3xl font-bold text-white mb-4">Welcome to Pro! 🎉</h1>
        
        <p className="text-gray-400 mb-8">
          Thank you for subscribing! You now have unlimited access to all colouring page features.
        </p>

        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 mb-8 text-left">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-brand-primary" />
            Your Pro Benefits
          </h3>
          <ul className="space-y-3 text-gray-300">
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              Unlimited colouring page conversions
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              High-resolution A4 print quality
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              Priority processing
            </li>
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              Access to full print library
            </li>
          </ul>
        </div>

        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full h-14 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-xl hover:opacity-90 transition-opacity"
        >
          Start Creating
          <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="text-gray-500 text-sm mt-6">
          A confirmation email has been sent to your inbox.
        </p>
      </div>
    </div>
  )
}
