'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Check,
  Crown,
  Loader2,
  Sparkles,
  Infinity as InfinityIcon,
  Stamp,
  Zap,
  Palette,
  ShieldCheck,
  Lock,
  X,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { ProActivityPreviews } from '@/components/ui/pro-activity-previews'
import { useMe } from '@/hooks/useMe'

// An annual plan is only offered when a separate annual price is configured,
// so the customer is always charged the amount they see.
const ANNUAL_ENABLED = Boolean(process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL)

const PLANS = {
  monthly: { label: 'Monthly', price: '£4.99', per: '/month', note: 'Billed monthly · cancel anytime', badge: '' },
  annual: { label: 'Yearly', price: '£49.99', per: '/year', note: 'Just £4.17/month · 2 months free', badge: '-17%' },
} as const

const FEATURES = [
  { icon: InfinityIcon, color: 'text-emerald-500', bg: 'bg-emerald-50', title: 'Unlimited pages', desc: 'Make as many colouring pages as you like' },
  { icon: Stamp, color: 'text-rose-500', bg: 'bg-rose-50', title: 'No watermark', desc: 'Clean, print-ready pages every time' },
  { icon: Palette, color: 'text-violet-500', bg: 'bg-violet-50', title: 'Unlimited dot-to-dot', desc: 'Turn photos into number puzzles too' },
  { icon: Zap, color: 'text-amber-500', bg: 'bg-amber-50', title: 'Priority speed', desc: 'Your pages jump to the front of the queue' },
  { icon: Sparkles, color: 'text-sky-500', bg: 'bg-sky-50', title: 'HD A4 quality', desc: 'Sharp lines that print beautifully' },
  { icon: Crown, color: 'text-orange-500', bg: 'bg-orange-50', title: 'Full gallery', desc: 'Every ready-made colouring sheet unlocked' },
]

export default function ProPage() {
  const router = useRouter()
  const { me, loading: meLoading } = useMe()
  const [plan, setPlan] = useState<'monthly' | 'annual'>('monthly')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loggedIn = !!me?.user
  const accountEmail = me?.user?.email || ''

  const handleCheckout = async () => {
    // Pro requires an account so the subscription follows the user across
    // devices. Send logged-out visitors to sign up first (returning to /pro).
    if (!loggedIn) {
      router.push('/signup?next=/pro')
      return
    }

    setLoading(true)
    setError('')

    try {
      // The server uses the VERIFIED session email — the body email is ignored
      // for a logged-in user, so the Stripe customer always matches the account.
      const res = await fetch('/api/stripe/checkout-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      })
      const data = await res.json()

      if (data.url) {
        window.location.href = data.url
      } else {
        setError(data.error || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const active = PLANS[plan]

  return (
    <div className="min-h-screen app-bg">
      <NavHeader active="pro" />

      <main className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-lg mx-auto">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 bg-brand-primary/15 border border-brand-primary/30 rounded-full px-4 py-1.5 mb-5">
              <Crown className="w-4 h-4 text-brand-primary" />
              <span className="text-sm font-semibold text-brand-primary">colour.page Pro</span>
            </div>
            <div className="text-4xl mb-3" aria-hidden>🎨🖍️🌈</div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight">
              Unlock the whole crayon box
            </h1>
            <p className="text-gray-400 text-base sm:text-lg">
              Unlimited colouring pages and puzzles for the little artists at home.
            </p>
          </div>

          {/* Pricing card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 sm:p-8">
              {/* Billing toggle (only when an annual price is configured) */}
              {ANNUAL_ENABLED && (
                <div className="flex p-1 bg-gray-100 rounded-full mb-6">
                  {(['monthly', 'annual'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPlan(p)}
                      className={`flex-1 py-2.5 rounded-full text-sm font-semibold transition-all ${
                        plan === p ? 'bg-white text-gray-900 shadow' : 'text-gray-500'
                      }`}
                    >
                      {PLANS[p].label}
                      {PLANS[p].badge && <span className="ml-1.5 text-brand-primary text-xs">{PLANS[p].badge}</span>}
                    </button>
                  ))}
                </div>
              )}

              {/* Price */}
              <div className="text-center mb-6">
                <div className="flex items-end justify-center gap-1">
                  <span className="text-5xl font-extrabold text-gray-900">{active.price}</span>
                  <span className="text-gray-400 font-medium mb-1.5">{active.per}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1.5">{active.note}</p>
              </div>

              {/* Account: Pro links to the signed-in account so it follows the
                  user across devices. Logged-out visitors are asked to make a
                  free account first. */}
              {loggedIn ? (
                <div className="mb-1">
                  <span className="block text-sm font-semibold text-gray-700 mb-2">Your account</span>
                  <div className="w-full h-14 px-4 flex items-center bg-gray-50 border-2 border-gray-200 rounded-2xl text-gray-900">
                    <span className="truncate">{accountEmail}</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1.5">Your subscription links to this account.</p>
                </div>
              ) : (
                <div className="mb-1 rounded-2xl bg-brand-primary/10 border border-brand-primary/30 p-4 text-center">
                  <p className="text-sm text-gray-700 font-medium">Create a free account to subscribe</p>
                  <p className="text-xs text-gray-500 mt-1">So your Pro follows you on every device.</p>
                </div>
              )}

              {error && (
                <p className="text-sm text-red-500 mt-3 flex items-center gap-1.5">
                  <X className="w-4 h-4 flex-shrink-0" /> {error}
                </p>
              )}

              {/* CTA */}
              <button
                onClick={handleCheckout}
                disabled={loading || meLoading}
                className="mt-5 w-full h-14 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 bg-gradient-to-r from-brand-primary to-brand-border text-white shadow-lg shadow-brand-primary/20 hover:shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:hover:translate-y-0"
              >
                {loading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : loggedIn ? (
                  <>
                    <Crown className="w-5 h-5" />
                    Start Pro — {active.price}{active.per}
                  </>
                ) : (
                  <>Create account &amp; get Pro</>
                )}
              </button>

              {/* Trust row */}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-gray-500">
                <span className="flex items-center gap-1.5"><Lock className="w-3.5 h-3.5" /> Secure checkout</span>
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Powered by Stripe</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5" /> Cancel anytime</span>
              </div>
            </div>

            {/* What's included */}
            <div className="border-t border-gray-100 bg-gray-50/60 p-6 sm:p-8">
              <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4">
                Everything in Pro
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Learning-sheet activity showcase */}
          <div className="mt-8 rounded-2xl border border-brand-primary/30 bg-zinc-900/60 p-6 sm:p-8">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-brand-primary" />
              <h2 className="text-base font-bold text-white">Richer learning sheets</h2>
            </div>
            <p className="text-sm text-gray-400 mb-6">
              Free gives one activity per topic. Pro packs in a second, age-matched activity —
              tracing, letter hunts, word searches and writing — so every sheet keeps kids busy.
            </p>
            <ProActivityPreviews />
          </div>

          {/* Free vs Pro */}
          <div className="mt-8 bg-zinc-800/50 border border-zinc-700 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-3 text-sm">
              <div className="p-4 font-semibold text-gray-400">What you get</div>
              <div className="p-4 text-center font-semibold text-gray-400 border-l border-zinc-700">Free</div>
              <div className="p-4 text-center font-bold text-brand-primary border-l border-zinc-700 bg-brand-primary/5">Pro</div>
              {[
                ['Colouring pages', '3 / day', 'Unlimited'],
                ['Learning activities', '1 per sheet', 'Full multi-activity sheets'],
                ['Watermark', 'Yes', 'None'],
                ['Processing speed', 'Standard', 'Priority'],
              ].map(([label, free, pro], i) => (
                <div key={label} className="contents">
                  <div className={`p-4 text-gray-300 ${i > 0 ? 'border-t border-zinc-700/60' : ''}`}>{label}</div>
                  <div className={`p-4 text-center text-gray-500 border-l border-zinc-700 ${i > 0 ? 'border-t border-zinc-700/60' : ''}`}>{free}</div>
                  <div className={`p-4 text-center text-white font-medium border-l border-zinc-700 bg-brand-primary/5 ${i > 0 ? 'border-t border-zinc-700/60' : ''}`}>{pro}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Reassurance */}
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-400">
              Change your mind? Cancel in one tap from{' '}
              <Link href="/account" className="text-brand-primary font-semibold hover:underline">My Account</Link>.
              Already Pro?{' '}
              <Link href="/account" className="text-brand-primary font-semibold hover:underline">Manage billing</Link>.
            </p>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
