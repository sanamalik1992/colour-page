'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 max-w-[1280px] mx-auto">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-xl flex items-center justify-center shadow-sm">
                <span className="text-white text-xl">🎨</span>
              </div>
              <span className="font-bold text-lg hidden sm:inline">colour.page</span>
            </Link>
            
            <nav className="hidden md:flex items-center">
              <Link
                href="/"
                className="px-3 py-1.5 text-sm font-semibold text-gray-900 hover:text-primary-500 transition-colors"
              >
                Create
              </Link>
              <Link
                href="/print"
                className="px-3 py-1.5 text-sm font-semibold text-gray-600 hover:text-primary-500 transition-colors"
              >
                Print
              </Link>
            </nav>
          </div>

          {/* Right: Search + Pro + Avatar */}
          <div className="flex items-center gap-3">
            {/* Search trigger */}
            <button className="relative hidden sm:block w-[280px] h-9 pl-10 pr-4 bg-gray-50 border border-gray-200 rounded-full text-sm text-left text-gray-500 hover:border-gray-300 transition-colors">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <span>Search...</span>
              <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-0.5 bg-gray-100 text-xs rounded">K</kbd>
            </button>
            
            {/* Pro button */}
            <Link
              href="/pro"
              className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-full text-sm shadow-sm transition-all"
            >
              Pro
            </Link>
            
            {/* Avatar placeholder */}
            <button className="w-9 h-9 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-semibold text-xs hover:border-primary-500 transition-colors">
              S
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}