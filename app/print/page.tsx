'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Download, Printer, X } from 'lucide-react'

const trendingTags = [
  'K-Pop', 'Spider-Man', 'Frozen', 'Pikachu', 'Dinosaurs', 'Unicorn', 
  'Paw Patrol', 'Mickey Mouse', 'Princess', 'Pokemon', 'Minecraft', 
  'Bluey', 'Cocomelon', 'Peppa Pig', 'Elsa', 'T-Rex'
]

const coloringSheets = [
  { id: 1, title: 'Pikachu', category: 'Pokemon', emoji: '⚡', downloads: 45200 },
  { id: 2, title: 'Elsa Frozen', category: 'Disney', emoji: '❄️', downloads: 38100 },
  { id: 3, title: 'Spider-Man', category: 'Superheroes', emoji: '🕷️', downloads: 52300 },
  { id: 4, title: 'T-Rex Dinosaur', category: 'Dinosaurs', emoji: '🦖', downloads: 29400 },
  { id: 5, title: 'Unicorn Magic', category: 'Fantasy', emoji: '🦄', downloads: 61200 },
  { id: 6, title: 'Mickey Mouse', category: 'Disney', emoji: '🐭', downloads: 33500 },
  { id: 7, title: 'Paw Patrol', category: 'TV Shows', emoji: '🐕', downloads: 41800 },
  { id: 8, title: 'Princess Castle', category: 'Fantasy', emoji: '🏰', downloads: 27600 },
  { id: 9, title: 'Bluey', category: 'TV Shows', emoji: '🐶', downloads: 55400 },
  { id: 10, title: 'Minecraft', category: 'Games', emoji: '⛏️', downloads: 38900 },
  { id: 11, title: 'Hello Kitty', category: 'Characters', emoji: '🎀', downloads: 44100 },
  { id: 12, title: 'Peppa Pig', category: 'TV Shows', emoji: '🐷', downloads: 36700 },
  { id: 13, title: 'BTS K-Pop', category: 'Music', emoji: '🎤', downloads: 28300 },
  { id: 14, title: 'Butterfly', category: 'Nature', emoji: '🦋', downloads: 31200 },
  { id: 15, title: 'Race Car', category: 'Vehicles', emoji: '🏎️', downloads: 24500 },
  { id: 16, title: 'Mermaid', category: 'Fantasy', emoji: '🧜‍♀️', downloads: 42800 },
  { id: 17, title: 'Dragon', category: 'Fantasy', emoji: '🐉', downloads: 35600 },
  { id: 18, title: 'Robot', category: 'Sci-Fi', emoji: '🤖', downloads: 22100 },
  { id: 19, title: 'Flower Garden', category: 'Nature', emoji: '🌸', downloads: 28900 },
  { id: 20, title: 'Rocket Ship', category: 'Vehicles', emoji: '🚀', downloads: 31500 },
]

const categories = ['All', 'Pokemon', 'Disney', 'Superheroes', 'Dinosaurs', 'Fantasy', 'TV Shows', 'Games', 'Nature', 'Vehicles']

export default function PrintPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSheet, setSelectedSheet] = useState<typeof coloringSheets[0] | null>(null)

  const filteredSheets = coloringSheets.filter((sheet) => {
    const matchesSearch = sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          sheet.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || sheet.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleTagClick = (tag: string) => {
    setSearchQuery(tag)
    setSelectedCategory('All')
  }

  const generateColoringPageSVG = (title: string, emoji: string) => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500" width="400" height="500">
      <rect width="400" height="500" fill="white"/>
      <rect x="20" y="20" width="360" height="460" fill="none" stroke="black" stroke-width="3"/>
      <text x="200" y="80" text-anchor="middle" font-family="Arial" font-size="24" font-weight="bold">${title}</text>
      <text x="200" y="280" text-anchor="middle" font-size="120">${emoji}</text>
      <text x="200" y="420" text-anchor="middle" font-family="Arial" font-size="14" fill="#666">colour.page</text>
      <circle cx="200" cy="280" r="100" fill="none" stroke="black" stroke-width="2" stroke-dasharray="10,5"/>
    </svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
  }

  const handlePrint = (sheet: typeof coloringSheets[0]) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${sheet.title} - Coloring Page</title>
          <style>@media print { body { margin: 0; } img { max-width: 100%; height: auto; } }</style>
          </head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
            <img src="${generateColoringPageSVG(sheet.title, sheet.emoji)}" style="max-width:100%;max-height:100vh;" onload="setTimeout(()=>{window.print();window.close();},100)" />
          </body>
        </html>
      `)
    }
  }

  const handleDownload = (sheet: typeof coloringSheets[0]) => {
    const svg = generateColoringPageSVG(sheet.title, sheet.emoji)
    const a = document.createElement('a')
    a.href = svg
    a.download = `${sheet.title.toLowerCase().replace(/\s+/g, '-')}-coloring-page.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/print" className="px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-zinc-800 rounded-lg flex items-center gap-1.5">
              <Printer className="w-4 h-4" />Print Library
            </Link>
            <Link href="/dot-to-dot" className="px-4 py-2 text-sm font-semibold text-amber-400 hover:bg-zinc-800 rounded-lg">Dot-to-Dot</Link>
          </nav>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Free Printable Coloring Pages</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">Thousands of coloring pages ready to print. Click any image to download or print instantly!</p>
        </div>

        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search coloring pages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 pl-12 pr-12 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary" />
            {searchQuery && <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>}
          </div>
        </div>

        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {trendingTags.map((tag) => (
              <button key={tag} onClick={() => handleTagClick(tag)} className="px-4 py-2 bg-zinc-800 hover:bg-brand-primary border border-zinc-700 hover:border-brand-primary rounded-full text-sm text-gray-300 hover:text-white transition-all">{tag}</button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button key={cat} onClick={() => { setSelectedCategory(cat); setSearchQuery(''); }} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700 hover:text-white'}`}>{cat}</button>
          ))}
        </div>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredSheets.map((sheet) => (
            <div key={sheet.id} className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer" onClick={() => setSelectedSheet(sheet)}>
              <div className="aspect-[3/4] relative bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-6xl mb-2">{sheet.emoji}</div>
                  <p className="text-xs text-gray-400 px-2">{sheet.title}</p>
                </div>
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(sheet); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors" title="Download"><Download className="w-5 h-5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handlePrint(sheet); }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors" title="Print"><Printer className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{sheet.title}</h3>
                <p className="text-xs text-gray-500">{sheet.downloads.toLocaleString()} downloads</p>
              </div>
            </div>
          ))}
        </div>

        {filteredSheets.length === 0 && (
          <div className="text-center py-20">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-500" />
            <h3 className="text-xl font-semibold text-white mb-2">No coloring pages found</h3>
            <p className="text-gray-400">Try a different search or category</p>
          </div>
        )}
      </section>

      {selectedSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setSelectedSheet(null)}>
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{selectedSheet.title}</h2>
              <button onClick={() => setSelectedSheet(null)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-8 bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <div className="text-9xl mb-4">{selectedSheet.emoji}</div>
                <p className="text-gray-500">{selectedSheet.title} Coloring Page</p>
              </div>
            </div>
            <div className="p-4 flex gap-3">
              <button onClick={() => handleDownload(selectedSheet)} className="flex-1 h-12 bg-brand-primary hover:bg-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2"><Download className="w-5 h-5" />Download</button>
              <button onClick={() => handlePrint(selectedSheet)} className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"><Printer className="w-5 h-5" />Print</button>
            </div>
          </div>
        </div>
      )}

      <section className="container mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-brand-primary/20 to-brand-border/20 border border-brand-primary/30 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Want custom coloring pages?</h2>
          <p className="text-gray-400 mb-8">Upload any photo and our AI transforms it into a coloring page in seconds!</p>
          <Link href="/" className="inline-flex items-center gap-2 h-14 px-8 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-xl shadow-lg">Create Your Own</Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">© 2025 colour.page</span>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
