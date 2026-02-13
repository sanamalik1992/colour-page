'use client'

import Link from 'next/link'
import { Sparkles, ImagePlus, Crown, CircleDot, Printer } from 'lucide-react'

interface NavHeaderProps {
  active?: 'create' | 'library' | 'print-pages' | 'dot-to-dot' | 'pro'
  isPro?: boolean
}

export function NavHeader({ active, isPro }: NavHeaderProps) {
  const linkClass = (key: string) =>
    `px-3 py-2 text-sm font-semibold rounded-lg flex items-center gap-1.5 transition-colors whitespace-nowrap ${
      active === key
        ? 'text-brand-primary bg-zinc-800/50'
        : 'text-gray-400 hover:text-white hover:bg-zinc-800'
    }`

  return (
    <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          <Link href="/" className="text-white font-bold text-lg flex-shrink-0">
            colour<span className="text-brand-primary">.</span>page
          </Link>

          <nav className="flex items-center gap-0.5">
            <Link href="/create" className={linkClass('create')}>
              <ImagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </Link>
            <Link href="/dot-to-dot" className={linkClass('dot-to-dot')}>
              <CircleDot className="w-4 h-4" />
              <span className="hidden md:inline">Dot-to-Dot</span>
            </Link>
            <Link href="/print-pages" className={linkClass('print-pages')}>
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Library</span>
            </Link>
            {isPro ? (
              <Link
                href="/library"
                className="ml-1 h-8 px-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-xs rounded-lg flex items-center hover:opacity-90 transition-opacity"
              >
                <Crown className="w-3.5 h-3.5 mr-1" />
                Pro
              </Link>
            ) : (
              <Link
                href="/pro"
                className="ml-1 h-8 px-3 bg-brand-primary text-white font-semibold text-xs rounded-lg flex items-center hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                Pro
              </Link>
            )}
          </nav>
        </div>
      </div>
    </header>
  )
}
