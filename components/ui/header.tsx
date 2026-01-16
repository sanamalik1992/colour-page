'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Search } from 'lucide-react'

export function Header() {
  return (
    <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
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
          
          {/* Nav */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/"
              className="px-4 py-2 text-sm font-semibold text-emerald-400 hover:bg-gray-800 rounded-lg transition-colors"
            >
              Create
            </Link>
            <Link
              href="/print"
              className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
            >
              Print
            </Link>
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            <button className="hidden sm:flex items-center gap-2 w-56 h-10 px-4 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-400 transition-colors border border-gray-700">
              <Search className="w-4 h-4" />
              <span>Search...</span>
            </button>
            
            <Link
              href="/pro"
              className="h-10 px-5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white font-semibold text-sm rounded-lg transition-all flex items-center"
            >
              Pro
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}