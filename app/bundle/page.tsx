'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  Printer,
  Package,
  ClipboardList,
  Palette,
  FileStack,
  Truck,
  Check,
  ArrowLeft,
} from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'

// What's in the box. Paper is matched to the printer's thermal format so it
// works straight away.
const CONTENTS = [
  { icon: Printer, title: 'Portable colouring printer', desc: 'The inkless Bluetooth thermal printer — prints A4 sheets straight from your phone.' },
  { icon: FileStack, title: 'A4 thermal paper', desc: 'A pack of matching thermal paper, the exact format the printer uses — no guessing, ready to print.' },
  { icon: ClipboardList, title: 'Black A4 clipboard', desc: 'A sturdy A4 clipboard so little ones can colour anywhere — car, café, kitchen table.' },
  { icon: Palette, title: 'Felt-tip pen pack', desc: 'A pack of bright, washable felt tips — perfect for bringing the printed sheets to life.' },
]

export default function BundlePage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('purchase')
    if (p === 'success' || p === 'cancelled') setBanner(p)
  }, [])

  const buy = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/bundle-checkout', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.url) throw new Error(data.error || 'Could not start checkout')
      window.location.assign(data.url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-bg">
      <NavHeader active="shop" />

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {banner === 'success' && (
          <div className="max-w-4xl mx-auto mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 px-4 py-3 text-sm">
            🎉 Thank you! Your bundle is confirmed — you’ll get an email receipt, and it’s on its way with free delivery.
          </div>
        )}
        {banner === 'cancelled' && (
          <div className="max-w-4xl mx-auto mb-6 rounded-xl border border-zinc-700 bg-zinc-800/60 text-gray-300 px-4 py-3 text-sm">
            No worries — your order was cancelled and you have not been charged.
          </div>
        )}

        <Link href="/shop" className="max-w-5xl mx-auto flex items-center gap-1.5 text-sm text-gray-400 hover:text-white mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to shop
        </Link>

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Image */}
          <div>
            <div className="aspect-[4/3] rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/shop/bundle.webp" alt="Everything Bundle: printer, A4 thermal paper, black A4 clipboard and felt-tip pack" className="w-full h-full object-cover" />
            </div>
          </div>

          {/* Details */}
          <div>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-primary/15 text-brand-primary text-xs font-bold">
              <Package className="w-3.5 h-3.5" /> Best value bundle
            </span>
            <h1 className="mt-3 font-display text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Everything Bundle
            </h1>
            <p className="mt-3 text-gray-300">
              Everything you need to print and colour, in one box: the portable inkless printer, a pack
              of matching A4 thermal paper, a black A4 clipboard and a felt-tip pen pack. Unbox, connect,
              and print your first colouring sheet in minutes.
            </p>

            <div className="mt-5 flex items-end gap-3">
              <span className="text-4xl font-extrabold text-white">£59.99</span>
              <span className="inline-flex items-center gap-1.5 text-emerald-300 text-sm font-semibold mb-1">
                <Truck className="w-4 h-4" /> Free UK delivery
              </span>
            </div>

            <button
              onClick={buy}
              disabled={loading}
              className="mt-5 w-full py-3.5 rounded-xl bg-brand-primary text-[#2A1E00] font-bold text-lg flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Starting checkout…</>
              ) : (
                <>Buy the bundle — £59.99</>
              )}
            </button>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

            <ul className="mt-4 space-y-1.5 text-sm text-gray-400">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Paper matched to the printer — ready to go</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Secure checkout by Stripe</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Free delivery, no hidden fees</li>
            </ul>
          </div>
        </div>

        {/* What's in the box */}
        <div className="max-w-5xl mx-auto mt-14">
          <h2 className="font-display text-2xl font-bold text-white text-center mb-8">What’s in the box</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {CONTENTS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 flex gap-4">
                <div className="w-11 h-11 rounded-lg bg-brand-primary/15 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-6 h-6 text-brand-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">{title}</h3>
                  <p className="text-sm text-gray-400 mt-1">{desc}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-8 max-w-2xl mx-auto">
            Prefer just the printer? See the{' '}
            <Link href="/printer" className="text-brand-primary hover:underline">standalone printer</Link>. Thermal
            printer prints in black on the included A4 thermal paper. Connects via Bluetooth or USB-C; works
            with iOS, Android, Windows and macOS.
          </p>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
