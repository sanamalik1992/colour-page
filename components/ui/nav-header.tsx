'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Printer, Sparkles, BookOpen, ImagePlus, Crown, CircleDot } from 'lucide-react'

interface NavHeaderProps {
  active?: 'create' | 'library' | 'print-pages' | 'dot-to-dot' | 'pro'
  isPro?: boolean
}

export function NavHeader({ active, isPro }: NavHeaderProps) {
  const linkClass = (key: string) =>
    `px-4 py-2 text-sm font-semibold rounded-lg flex items-center gap-2 transition-colors ${
      active === key
        ? 'text-brand-primary bg-zinc-800/50'
        : 'text-gray-400 hover:text-white hover:bg-zinc-800'
    }`

  return (
    <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="relative w-10 h-10 flex-shrink-0">
            <Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized />
          </Link>

          <nav className="flex items-center gap-1">
            <Link href="/create" className={linkClass('create')}>
              <ImagePlus className="w-4 h-4" />
              <span className="hidden sm:inline">Create</span>
            </Link>
            <Link href="/dot-to-dot" className={linkClass('dot-to-dot')}>
              <CircleDot className="w-4 h-4" />
              <span className="hidden sm:inline">Dot-to-Dot</span>
            </Link>
            <Link href="/library" className={linkClass('library')}>
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">My Library</span>
            </Link>
            <Link href="/print-pages" className={linkClass('print-pages')}>
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print Pages</span>
            </Link>
          </nav>

          {isPro ? (
            <Link
              href="/account"
              className="h-9 px-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold text-sm rounded-lg flex items-center shadow-md hover:opacity-90 transition-opacity"
            >
              <Crown className="w-4 h-4 mr-1.5" />
              Pro
            </Link>
          ) : (
            <Link
              href="/pro"
              className="h-9 px-4 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4 mr-1.5" />
              Pro
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
