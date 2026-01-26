'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Search, Download, Printer, Star } from 'lucide-react'

const categories = ['All', 'Animals', 'Nature', 'Fantasy', 'Vehicles', 'Characters', 'Holidays', 'Educational']
const samplePages = [
  { id: 1, title: 'Friendly Lion', category: 'Animals', downloads: 1234, featured: true },
  { id: 2, title: 'Magic Castle', category: 'Fantasy', downloads: 987, featured: true },
  { id: 3, title: 'Race Car', category: 'Vehicles', downloads: 756, featured: false },
  { id: 4, title: 'Butterfly Garden', category: 'Nature', downloads: 654, featured: true },
  { id: 5, title: 'Dinosaur T-Rex', category: 'Animals', downloads: 1567, featured: true },
  { id: 6, title: 'Princess Crown', category: 'Fantasy', downloads: 876, featured: false },
  { id: 7, title: 'Fire Truck', category: 'Vehicles', downloads: 543, featured: false },
  { id: 8, title: 'Ocean Fish', category: 'Animals', downloads: 432, featured: false },
  { id: 9, title: 'Christmas Tree', category: 'Holidays', downloads: 2345, featured: true },
  { id: 10, title: 'Numbers 1-10', category: 'Educational', downloads: 1876, featured: true },
  { id: 11, title: 'Alphabet A-Z', category: 'Educational', downloads: 2100, featured: true },
  { id: 12, title: 'Rocket Ship', category: 'Vehicles', downloads: 654, featured: false },
]

export default function PrintPage() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const filteredPages = samplePages.filter((p) => (selectedCategory === 'All' || p.category === selectedCategory) && p.title.toLowerCase().includes(searchQuery.toLowerCase()))

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/dot-to-dot" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Dot-to-Dot</Link>
            <Link href="/print" className="px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-zinc-800 rounded-lg">Print</Link>
          </nav>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Free Printable Coloring Pages</h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">Download and print thousands of coloring pages instantly. New pages added weekly!</p>
        </div>
        <div className="max-w-xl mx-auto mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search coloring pages..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full h-14 pl-12 pr-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary" />
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {categories.map((cat) => (<button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${selectedCategory === cat ? 'bg-brand-primary text-white' : 'bg-zinc-800 text-gray-400 hover:bg-zinc-700'}`}>{cat}</button>))}
        </div>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {filteredPages.map((page) => (
            <div key={page.id} className="group bg-zinc-800/50 border border-zinc-700 rounded-2xl overflow-hidden hover:border-brand-primary/50 transition-all hover:-translate-y-1">
              <div className="aspect-[3/4] bg-white relative">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center p-4">
                    <div className="w-24 h-24 mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center"><Printer className="w-10 h-10 text-gray-400" /></div>
                    <p className="text-sm text-gray-500">{page.title}</p>
                  </div>
                </div>
                {page.featured && <div className="absolute top-2 left-2"><span className="bg-brand-primary text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1"><Star className="w-3 h-3 fill-current" />Featured</span></div>}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button className="h-10 px-4 bg-white text-gray-900 font-semibold text-sm rounded-lg flex items-center gap-2"><Download className="w-4 h-4" />Download</button>
                </div>
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-white mb-1 truncate">{page.title}</h3>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">{page.category}</span>
                  <span className="text-xs text-gray-500 flex items-center gap-1"><Download className="w-3 h-3" />{page.downloads.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
        {filteredPages.length === 0 && <div className="text-center py-20"><Search className="w-16 h-16 mx-auto mb-4 text-gray-500" /><h3 className="text-xl font-semibold text-white mb-2">No pages found</h3><p className="text-gray-400">Try a different search or category</p></div>}
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="bg-gradient-to-r from-brand-primary/20 to-brand-border/20 border border-brand-primary/30 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Want custom coloring pages?</h2>
          <p className="text-gray-400 mb-8">Upload any photo and our AI will transform it into a beautiful coloring page!</p>
          <Link href="/" className="inline-flex items-center gap-2 h-14 px-8 bg-gradient-to-r from-brand-primary to-brand-border text-white font-bold text-lg rounded-xl shadow-lg">Create Your Own</Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">© 2025 colour.page</span>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
