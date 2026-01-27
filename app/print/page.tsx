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
  { id: 1, title: 'Pikachu', category: 'Pokemon', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2016/01/pikachu-pokemon-coloring-page.png', downloads: 45200 },
  { id: 2, title: 'Elsa Frozen', category: 'Disney', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2014/11/elsa-from-the-frozen-coloring-page.png', downloads: 38100 },
  { id: 3, title: 'Spider-Man', category: 'Superheroes', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2014/01/spiderman-coloring-page.png', downloads: 52300 },
  { id: 4, title: 'T-Rex Dinosaur', category: 'Dinosaurs', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2009/10/t-rex-dinosaur-coloring-page.png', downloads: 29400 },
  { id: 5, title: 'Unicorn Magic', category: 'Fantasy', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2016/12/cute-unicorn-coloring-page.png', downloads: 61200 },
  { id: 6, title: 'Mickey Mouse', category: 'Disney', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2008/12/mickey-mouse-coloring-page.png', downloads: 33500 },
  { id: 7, title: 'Paw Patrol Chase', category: 'TV Shows', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2015/09/paw-patrol-chase-coloring-page.png', downloads: 41800 },
  { id: 8, title: 'Princess Castle', category: 'Fantasy', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2013/11/princess-castle-coloring-page.png', downloads: 27600 },
  { id: 9, title: 'Bluey', category: 'TV Shows', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2020/06/bluey-coloring-page.png', downloads: 55400 },
  { id: 10, title: 'Minecraft Creeper', category: 'Games', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2015/03/minecraft-creeper-coloring-page.png', downloads: 38900 },
  { id: 11, title: 'Hello Kitty', category: 'Characters', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2009/01/hello-kitty-coloring-page.png', downloads: 44100 },
  { id: 12, title: 'Peppa Pig', category: 'TV Shows', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2014/07/peppa-pig-coloring-page.png', downloads: 36700 },
  { id: 13, title: 'BTS K-Pop', category: 'Music', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2019/05/bts-coloring-page.png', downloads: 28300 },
  { id: 14, title: 'Butterfly Garden', category: 'Nature', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2010/04/butterfly-coloring-page.png', downloads: 31200 },
  { id: 15, title: 'Race Car', category: 'Vehicles', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2009/05/race-car-coloring-page.png', downloads: 24500 },
  { id: 16, title: 'Mermaid', category: 'Fantasy', image: 'https://www.supercoloring.com/sites/default/files/styles/coloring_medium/public/cif/2010/06/mermaid-coloring-page.png', downloads: 42800 },
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

  const handlePrint = (sheet: typeof coloringSheets[0]) => {
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>${sheet.title} - Coloring Page</title></head>
          <body style="margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
            <img src="${sheet.image}" style="max-width:100%;max-height:100vh;" onload="window.print();window.close();" />
          </body>
        </html>
      `)
    }
  }

  const handleDownload = async (sheet: typeof coloringSheets[0]) => {
    try {
      const response = await fetch(sheet.image)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${sheet.title.toLowerCase().replace(/\s+/g, '-')}-coloring-page.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      window.open(sheet.image, '_blank')
    }
  }

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
          <p className="text-xl text-gray-400 max-w-2xl mx-auto">Thousands of coloring pages ready to print. Click any image to download or print instantly!</p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search coloring pages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-zinc-800 border border-zinc-700 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Trending Tags */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex flex-wrap justify-center gap-2">
            {trendingTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagClick(tag)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-brand-primary/50 rounded-full text-sm text-gray-300 hover:text-white transition-all"
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setSelectedCategory(cat); setSearchQuery(''); }}
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

      {/* Grid */}
      <section className="container mx-auto px-6 pb-20">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredSheets.map((sheet) => (
            <div
              key={sheet.id}
              className="group bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all hover:-translate-y-1 cursor-pointer"
              onClick={() => setSelectedSheet(sheet)}
            >
              <div className="aspect-[3/4] relative bg-gray-100">
                <img src={sheet.image} alt={sheet.title} className="w-full h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDownload(sheet); }}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors"
                    title="Download"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handlePrint(sheet); }}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors"
                    title="Print"
                  >
                    <Printer className="w-5 h-5" />
                  </button>
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

      {/* Modal */}
      {selectedSheet && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80" onClick={() => setSelectedSheet(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">{selectedSheet.title}</h2>
              <button onClick={() => setSelectedSheet(null)} className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-gray-50">
              <img src={selectedSheet.image} alt={selectedSheet.title} className="w-full max-h-[50vh] object-contain" />
            </div>
            <div className="p-4 flex gap-3">
              <button
                onClick={() => handleDownload(selectedSheet)}
                className="flex-1 h-12 bg-brand-primary hover:bg-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" />Download
              </button>
              <button
                onClick={() => handlePrint(selectedSheet)}
                className="flex-1 h-12 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" />Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CTA */}
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
