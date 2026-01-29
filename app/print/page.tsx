'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Download, Printer, X, Sparkles, Loader2, TrendingUp } from 'lucide-react'

interface ColouringPage {
  id: string
  title: string
  slug: string
  category: string
  preview_url: string
  download_count: number
  trend_score: number
}

const CATEGORIES = ['All', 'Trending', 'Animals', 'Fantasy', 'Vehicles', 'Nature', 'Space', 'Ocean', 'Dinosaurs', 'Seasonal', 'Food', 'Sports']

export default function PrintLibraryPage() {
  const [pages, setPages] = useState<ColouringPage[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [sortBy, setSortBy] = useState<'trending' | 'newest' | 'popular'>('trending')

  useEffect(() => {
    loadPages()
  }, [selectedCategory, sortBy])

  const loadPages = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '50',
        sort: sortBy,
        ...(selectedCategory !== 'All' && selectedCategory !== 'Trending' ? { category: selectedCategory } : {})
      })
      
      const res = await fetch(`/api/trending?${params}`)
      const data = await res.json()
      
      if (data.pages && data.pages.length > 0) {
        setPages(data.pages)
      } else {
        setPages([])
      }
    } catch (error) {
      console.error('Failed to load pages:', error)
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  const filteredPages = pages.filter(page => {
    if (!searchQuery) return true
    return page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           page.category.toLowerCase().includes(searchQuery.toLowerCase())
  })

  const handlePrint = (page: ColouringPage) => {
    const w = window.open('', '_blank')
    if (w && page.preview_url) {
      w.document.write(`<!DOCTYPE html><html><head><title>${page.title}</title><style>@page{size:A4;margin:0.5in}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:white}img{max-width:100%;max-height:90vh}</style></head><body><img src="${page.preview_url}" onload="setTimeout(function(){window.print()},500)"/></body></html>`)
      w.document.close()
    }
    // Track download
    fetch(`/api/colouring-pages/${page.slug}/download`, { method: 'POST' }).catch(() => {})
  }

  const handleDownload = async (page: ColouringPage) => {
    if (!page.preview_url) return
    
    try {
      const res = await fetch(page.preview_url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${page.slug}.png`
      a.click()
      URL.revokeObjectURL(url)
      
      // Track download
      fetch(`/api/colouring-pages/${page.slug}/download`, { method: 'POST' }).catch(() => {})
    } catch {
      window.open(page.preview_url, '_blank')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12">
            <Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/print" className="px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-zinc-800 rounded-lg flex items-center gap-2">
              <Printer className="w-4 h-4" />Print Library
            </Link>
            <Link href="/dot-to-dot" className="px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-zinc-800 rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4" />Dot-to-Dot
            </Link>
          </nav>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-4 py-2 mb-4">
            <TrendingUp className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-medium text-brand-primary">Updated Daily</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Trending Colouring Pages</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">Free printable colouring pages updated daily with trending topics. Download, print, and colour!</p>
        </div>

        {/* Search */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search colouring pages..." 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              className="w-full h-14 pl-12 pr-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary" 
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Sort */}
        <div className="flex justify-center gap-2 mb-6">
          {(['trending', 'newest', 'popular'] as const).map(sort => (
            <button
              key={sort}
              onClick={() => setSortBy(sort)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                sortBy === sort
                  ? 'bg-brand-primary text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              {sort.charAt(0).toUpperCase() + sort.slice(1)}
            </button>
          ))}
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                selectedCategory === cat
                  ? 'bg-brand-primary text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </section>

      {/* Gallery */}
      <section className="container mx-auto px-6 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
            <p className="text-gray-400">Loading colouring pages...</p>
          </div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-400 mb-4">No colouring pages found yet.</p>
            <p className="text-gray-500 text-sm">New pages are generated daily. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredPages.map(page => (
              <div key={page.id} className="group">
                <Link 
                  href={`/colouring-pages/${page.slug}`}
                  className="block bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="aspect-[3/4] relative bg-gray-50">
                    {page.preview_url ? (
                      <img 
                        src={page.preview_url} 
                        alt={page.title} 
                        className="w-full h-full object-contain p-2" 
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Printer className="w-12 h-12" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleDownload(page) }}
                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors shadow-lg"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); handlePrint(page) }}
                        className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors shadow-lg"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">{page.title}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-gray-500">{page.category}</span>
                      <span className="text-xs text-gray-400">{page.download_count?.toLocaleString() || 0} downloads</span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* CTA */}
      <section className="container mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-brand-primary/20 to-brand-border/20 border border-brand-primary/30 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Create Your Own Colouring Pages</h2>
          <p className="text-gray-400 mb-8 max-w-xl mx-auto">Upload any photo and our AI transforms it into a printable colouring page instantly!</p>
          <Link href="/" className="inline-flex h-14 px-8 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-xl items-center gap-2 hover:opacity-90 transition-opacity">
            <Sparkles className="w-5 h-5" />
            Create Custom Page
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">© 2025 colour.page</span>
          <div className="flex gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
