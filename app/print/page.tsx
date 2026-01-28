'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Download, Printer, X, Sparkles, Loader2 } from 'lucide-react'

const trendingThemes = [
  { id: 1, title: 'Pikachu Pokemon', category: 'Pokemon' },
  { id: 2, title: 'Spider-Man Superhero', category: 'Superheroes' },
  { id: 3, title: 'Elsa Frozen Princess', category: 'Disney' },
  { id: 4, title: 'T-Rex Dinosaur', category: 'Dinosaurs' },
  { id: 5, title: 'Magical Unicorn', category: 'Fantasy' },
  { id: 6, title: 'Mickey Mouse', category: 'Disney' },
  { id: 7, title: 'Paw Patrol Chase', category: 'TV Shows' },
  { id: 8, title: 'Beautiful Princess', category: 'Fantasy' },
  { id: 9, title: 'Fire Dragon', category: 'Fantasy' },
  { id: 10, title: 'Minecraft Creeper', category: 'Games' },
  { id: 11, title: 'Hello Kitty', category: 'Characters' },
  { id: 12, title: 'Peppa Pig', category: 'TV Shows' },
  { id: 13, title: 'Butterfly Garden', category: 'Nature' },
  { id: 14, title: 'Race Car', category: 'Vehicles' },
  { id: 15, title: 'Beautiful Mermaid', category: 'Fantasy' },
  { id: 16, title: 'Cute Cat', category: 'Animals' },
  { id: 17, title: 'Friendly Dog', category: 'Animals' },
  { id: 18, title: 'Flower Bouquet', category: 'Nature' },
  { id: 19, title: 'Cool Robot', category: 'Sci-Fi' },
  { id: 20, title: 'Space Rocket', category: 'Vehicles' },
]

const trendingTags = ['Pikachu', 'Spider-Man', 'Frozen', 'Unicorn', 'Dinosaur', 'Princess', 'Paw Patrol', 'Pokemon', 'Minecraft', 'Dragon']

const categories = ['All', 'Pokemon', 'Disney', 'Superheroes', 'Dinosaurs', 'Fantasy', 'TV Shows', 'Games', 'Animals', 'Nature', 'Vehicles']

// Generate a nice looking placeholder coloring page SVG
const generatePlaceholderSVG = (title: string, index: number) => {
  const colors = ['#10B981', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#EF4444', '#06B6D4', '#84CC16']
  const color = colors[index % colors.length]
  
  const patterns = [
    `<circle cx="150" cy="150" r="80" fill="none" stroke="black" stroke-width="2"/><circle cx="120" cy="130" r="15" fill="none" stroke="black" stroke-width="2"/><circle cx="180" cy="130" r="15" fill="none" stroke="black" stroke-width="2"/><path d="M120 180 Q150 210 180 180" fill="none" stroke="black" stroke-width="2"/>`,
    `<polygon points="150,50 250,200 50,200" fill="none" stroke="black" stroke-width="2"/><circle cx="150" cy="150" r="30" fill="none" stroke="black" stroke-width="2"/>`,
    `<rect x="70" y="80" width="160" height="140" rx="20" fill="none" stroke="black" stroke-width="2"/><circle cx="120" cy="140" r="20" fill="none" stroke="black" stroke-width="2"/><circle cx="180" cy="140" r="20" fill="none" stroke="black" stroke-width="2"/>`,
    `<ellipse cx="150" cy="150" rx="100" ry="70" fill="none" stroke="black" stroke-width="2"/><path d="M100 150 Q150 100 200 150" fill="none" stroke="black" stroke-width="2"/>`,
    `<path d="M150 50 L180 120 L250 120 L195 165 L215 240 L150 195 L85 240 L105 165 L50 120 L120 120 Z" fill="none" stroke="black" stroke-width="2"/>`,
  ]
  
  const pattern = patterns[index % patterns.length]
  
  return `data:image/svg+xml,${encodeURIComponent(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400" width="300" height="400">
  <rect width="300" height="400" fill="white"/>
  <rect x="10" y="10" width="280" height="380" rx="8" fill="none" stroke="${color}" stroke-width="2"/>
  <g transform="translate(0, 20)">${pattern}</g>
  <text x="150" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#333">${title}</text>
  <text x="150" y="345" text-anchor="middle" font-family="Arial, sans-serif" font-size="10" fill="#888">Coloring Page</text>
  <text x="150" y="380" text-anchor="middle" font-family="Arial, sans-serif" font-size="8" fill="${color}">colour.page</text>
</svg>`)}`
}

export default function PrintPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSheet, setSelectedSheet] = useState<typeof trendingThemes[0] | null>(null)
  const [generating, setGenerating] = useState<number | null>(null)

  const filteredSheets = trendingThemes.filter((sheet) => {
    const matchesSearch = sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) || sheet.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || sheet.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag)
    setSelectedCategory('All')
  }

  const handlePrint = (sheet: typeof trendingThemes[0], index: number) => {
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<html><head><title>${sheet.title}</title></head><body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;"><img src="${generatePlaceholderSVG(sheet.title, index)}" style="max-width:100%;max-height:90vh;" onload="setTimeout(function(){window.print()},300)" /></body></html>`)
    }
  }

  const handleDownload = (sheet: typeof trendingThemes[0], index: number) => {
    const a = document.createElement('a')
    a.href = generatePlaceholderSVG(sheet.title, index)
    a.download = sheet.title.toLowerCase().replace(/\s+/g, '-') + '-coloring-page.svg'
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12">
            <Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/print" className="px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-zinc-800 rounded-lg flex items-center gap-2">
              <Printer className="w-4 h-4" />Print
            </Link>
            <Link href="/dot-to-dot" className="px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-zinc-800 rounded-lg flex items-center gap-2">
              <Sparkles className="w-4 h-4" />Dot-to-Dot
            </Link>
          </nav>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Free Printable Coloring Pages</h1>
          <p className="text-xl text-gray-400">Click any page to download or print instantly!</p>
        </div>

        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search coloring pages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 pl-12 pr-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>}
          </div>
        </div>

        <div className="max-w-4xl mx-auto mb-6">
          <div className="flex flex-wrap justify-center gap-2">
            {trendingTags.map((tag) => (
              <button key={tag} onClick={() => handleTagClick(tag)} className="px-3 py-1.5 bg-zinc-800 hover:bg-brand-primary border border-zinc-700 hover:border-brand-primary rounded-full text-sm text-gray-300 hover:text-white transition-all">{tag}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button key={cat} onClick={() => { setSelectedCategory(cat); setSearchQuery('') }} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'}`}>{cat}</button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredSheets.map((sheet, index) => (
            <div key={sheet.id} className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer" onClick={() => setSelectedSheet(sheet)}>
              <div className="aspect-[3/4] relative bg-white p-2">
                <img src={generatePlaceholderSVG(sheet.title, index)} alt={sheet.title} className="w-full h-full object-contain" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(sheet, index) }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors"><Download className="w-5 h-5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handlePrint(sheet, index) }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors"><Printer className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{sheet.title}</h3>
                <p className="text-xs text-gray-500">{sheet.category}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {selectedSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setSelectedSheet(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{selectedSheet.title}</h2>
              <button onClick={() => setSelectedSheet(null)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-4 bg-gray-50">
              <img src={generatePlaceholderSVG(selectedSheet.title, selectedSheet.id)} alt={selectedSheet.title} className="w-full" />
            </div>
            <div className="p-4 flex gap-3">
              <button onClick={() => handleDownload(selectedSheet, selectedSheet.id)} className="flex-1 h-12 bg-brand-primary hover:bg-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2"><Download className="w-5 h-5" />Download</button>
              <button onClick={() => handlePrint(selectedSheet, selectedSheet.id)} className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"><Printer className="w-5 h-5" />Print</button>
            </div>
          </div>
        </div>
      )}

      <section className="container mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-brand-primary/20 to-brand-border/20 border border-brand-primary/30 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Want custom coloring pages?</h2>
          <p className="text-gray-400 mb-8">Upload any photo and our AI transforms it into a coloring page!</p>
          <Link href="/" className="inline-flex h-14 px-8 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-xl items-center">Create Your Own</Link>
        </div>
      </section>

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
