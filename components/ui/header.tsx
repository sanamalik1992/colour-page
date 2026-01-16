'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative w-12 h-12 group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="colour.page"
                fill
                className="object-contain"
                priority
                unoptimized
              />
            </div>
          </Link>
          
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-zinc-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              Create
            </Link>
            <Link
              href="/print"
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              Print
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 w-56 h-10 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm text-gray-400 transition-colors border border-zinc-700 focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-zinc-900">
              <Search className="w-4 h-4" />
              <span>Search...</span>
            </button>
            
            <Link
              href="/pro"
              className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border hover:from-brand-border hover:to-brand-hover text-white font-semibold text-sm rounded-lg transition-all flex items-center shadow-md hover:shadow-glow focus:outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2 focus:ring-offset-zinc-900"
            >
              Pro
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}