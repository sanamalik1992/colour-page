'use client'

import Link from 'next/link'
import { Sparkles, ImagePlus, Crown, CircleDot, LayoutGrid, FolderHeart } from 'lucide-react'

interface NavHeaderProps {
  active?: 'create' | 'library' | 'print-pages' | 'dot-to-dot' | 'pro'
  isPro?: boolean
}

const NAV_ITEMS = [
  { key: 'create', href: '/', label: 'Create', icon: ImagePlus, showLabel: 'sm' },
  { key: 'dot-to-dot', href: '/dot-to-dot', label: 'Dot-to-Dot', icon: CircleDot, showLabel: 'md' },
  { key: 'print-pages', href: '/print-pages', label: 'Gallery', icon: LayoutGrid, showLabel: 'sm' },
  { key: 'library', href: '/library', label: 'My Pages', icon: FolderHeart, showLabel: 'sm' },
] as const

export function NavHeader({ active, isPro }: NavHeaderProps) {
  const linkClass = (key: string) =>
    `px-2.5 sm:px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
      active === key
        ? 'text-brand-primary bg-zinc-800/60'
        : 'text-gray-400 hover:text-white hover:bg-zinc-800'
    }`

  return (
    <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-white font-bold text-lg flex-shrink-0 mr-1">
            colour<span className="text-brand-primary">.</span>page
          </Link>

          <nav className="flex items-center gap-0.5">
            {NAV_ITEMS.map(({ key, href, label, icon: Icon, showLabel }) => (
              <Link key={key} href={href} className={linkClass(key)} aria-current={active === key ? 'page' : undefined}>
                <Icon className="w-4 h-4" />
                <span className={showLabel === 'md' ? 'hidden md:inline' : 'hidden sm:inline'}>{label}</span>
              </Link>
            ))}

            {isPro ? (
              <Link
                href="/account"
                className="ml-1 h-8 px-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-xs rounded-lg flex items-center hover:opacity-90 transition-opacity"
              >
                <Crown className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Pro</span>
              </Link>
            ) : (
              <Link
                href="/pro"
                className={`ml-1 h-8 px-3 font-semibold text-xs rounded-lg flex items-center hover:opacity-90 transition-opacity ${
                  active === 'pro'
                    ? 'bg-brand-border text-white'
                    : 'bg-brand-primary text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 sm:mr-1" />
                <span className="hidden sm:inline">Pro</span>
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
