'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'
import Image from 'next/image'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 max-w-6xl mx-auto">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-6">
            {/* Logo - BIGGER SIZE */}
            <Link href="/" className="group">
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
            
            {/* Nav */}
            <nav className="hidden md:flex items-center gap-0.5">
              <Link
                href="/"
                className="px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Create
              </Link>
              <Link
                href="/print"
                className="px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
              >
                Print
              </Link>
            </nav>
          </div>

          {/* Right: Search + Pro */}
          <div className="flex items-center gap-2.5">
            <button className="hidden sm:flex items-center gap-2 w-56 h-9 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors">
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <kbd className="ml-auto px-1.5 py-0.5 bg-white text-xs text-gray-500 rounded border border-gray-300">
                ⌘K
              </kbd>
            </button>
            
            <Link
              href="/pro"
              className="h-9 px-5 font-semibold text-sm rounded-lg transition-all hover:shadow-sm text-white"
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