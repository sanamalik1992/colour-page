'use client'

import { useEffect, useState } from 'react'
import {
  Loader2,
  Bluetooth,
  Printer,
  BatteryCharging,
  Sparkles,
  Truck,
  Ban,
  Smartphone,
  Check,
} from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'

// Product photos live in /public/printer. Leave src empty to show a labelled
// placeholder slot instead.
const GALLERY: { src?: string; label: string }[] = [
  { src: '/printer/1-easy-for-parents.webp', label: 'Easy for parents, fun for kids' },
  { src: '/printer/2-print-anywhere.webp', label: 'Print colouring pages anywhere' },
  { src: '/printer/3-print-colour-enjoy.webp', label: 'Print, colour, enjoy' },
  { src: '/printer/4-learning-and-fun.webp', label: 'Learning & fun in one printer' },
  { src: '/printer/5-portable.webp', label: 'Small, portable & ready to go' },
]

const SPECS = [
  { icon: Ban, title: 'Inkless — no cartridges', desc: 'Thermal printing, so there is no ink or toner to ever buy or replace.' },
  { icon: Bluetooth, title: 'Bluetooth + USB-C', desc: 'Connect wirelessly or by cable — pairs in seconds, no fiddly setup.' },
  { icon: Smartphone, title: 'Phone, tablet & computer', desc: 'Works with iOS, Android, Windows and macOS — print from almost anything.' },
  { icon: Printer, title: 'A4 & 8.5×11 paper', desc: 'Full-size thermal paper — proper worksheets, not tiny sticker prints.' },
  { icon: BatteryCharging, title: 'Lightweight & portable', desc: 'Just 440 g and 25.1 × 5.4 × 3.2 cm — slips into a bag for anywhere.' },
  { icon: Sparkles, title: 'Colouring, activities & more', desc: 'Colouring pages, mazes, tracing, reward charts, maths — fresh sheets on demand.' },
]

export default function PrinterPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(null)
  const [active, setActive] = useState(0)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get('purchase')
    if (p === 'success' || p === 'cancelled') setBanner(p)
  }, [])

  const buy = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/printer-checkout', { method: 'POST' })
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
      <NavHeader />

      <main className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {banner === 'success' && (
          <div className="max-w-4xl mx-auto mb-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-200 px-4 py-3 text-sm">
            🎉 Thank you! Your order is confirmed — you’ll get an email receipt, and your printer is on its way with free delivery.
          </div>
        )}
        {banner === 'cancelled' && (
          <div className="max-w-4xl mx-auto mb-6 rounded-xl border border-zinc-700 bg-zinc-800/60 text-gray-300 px-4 py-3 text-sm">
            No worries — your order was cancelled and you have not been charged.
          </div>
        )}

        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8 lg:gap-12">
          {/* Gallery */}
          <div>
            <div className="aspect-square rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden flex items-center justify-center">
              {GALLERY[active].src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={GALLERY[active].src} alt={GALLERY[active].label} className="w-full h-full object-cover" />
              ) : (
                <div className="text-center text-gray-500 px-6">
                  <Printer className="w-14 h-14 mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-medium">{GALLERY[active].label}</p>
                  <p className="text-xs mt-1 text-gray-600">Photo coming soon</p>
                </div>
              )}
            </div>
            <div className="mt-3 grid grid-cols-4 gap-3">
              {GALLERY.map((g, i) => (
                <button
                  key={i}
                  onClick={() => setActive(i)}
                  aria-label={g.label}
                  className={`aspect-square rounded-lg border flex items-center justify-center overflow-hidden transition-colors ${
                    active === i ? 'border-brand-primary' : 'border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {g.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={g.src} alt={g.label} className="w-full h-full object-cover" />
                  ) : (
                    <Printer className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div>
            <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white leading-tight">
              Portable Bluetooth Colouring Printer
            </h1>
            <p className="mt-3 text-gray-300">
              Print activity and colouring sheets straight from your phone, anywhere. A lightweight
              440 g inkless printer that connects over Bluetooth or USB-C and never needs an ink
              cartridge — just load thermal paper and go.
            </p>

            <div className="mt-5 flex items-end gap-3">
              <span className="text-4xl font-extrabold text-white">£49.99</span>
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
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Starting checkout…
                </>
              ) : (
                <>Buy now — £49.99</>
              )}
            </button>
            {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

            <ul className="mt-4 space-y-1.5 text-sm text-gray-400">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Secure checkout by Stripe</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Free delivery, no hidden fees</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-emerald-400" /> Works hand-in-hand with colour.page sheets</li>
            </ul>
          </div>
        </div>

        {/* Specs */}
        <div className="max-w-5xl mx-auto mt-14">
          <h2 className="font-display text-2xl font-bold text-white text-center mb-8">Why families love it</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SPECS.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
                <Icon className="w-6 h-6 text-brand-primary mb-3" />
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="text-sm text-gray-400 mt-1">{desc}</p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs text-gray-600 mt-8 max-w-2xl mx-auto">
            Thermal printer prints in black on thermal paper. Requires compatible A4 or 8.5×11 thermal
            paper (not included). Connects via Bluetooth or USB-C; works with iOS, Android, Windows and macOS.
          </p>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
