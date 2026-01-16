'use client'

import Link from 'next/link'
import { Search } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-16 max-w-6xl mx-auto">
          {/* Left: Logo + Nav */}
          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
                <span className="text-white text-lg">🎨</span>
              </div>
              <span className="font-bold text-lg text-gray-900 hidden sm:inline">
                colour.page
              </span>
            </Link>
            
            {/* Nav */}
            <nav className="hidden md:flex items-center gap-1">
              <Link
                href="/"
                className="px-3 py-2 text-sm font-medium text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Create
              </Link>
              <Link
                href="/print"
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-lg transition-colors"
              >
                Print
              </Link>
            </nav>
          </div>

          {/* Right: Search + Pro + Avatar */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <button className="hidden sm:flex items-center gap-2 w-64 h-9 px-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm text-gray-600 transition-colors">
              <Search className="w-4 h-4" />
              <span>Search...</span>
              <kbd className="ml-auto px-1.5 py-0.5 bg-white text-xs text-gray-500 rounded">
                ⌘K
              </kbd>
            </button>
            
            {/* Pro Button */}
            <Link
              href="/pro"
              className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white font-semibold rounded-lg text-sm transition-all hover:shadow-md"
            >
              Pro
            </Link>
            
            {/* Avatar */}
            <button className="w-9 h-9 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-700 font-medium text-xs hover:border-primary-500 hover:bg-primary-50 transition-colors">
              S
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}