'use client'

import Link from 'next/link'
import { Printer, Package, Truck, ArrowRight, Check } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'

// The shop is a small physical-goods storefront that sits alongside the digital
// product. Two items today: the standalone printer and the everything bundle.
const PRODUCTS: {
  href: string
  name: string
  price: string
  blurb: string
  includes: string[]
  image?: string
  // Product shot on a white studio background — show it on a white tile so it
  // sits cleanly on the dark page instead of on a dark tile.
  lightImage?: boolean
  icon: typeof Printer
  badge?: string
}[] = [
  {
    href: '/printer',
    name: 'Portable Colouring Printer',
    price: '£49.99',
    blurb:
      'Inkless thermal printer — print activity and colouring sheets straight from your phone over Bluetooth. A4 & 8.5×11.',
    includes: ['Just the printer', 'Bluetooth + USB-C', 'No ink, ever'],
    image: '/printer/5-portable.webp',
    icon: Printer,
  },
  {
    href: '/bundle',
    name: 'Everything Bundle',
    price: '£59.99',
    blurb:
      'The printer plus everything you need to print and colour, in one box — matching A4 thermal paper, a black A4 clipboard and a felt-tip pen pack.',
    includes: ['Printer', 'A4 thermal paper', 'Black A4 clipboard', 'Felt-tip pack'],
    image: '/shop/bundle.webp',
    lightImage: true,
    icon: Package,
    badge: 'Best value',
  },
]

export default function ShopPage() {
  return (
    <div className="min-h-screen app-bg">
      <NavHeader active="shop" />

      <main className="container mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-white">Shop</h1>
          <p className="mt-3 text-gray-300">
            Turn your colour.page sheets into real, printed pages to colour anywhere. Free UK delivery.
          </p>
        </div>

        <div className="max-w-4xl mx-auto grid sm:grid-cols-2 gap-6">
          {PRODUCTS.map((p) => (
            <Link
              key={p.href}
              href={p.href}
              className="group flex flex-col rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden hover:border-brand-primary/60 transition-colors"
            >
              <div className={`relative aspect-[4/3] flex items-center justify-center overflow-hidden ${p.lightImage ? 'bg-white p-3' : 'bg-zinc-950/40'}`}>
                {p.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image} alt={p.name} className={`w-full h-full ${p.lightImage ? 'object-contain' : 'object-cover'}`} />
                ) : (
                  <p.icon className="w-16 h-16 text-gray-600" />
                )}
                {p.badge && (
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-brand-primary text-[#2A1E00] text-xs font-bold">
                    {p.badge}
                  </span>
                )}
              </div>

              <div className="flex flex-col flex-1 p-5">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-display text-xl font-bold text-white">{p.name}</h2>
                  <span className="text-xl font-extrabold text-white whitespace-nowrap">{p.price}</span>
                </div>
                <p className="mt-2 text-sm text-gray-400">{p.blurb}</p>

                <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
                  {p.includes.map((inc) => (
                    <li key={inc} className="flex items-center gap-1.5 text-xs text-gray-300">
                      <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> {inc}
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-4 border-t border-zinc-800 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 text-emerald-300 text-xs font-semibold">
                    <Truck className="w-4 h-4" /> Free UK delivery
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-brand-primary text-sm font-semibold group-hover:gap-2.5 transition-all">
                    View <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
