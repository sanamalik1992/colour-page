'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { User, CreditCard, Calendar, CheckCircle, AlertCircle, Loader2, Crown, ArrowLeft } from 'lucide-react'

interface SubscriptionStatus {
  isPro: boolean
  status: string
  renewalDate: string | null
  cancelAtPeriodEnd: boolean
  plan: string
}

export default function AccountPage() {
  const [email, setEmail] = useState('')
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [portalLoading, setPortalLoading] = useState(false)

  const checkStatus = async (emailToCheck: string) => {
    if (!emailToCheck) return
    
    setChecking(true)
    try {
      const res = await fetch(`/api/stripe/status?email=${encodeURIComponent(emailToCheck)}`)
      const data = await res.json()
      setSubscriptionStatus(data)
    } catch (error) {
      console.error('Error checking status:', error)
    } finally {
      setChecking(false)
    }
  }

  const handleCheckStatus = (e: React.FormEvent) => {
    e.preventDefault()
    if (email) {
      localStorage.setItem('pro_email', email)
      checkStatus(email)
    }
  }

  const handleManageBilling = async () => {
    if (!email) return
    
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      
      if (data.url) {
        window.location.href = data.url
      } else {
        alert(data.error || 'Failed to open billing portal')
      }
    } catch (error) {
      console.error('Portal error:', error)
      alert('Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  useEffect(() => {
    const savedEmail = localStorage.getItem('pro_email')
    if (savedEmail) {
      setEmail(savedEmail)
      checkStatus(savedEmail)
    }
  }, [])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getStatusBadge = () => {
    if (!subscriptionStatus) return null
    
    const { status, cancelAtPeriodEnd } = subscriptionStatus
    
    if (cancelAtPeriodEnd) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
          <AlertCircle className="w-4 h-4" />
          Cancels at period end
        </span>
      )
    }
    
    switch (status) {
      case 'active':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
            <CheckCircle className="w-4 h-4" />
            Active
          </span>
        )
      case 'trialing':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium">
            <Crown className="w-4 h-4" />
            Trial
          </span>
        )
      case 'past_due':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium">
            <AlertCircle className="w-4 h-4" />
            Past Due
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-700 text-gray-400 rounded-full text-sm font-medium">
            Free
          </span>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-16">
          <Link href="/" className="relative w-10 h-10">
            <Image src="/logo.png" alt="colour.page" fill className="object-contain" />
          </Link>
          <Link href="/" className="text-sm text-gray-400 hover:text-white flex items-center gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-8">My Account</h1>

        {/* Email Input */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-brand-primary" />
            Check Subscription Status
          </h2>
          
          <form onSubmit={handleCheckStatus} className="flex gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 h-12 px-4 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary"
              required
            />
            <button
              type="submit"
              disabled={checking}
              className="h-12 px-6 bg-brand-primary hover:bg-brand-border text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Check'}
            </button>
          </form>
        </div>

        {/* Subscription Status */}
        {subscriptionStatus && (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-brand-primary" />
                Subscription
              </h2>
              {getStatusBadge()}
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center py-3 border-b border-zinc-700">
                <span className="text-gray-400">Current Plan</span>
                <span className="text-white font-medium">
                  {subscriptionStatus.isPro ? (
                    <span className="flex items-center gap-2">
                      <Crown className="w-4 h-4 text-amber-400" />
                      Pro
                    </span>
                  ) : (
                    'Free'
                  )}
                </span>
              </div>

              {subscriptionStatus.renewalDate && (
                <div className="flex justify-between items-center py-3 border-b border-zinc-700">
                  <span className="text-gray-400 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {subscriptionStatus.cancelAtPeriodEnd ? 'Access Until' : 'Renews On'}
                  </span>
                  <span className="text-white font-medium">
                    {formatDate(subscriptionStatus.renewalDate)}
                  </span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-col sm:flex-row gap-3">
              {subscriptionStatus.isPro ? (
                <button
                  onClick={handleManageBilling}
                  disabled={portalLoading}
                  className="flex-1 h-12 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {portalLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Manage Billing
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/pro"
                  className="flex-1 h-12 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade to Pro
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Pro Benefits */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            Pro Benefits
          </h2>
          
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
            <li className="flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              No watermarks
            </li>
          </ul>

          {!subscriptionStatus?.isPro && (
            <Link
              href="/pro"
              className="mt-6 w-full h-12 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" />
              Get Pro - £4.99/month
            </Link>
          )}
        </div>
      </main>
    </div>
  )
}
