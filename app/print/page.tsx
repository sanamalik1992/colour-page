'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Download, Printer, X } from 'lucide-react'

const trendingTags = ['Pikachu', 'Spider-Man', 'Frozen', 'Unicorn', 'Dinosaur', 'Princess', 'Paw Patrol', 'Mickey Mouse', 'Pokemon', 'Minecraft', 'Bluey', 'Peppa Pig', 'Dragon', 'Mermaid', 'Cars']

const coloringSheets = [
  { id: 1, title: 'Pikachu', category: 'Pokemon', downloads: 45200 },
  { id: 2, title: 'Spider-Man', category: 'Superheroes', downloads: 52300 },
  { id: 3, title: 'Elsa Frozen', category: 'Disney', downloads: 38100 },
  { id: 4, title: 'T-Rex', category: 'Dinosaurs', downloads: 29400 },
  { id: 5, title: 'Unicorn', category: 'Fantasy', downloads: 61200 },
  { id: 6, title: 'Mickey Mouse', category: 'Disney', downloads: 33500 },
  { id: 7, title: 'Chase Paw Patrol', category: 'TV Shows', downloads: 41800 },
  { id: 8, title: 'Princess', category: 'Fantasy', downloads: 27600 },
  { id: 9, title: 'Dragon', category: 'Fantasy', downloads: 35600 },
  { id: 10, title: 'Minecraft Steve', category: 'Games', downloads: 38900 },
  { id: 11, title: 'Hello Kitty', category: 'Characters', downloads: 44100 },
  { id: 12, title: 'Peppa Pig', category: 'TV Shows', downloads: 36700 },
  { id: 13, title: 'Butterfly', category: 'Nature', downloads: 31200 },
  { id: 14, title: 'Race Car', category: 'Vehicles', downloads: 24500 },
  { id: 15, title: 'Mermaid', category: 'Fantasy', downloads: 42800 },
  { id: 16, title: 'Cat', category: 'Animals', downloads: 28900 },
  { id: 17, title: 'Dog', category: 'Animals', downloads: 32100 },
  { id: 18, title: 'Flower', category: 'Nature', downloads: 25600 },
  { id: 19, title: 'Robot', category: 'Sci-Fi', downloads: 22100 },
  { id: 20, title: 'Rocket', category: 'Vehicles', downloads: 31500 },
]

const categories = ['All', 'Pokemon', 'Disney', 'Superheroes', 'Dinosaurs', 'Fantasy', 'TV Shows', 'Games', 'Animals', 'Nature', 'Vehicles']

const generateSVG = (title: string) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9']
  const color = colors[title.length % colors.length]
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 400"><rect fill="white" width="300" height="400"/><rect x="15" y="15" width="270" height="370" rx="10" fill="none" stroke="${color}" stroke-width="3"/><rect x="30" y="30" width="240" height="280" fill="#fafafa" rx="5"/><text x="150" y="180" text-anchor="middle" font-family="Comic Sans MS, cursive" font-size="18" fill="#333">${title}</text><text x="150" y="210" text-anchor="middle" font-family="Arial" font-size="11" fill="#888">Coloring Page</text><rect x="30" y="330" width="240" height="40" fill="${color}15" rx="5"/><text x="150" y="355" text-anchor="middle" font-family="Arial" font-size="10" fill="${color}">colour.page</text><circle cx="80" cy="120" r="30" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,3"/><circle cx="220" cy="120" r="25" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,3"/><path d="M100 240 Q150 200 200 240" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="5,3"/></svg>`)}`
}

export default function PrintPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [selectedSheet, setSelectedSheet] = useState<typeof coloringSheets[0] | null>(null)

  const filteredSheets = coloringSheets.filter((sheet) => {
    const matchesSearch = sheet.title.toLowerCase().includes(searchQuery.toLowerCase()) || sheet.category.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || sheet.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleTagClick = (tag: string) => { setSearchQuery(tag); setSelectedCategory('All') }

  const handlePrint = (sheet: typeof coloringSheets[0]) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`<html><head><title>${sheet.title}</title><style>@page{margin:0.5in}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh}img{max-width:100%;max-height:90vh}</style></head><body><img src="${generateSVG(sheet.title)}" onload="setTimeout(()=>window.print(),200)" /></body></html>`)
    }
  }

  const handleDownload = (sheet: typeof coloringSheets[0]) => {
    const a = document.createElement('a')
    a.href = generateSVG(sheet.title)
    a.download = `${sheet.title.toLowerCase().replace(/\s+/g, '-')}-coloring-page.svg`
    a.click()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></Link>
          <nav className="flex items-center gap-2">
            <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/print" className="px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-zinc-800 rounded-lg flex items-center gap-2">
              <Printer className="w-4 h-4" />Print Library
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
          {filteredSheets.map((sheet) => (
            <div key={sheet.id} className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer" onClick={() => setSelectedSheet(sheet)}>
              <div className="aspect-[3/4] relative bg-white">
                <img src={generateSVG(sheet.title)} alt={sheet.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button onClick={(e) => { e.stopPropagation(); handleDownload(sheet) }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors" title="Download"><Download className="w-5 h-5" /></button>
                  <button onClick={(e) => { e.stopPropagation(); handlePrint(sheet) }} className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors" title="Print"><Printer className="w-5 h-5" /></button>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-900 text-sm truncate">{sheet.title}</h3>
                <p className="text-xs text-gray-500">{sheet.downloads.toLocaleString()} downloads</p>
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
              <img src={generateSVG(selectedSheet.title)} alt={selectedSheet.title} className="w-full" />
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
