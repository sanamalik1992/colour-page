'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import { Logo } from './logo'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-gray-200">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 max-w-6xl mx-auto">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="text-gray-900 group-hover:scale-110 transition-transform">
                <Logo className="w-10 h-10" />
              </div>
              <span className="font-bold text-xl text-gray-900 hidden sm:inline">
                colour.page
              </span>
            </Link>
            
            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className="px-4 py-2 text-base font-semibold text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Create
              </Link>
              <Link
                href="/print"
                className="px-4 py-2 text-base font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-xl transition-colors"
              >
                Print
              </Link>
            </nav>
          </div>

          {/* Right: Search + Pro */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button className="hidden sm:flex items-center gap-2 w-64 h-10 px-4 bg-gray-100 hover:bg-gray-200 rounded-xl text-sm text-gray-600 transition-colors">
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <kbd className="ml-auto px-2 py-0.5 bg-white text-xs text-gray-500 rounded-md border border-gray-300">
                ⌘K
              </kbd>
            </button>
            
            {/* Pro Button */}
            <Link
              href="/pro"
              className="h-10 px-6 font-bold text-sm rounded-xl transition-all hover:shadow-md text-white"
              style={{
                background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
              }}
            >
              Pro
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}