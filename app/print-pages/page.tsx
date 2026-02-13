'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import {
  Search,
  Download,
  Printer,
  X,
  Loader2,
  Star,
  Sparkles,
  Calendar,
  TrendingUp,
  Filter,
  AlertTriangle,
} from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { PRINT_PAGE_CATEGORIES, SEASONS } from '@/types/photo-job'

interface PrintPageItem {
  id: string
  title: string
  slug: string
  description?: string
  category: string
  tags: string[]
  season?: string
  featured: boolean
  download_count: number
  view_count: number
  preview_url?: string
  pdf_url?: string
}

const SEASON_LABELS: Record<string, string> = {
  ramadan: 'Ramadan',
  eid: 'Eid',
  christmas: 'Christmas',
  halloween: 'Halloween',
  easter: 'Easter',
  winter: 'Winter',
  spring: 'Spring',
  summer: 'Summer',
  autumn: 'Autumn',
  diwali: 'Diwali',
  'new-year': 'New Year',
  valentines: "Valentine's",
  'mothers-day': "Mother's Day",
  'fathers-day': "Father's Day",
}

export default function PrintPagesPage() {
  const [pages, setPages] = useState<PrintPageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSeason, setSelectedSeason] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'featured' | 'newest' | 'popular'>('featured')
  const [currentSeason, setCurrentSeason] = useState<string | null>(null)
  const [total, setTotal] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  // Search suggestions state
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [copyrightWarning, setCopyrightWarning] = useState<{ message: string; alternatives: string[] } | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>(null)

  // Fetch suggestions on input
  const fetchSuggestions = useCallback(async (q: string) => {
    try {
      const res = await fetch(`/api/search-suggestions?q=${encodeURIComponent(q)}`)
      const data = await res.json()

      if (data.blocked) {
        setCopyrightWarning({ message: data.message, alternatives: data.alternatives })
        setSuggestions([])
      } else {
        setCopyrightWarning(null)
        setSuggestions(data.suggestions || [])
      }
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    }
  }, [])

  const handleSearchInput = (value: string) => {
    setSearchQuery(value)
    setCopyrightWarning(null)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length >= 2) {
      debounceRef.current = setTimeout(() => fetchSuggestions(value), 300)
    } else if (value.length === 0) {
      fetchSuggestions('')
    } else {
      setSuggestions([])
      setShowSuggestions(false)
    }
  }

  const handleSuggestionClick = (term: string) => {
    setSearchQuery(term)
    setShowSuggestions(false)
    setCopyrightWarning(null)
    // Track the search
    fetch('/api/search-suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ term }),
    }).catch(() => {})
  }

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const loadPages = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit: '48',
        sort: sortBy,
      })

      if (selectedCategory !== 'All') params.set('category', selectedCategory)
      if (selectedSeason) params.set('season', selectedSeason)
      if (searchQuery) params.set('search', searchQuery)

      const res = await fetch(`/api/print-pages?${params}`)
      const data = await res.json()

      setPages(data.pages || [])
      setTotal(data.total || 0)
      if (data.currentSeason) setCurrentSeason(data.currentSeason)
    } catch {
      setPages([])
    } finally {
      setLoading(false)
    }
  }, [selectedCategory, selectedSeason, sortBy, searchQuery])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  // Track search on submit
  useEffect(() => {
    if (searchQuery.length >= 3) {
      const timer = setTimeout(() => {
        fetch('/api/search-suggestions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ term: searchQuery }),
        }).catch(() => {})
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [searchQuery])

  const handlePrint = (page: PrintPageItem) => {
    if (!page.preview_url) return
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(
        `<!DOCTYPE html><html><head><title>${page.title}</title><style>@page{size:A4;margin:0.5in}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:white}img{max-width:100%;max-height:90vh}</style></head><body><img src="${page.preview_url}" onload="setTimeout(function(){window.print()},500)"/></body></html>`
      )
      w.document.close()
    }
  }

  const handleDownload = async (page: PrintPageItem) => {
    try {
      const res = await fetch('/api/print-pages/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId: page.id }),
      })
      const data = await res.json()

      if (data.url) {
        const a = document.createElement('a')
        a.href = data.url
        a.download = data.filename || `${page.slug}.pdf`
        a.click()
      }
    } catch {
      // Fallback to PNG
      if (page.preview_url) {
        window.open(page.preview_url, '_blank')
      }
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <NavHeader active="print-pages" />

      <main className="container mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-brand-primary/10 border border-brand-primary/20 rounded-full px-4 py-1.5 mb-4">
            <Printer className="w-4 h-4 text-brand-primary" />
            <span className="text-sm font-medium text-brand-primary">Free to Print</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">Print Pages</h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Browse our library of original colouring sheets. Download, print, and colour!
          </p>
        </div>

        {/* Search with Typeahead */}
        <div className="max-w-xl mx-auto mb-6" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search colouring pages..."
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              onFocus={() => { if (suggestions.length > 0 || searchQuery.length === 0) fetchSuggestions(searchQuery) }}
              className="w-full h-12 pl-12 pr-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary transition-colors"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setCopyrightWarning(null); setShowSuggestions(false) }} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}

            {/* Copyright Warning */}
            {copyrightWarning && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 z-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-400 mb-2">{copyrightWarning.message}</p>
                    <div className="flex flex-wrap gap-2">
                      {copyrightWarning.alternatives.map(alt => (
                        <button
                          key={alt}
                          onClick={() => handleSuggestionClick(alt)}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded-full transition-colors"
                        >
                          {alt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && !copyrightWarning && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl overflow-hidden z-50 shadow-xl">
                {!searchQuery && <p className="px-4 pt-3 pb-1 text-xs text-gray-500 font-semibold uppercase">Popular Searches</p>}
                {suggestions.map(s => (
                  <button
                    key={s}
                    onClick={() => handleSuggestionClick(s)}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-300 hover:bg-zinc-700 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <Search className="w-3.5 h-3.5 text-gray-500" />
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sort tabs */}
        <div className="flex justify-center gap-2 mb-5">
          {([
            { key: 'featured', icon: Star, label: 'Featured' },
            { key: 'newest', icon: TrendingUp, label: 'New' },
            { key: 'popular', icon: Download, label: 'Popular' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setSortBy(key)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                sortBy === key
                  ? 'bg-brand-primary text-white'
                  : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Filter toggle */}
        <div className="flex justify-center mb-5">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <Filter className="w-4 h-4" />
            {showFilters ? 'Hide Filters' : 'Show Filters'}
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="max-w-4xl mx-auto space-y-4 mb-8">
            {/* Categories */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Category</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedCategory('All')}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    selectedCategory === 'All'
                      ? 'bg-brand-primary text-white'
                      : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                  }`}
                >
                  All
                </button>
                {PRINT_PAGE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedCategory === cat
                        ? 'bg-brand-primary text-white'
                        : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Seasons */}
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Season / Event
                {currentSeason && (
                  <span className="ml-2 text-brand-primary normal-case">
                    ({SEASON_LABELS[currentSeason] || currentSeason} now)
                  </span>
                )}
              </h3>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedSeason(null)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    !selectedSeason
                      ? 'bg-brand-primary text-white'
                      : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                  }`}
                >
                  All Seasons
                </button>
                {currentSeason && (
                  <button
                    onClick={() => setSelectedSeason(currentSeason)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                      selectedSeason === currentSeason
                        ? 'bg-brand-primary text-white'
                        : 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
                    }`}
                  >
                    <Calendar className="w-3 h-3" />
                    Seasonal Now
                  </button>
                )}
                {SEASONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSeason(s)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                      selectedSeason === s
                        ? 'bg-brand-primary text-white'
                        : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'
                    }`}
                  >
                    {SEASON_LABELS[s] || s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Results count */}
        {!loading && (
          <p className="text-center text-sm text-gray-500 mb-6">
            {total} page{total !== 1 ? 's' : ''} found
          </p>
        )}

        {/* Grid */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-brand-primary animate-spin mb-4" />
            <p className="text-gray-400">Loading print pages...</p>
          </div>
        ) : pages.length === 0 ? (
          <div className="text-center py-20">
            <Printer className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No pages found</h2>
            <p className="text-gray-400 mb-6">
              {searchQuery
                ? 'Try a different search term.'
                : 'New colouring pages are added regularly. Check back soon!'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {pages.map((page) => (
              <div key={page.id} className="group">
                <div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="aspect-[3/4] relative bg-gray-50">
                    {page.featured && (
                      <div className="absolute top-2 left-2 z-10 bg-amber-400 text-amber-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Star className="w-2.5 h-2.5" /> Featured
                      </div>
                    )}
                    {page.preview_url ? (
                      <img
                        src={page.preview_url}
                        alt={page.title}
                        className="w-full h-full object-contain p-2"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <Printer className="w-10 h-10" />
                      </div>
                    )}

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      <button
                        onClick={() => handleDownload(page)}
                        className="w-11 h-11 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors shadow-lg"
                        title="Download PDF"
                      >
                        <Download className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handlePrint(page)}
                        className="w-11 h-11 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors shadow-lg"
                        title="Print"
                      >
                        <Printer className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-2.5">
                    <h3 className="font-semibold text-gray-900 text-xs truncate">{page.title}</h3>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-gray-500">{page.category}</span>
                      <span className="text-[10px] text-gray-400">
                        {(page.download_count || 0).toLocaleString()} downloads
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-16 bg-gradient-to-r from-brand-primary/20 to-brand-border/20 border border-brand-primary/30 rounded-2xl p-10 text-center">
          <h2 className="text-2xl font-bold text-white mb-3">
            Create Custom Colouring Pages
          </h2>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Upload any photo and our AI transforms it into a print-ready A4 colouring page!
          </p>
          <Link href="/create" className="btn-primary inline-flex">
            <Sparkles className="w-5 h-5" />
            Create from Photo
          </Link>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
