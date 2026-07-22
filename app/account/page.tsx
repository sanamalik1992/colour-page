'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { CreditCard, Calendar, CheckCircle, AlertCircle, Loader2, Crown, LogOut, Mail } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { useMe } from '@/hooks/useMe'
import { createClient } from '@/lib/supabase/client'

interface SubscriptionStatus {
  isPro: boolean
  status: string
  renewalDate: string | null
  cancelAtPeriodEnd: boolean
  plan: string
}

export default function AccountPage() {
  const router = useRouter()
  const { me, loading } = useMe()
  const supabase = createClient()
  const [sub, setSub] = useState<SubscriptionStatus | null>(null)
  const [portalLoading, setPortalLoading] = useState(false)

  const email = me?.user?.email || ''

  // Not logged in → send to login (keep the free-try flow elsewhere untouched).
  useEffect(() => {
    if (!loading && !me?.user) router.replace('/login?next=/account')
  }, [loading, me, router])

  const loadStatus = useCallback(async (e: string) => {
    try {
      const res = await fetch(`/api/stripe/status?email=${encodeURIComponent(e)}`)
      setSub(await res.json())
    } catch {
      /* ignore — the Pro flag from /api/me still governs UI */
    }
  }, [])

  useEffect(() => {
    if (email) loadStatus(email)
  }, [email, loadStatus])

  const manageBilling = async () => {
    if (!email) return
    setPortalLoading(true)
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else alert(data.error || 'Failed to open billing portal')
    } catch {
      alert('Failed to open billing portal')
    } finally {
      setPortalLoading(false)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    router.replace('/')
    router.refresh()
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

  const isPro = me?.isPro ?? false

  if (loading || !me?.user) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-brand-primary" />
      </div>
    )
  }

  const statusBadge = () => {
    if (!sub) return null
    if (sub.cancelAtPeriodEnd)
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium"><AlertCircle className="w-4 h-4" /> Cancels at period end</span>
    if (sub.status === 'active')
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium"><CheckCircle className="w-4 h-4" /> Active</span>
    if (sub.status === 'trialing')
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-sm font-medium"><Crown className="w-4 h-4" /> Trial</span>
    if (sub.status === 'past_due')
      return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-sm font-medium"><AlertCircle className="w-4 h-4" /> Past due</span>
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-zinc-700 text-gray-400 rounded-full text-sm font-medium">Free</span>
  }

  return (
    <div className="min-h-screen app-bg">
      <NavHeader />

      <main className="container mx-auto px-6 py-12 max-w-2xl">
        <h1 className="text-3xl font-bold text-white mb-8">My Account</h1>

        {/* Identity */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Mail className="w-5 h-5 text-brand-primary flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500">Signed in as</p>
              <p className="text-white font-medium truncate">{email}</p>
            </div>
          </div>
          <button
            onClick={signOut}
            className="flex-shrink-0 h-10 px-4 bg-zinc-700 hover:bg-zinc-600 text-white text-sm font-semibold rounded-xl transition-colors flex items-center gap-2"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>

        {/* Subscription */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-brand-primary" /> Subscription
            </h2>
            {statusBadge()}
          </div>

          <div className="flex justify-between items-center py-3 border-b border-zinc-700">
            <span className="text-gray-400">Current plan</span>
            <span className="text-white font-medium">
              {isPro ? <span className="flex items-center gap-2"><Crown className="w-4 h-4 text-amber-400" /> Pro</span> : 'Free'}
            </span>
          </div>

          {sub?.renewalDate && (
            <div className="flex justify-between items-center py-3 border-b border-zinc-700">
              <span className="text-gray-400 flex items-center gap-2">
                <Calendar className="w-4 h-4" /> {sub.cancelAtPeriodEnd ? 'Access until' : 'Renews on'}
              </span>
              <span className="text-white font-medium">{formatDate(sub.renewalDate)}</span>
            </div>
          )}

          <div className="mt-6">
            {isPro ? (
              <button
                onClick={manageBilling}
                disabled={portalLoading}
                className="w-full h-12 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {portalLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><CreditCard className="w-4 h-4" /> Manage billing</>}
              </button>
            ) : (
              <Link
                href="/pro"
                className="w-full h-12 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl transition-opacity hover:opacity-90 flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" /> Upgrade to Pro
              </Link>
            )}
          </div>
        </div>

        {/* Pro benefits */}
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" /> Pro benefits
          </h2>
          <ul className="space-y-3 text-gray-300">
            {['Unlimited colouring pages & learning sheets', 'High-resolution A4 print quality', 'Priority processing', 'Full print library', 'No watermarks'].map((b) => (
              <li key={b} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" /> {b}
              </li>
            ))}
          </ul>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
