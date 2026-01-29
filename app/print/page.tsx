'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Download, Printer, X, Sparkles, Loader2 } from 'lucide-react'

interface ColouringPage {
  id: string
  title: string
  category: string
  image_url: string
  downloads: number
}

const LIBRARY_PAGES = [
  { id: '1', title: 'Super Mario', category: 'Video Games', downloads: 15420 },
  { id: '2', title: 'Princess Elsa', category: 'Disney', downloads: 18230 },
  { id: '3', title: 'Pikachu', category: 'Pokemon', downloads: 21540 },
  { id: '4', title: 'Spider-Man', category: 'Superheroes', downloads: 16780 },
  { id: '5', title: 'Peppa Pig', category: 'TV Shows', downloads: 12340 },
  { id: '6', title: 'Paw Patrol', category: 'TV Shows', downloads: 14560 },
  { id: '7', title: 'Unicorn', category: 'Fantasy', downloads: 19870 },
  { id: '8', title: 'T-Rex', category: 'Dinosaurs', downloads: 11230 },
  { id: '9', title: 'Hello Kitty', category: 'Characters', downloads: 13450 },
  { id: '10', title: 'Minecraft', category: 'Video Games', downloads: 15670 },
  { id: '11', title: 'Olaf', category: 'Disney', downloads: 10890 },
  { id: '12', title: 'Batman', category: 'Superheroes', downloads: 12340 },
  { id: '13', title: 'Butterfly', category: 'Nature', downloads: 8970 },
  { id: '14', title: 'Puppy', category: 'Animals', downloads: 14230 },
  { id: '15', title: 'Castle', category: 'Fantasy', downloads: 11560 },
  { id: '16', title: 'Race Car', category: 'Vehicles', downloads: 9870 },
  { id: '17', title: 'Mermaid', category: 'Fantasy', downloads: 16540 },
  { id: '18', title: 'Sonic', category: 'Video Games', downloads: 13780 },
  { id: '19', title: 'Kitten', category: 'Animals', downloads: 12450 },
  { id: '20', title: 'Dragon', category: 'Fantasy', downloads: 14320 },
]

const trendingTags = ['Disney', 'Pokemon', 'Superheroes', 'Animals', 'Fantasy', 'TV Shows', 'Video Games']
const categories = ['All', 'Disney', 'Pokemon', 'Superheroes', 'Animals', 'Fantasy', 'TV Shows', 'Video Games', 'Dinosaurs', 'Nature', 'Vehicles', 'Characters']

const generateSVG = (title: string, index: number) => {
  const icons: Record<string, string> = {
    'Super Mario': '🍄', 'Princess Elsa': '❄️', 'Pikachu': '⚡', 'Spider-Man': '🕷️',
    'Peppa Pig': '🐷', 'Paw Patrol': '🐕', 'Unicorn': '🦄', 'T-Rex': '🦖',
    'Hello Kitty': '🎀', 'Minecraft': '⛏️', 'Olaf': '⛄', 'Batman': '🦇',
    'Butterfly': '🦋', 'Puppy': '🐶', 'Castle': '🏰', 'Race Car': '🏎️',
    'Mermaid': '🧜‍♀️', 'Sonic': '💨', 'Kitten': '🐱', 'Dragon': '🐲'
  }
  const icon = icons[title] || '🎨'
  const colors = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444']
  const color = colors[index % colors.length]
  
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400"><rect width="300" height="400" fill="white"/><rect x="10" y="10" width="280" height="380" rx="15" fill="none" stroke="${color}" stroke-width="3"/><text x="150" y="160" text-anchor="middle" font-size="72">${icon}</text><text x="150" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="bold" fill="#333">${title}</text><text x="150" y="295" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#666">Colouring Page</text><text x="150" y="370" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="${color}">colour.page</text></svg>`)}`
}

export default function PrintPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSheet, setSelectedSheet] = useState<ColouringPage | null>(null)
  const [pages, setPages] = useState<ColouringPage[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadPages() }, [])

  const loadPages = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/library')
      const data = await res.json()
      if (data.pages && data.pages.length > 0) {
        setPages(data.pages)
      } else {
        setPages(LIBRARY_PAGES.map((p, i) => ({ ...p, image_url: generateSVG(p.title, i) })))
      }
    } catch {
      setPages(LIBRARY_PAGES.map((p, i) => ({ ...p, image_url: generateSVG(p.title, i) })))
    } finally {
      setLoading(false)
    }
  }

  const filteredPages = pages.filter((page) => {
    const matchesSearch = page.title.toLowerCase().includes(searchQuery.toLowerCase()) || page.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || page.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handlePrint = (page: ColouringPage) => {
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<!DOCTYPE html><html><head><title>${page.title}</title><style>@page{size:A4;margin:0.5in}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:white}img{max-width:100%;max-height:90vh}</style></head><body><img src="${page.image_url}" onload="setTimeout(function(){window.print()},500)"/></body></html>`)
      w.document.close()
    }
  }

  const handleDownload = (page: ColouringPage) => {
    const a = document.createElement('a')
    a.href = page.image_url
    a.download = `${page.title.toLowerCase().replace(/\s+/g, '-')}-colouring-page.svg`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></Link>
          <nav className="flex items-center gap-2">
            <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/print" className="px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-zinc-800 rounded-lg flex items-center gap-2"><Printer className="w-4 h-4" />Print Library</Link>
            <Link href="/dot-to-dot" className="px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-zinc-800 rounded-lg flex items-center gap-2"><Sparkles className="w-4 h-4" />Dot-to-Dot</Link>
          </nav>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Free Printable Colouring Pages</h1>
          <p className="text-xl text-gray-400">Click any page to download or print instantly!</p>
        </div>
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search colouring pages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 pl-12 pr-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>}
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-6">
          {trendingTags.map((tag) => (<button key={tag} onClick={() => { setSearchQuery(''); setSelectedCategory(tag) }} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === tag ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'}`}>{tag}</button>))}
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (<button key={cat} onClick={() => { setSelectedCategory(cat); setSearchQuery('') }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat ? 'bg-brand-primary text-white' : 'bg-zinc-800/50 text-gray-500 hover:bg-zinc-700 hover:text-white'}`}>{cat}</button>))}
        </div>
      </section>

      <section className="container mx-auto px-6 pb-20">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20"><Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" /><p className="text-gray-400">Loading colouring pages...</p></div>
        ) : filteredPages.length === 0 ? (
          <div className="text-center py-20"><Search className="w-16 h-16 mx-auto mb-4 text-gray-600" /><h3 className="text-xl font-semibold text-white mb-2">No pages found</h3><button onClick={() => { setSearchQuery(''); setSelectedCategory('All') }} className="text-brand-primary hover:underline">Clear filters</button></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {filteredPages.map((page) => (
              <div key={page.id} className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 cursor-pointer" onClick={() => setSelectedSheet(page)}>
                <div className="aspect-[3/4] relative bg-gray-50">
                  <img src={page.image_url} alt={page.title} className="w-full h-full object-contain" loading="lazy" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                    <button onClick={(e) => { e.stopPropagation(); handleDownload(page) }} className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors shadow-lg"><Download className="w-5 h-5" /></button>
                    <button onClick={(e) => { e.stopPropagation(); handlePrint(page) }} className="w-12 h-12 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors shadow-lg"><Printer className="w-5 h-5" /></button>
                  </div>
                </div>
                <div className="p-3"><h3 className="font-semibold text-gray-900 text-sm truncate">{page.title}</h3><p className="text-xs text-gray-500">{page.downloads.toLocaleString()} downloads</p></div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selectedSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setSelectedSheet(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between"><div><h2 className="text-xl font-bold text-gray-900">{selectedSheet.title}</h2><p className="text-sm text-gray-500">{selectedSheet.category}</p></div><button onClick={() => setSelectedSheet(null)} className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full"><X className="w-6 h-6" /></button></div>
            <div className="p-4 bg-gray-50 max-h-[50vh] overflow-auto"><img src={selectedSheet.image_url} alt={selectedSheet.title} className="w-full rounded-lg" /></div>
            <div className="p-4 flex gap-3">
              <button onClick={() => handleDownload(selectedSheet)} className="flex-1 h-12 bg-brand-primary hover:bg-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2"><Download className="w-5 h-5" />Download</button>
              <button onClick={() => handlePrint(selectedSheet)} className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"><Printer className="w-5 h-5" />Print</button>
            </div>
          </div>
        </div>
      )}

      <section className="container mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-brand-primary/20 to-brand-border/20 border border-brand-primary/30 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Want custom colouring pages?</h2>
          <p className="text-gray-400 mb-8">Upload any photo and our AI transforms it into a beautiful colouring page!</p>
          <Link href="/" className="inline-flex h-14 px-8 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-xl items-center gap-2"><Sparkles className="w-5 h-5" />Create Your Own</Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">© 2025 colour.page</span>
          <div className="flex gap-6 text-sm text-gray-400"><Link href="/privacy" className="hover:text-white">Privacy</Link><Link href="/terms" className="hover:text-white">Terms</Link><Link href="/contact" className="hover:text-white">Contact</Link></div>
        </div>
      </footer>
    </div>
  )
}
