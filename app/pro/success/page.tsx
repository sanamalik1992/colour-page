'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { CheckCircle, Sparkles, ArrowRight, Loader2 } from 'lucide-react'

function SuccessContent() {
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('session_id')
  const [loading, setLoading] = useState(true)
  const [verified, setVerified] = useState(false)

  useEffect(() => {
    // Give webhook time to process
    const timer = setTimeout(() => {
      setLoading(false)
      setVerified(true)
    }, 2000)

    return () => clearTimeout(timer)
  }, [sessionId])

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-brand-primary animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Activating your Pro subscription...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Logo */}
        <Link href="/" className="inline-block mb-8">
          <div className="relative w-16 h-16 mx-auto">
            <Image src="/logo.png" alt="colour.page" fill className="object-contain" />
          </div>
        </Link>

        {/* Success Icon */}
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-10 h-10 text-green-500" />
        </div>

        {/* Message */}
        <h1 className="text-3xl font-bold text-white mb-4">
          Welcome to Pro! 🎉
        </h1>
        
        <p className="text-gray-400 mb-8">
          Thank you for subscribing! You now have unlimited access to all colouring page features.
        </p>

        {/* Benefits */}
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

        {/* CTA */}
        <Link 
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full h-14 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-xl hover:opacity-90 transition-opacity"
        >
          Start Creating
          <ArrowRight className="w-5 h-5" />
        </Link>

        <div className="mt-6 flex justify-center gap-4">
          <Link href="/account" className="text-brand-primary hover:text-white text-sm transition-colors">
            Manage Subscription
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-6">
          A confirmation email has been sent to your inbox.
        </p>
      </div>
    </div>
  )
}

export default function ProSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin" />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  )
}
