import Link from 'next/link'
import Image from 'next/image'
import { Sparkles, Printer, Clock } from 'lucide-react'

export default function DotToDotPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12">
            <Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized />
          </Link>
          <nav className="flex items-center gap-2">
            <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/print" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg flex items-center gap-2">
              <Printer className="w-4 h-4" />Print Library
            </Link>
          </nav>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="w-24 h-24 bg-amber-500/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Clock className="w-12 h-12 text-amber-400" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-6">Dot-to-Dot Generator</h1>
          <p className="text-xl text-gray-400 mb-8">Coming Soon! We are working on an amazing feature to turn your photos into numbered connect-the-dots puzzles.</p>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8 mb-8">
            <h3 className="text-lg font-semibold text-white mb-4">Get notified when it launches</h3>
            <div className="flex gap-3 max-w-md mx-auto">
              <input type="email" placeholder="Enter your email" className="flex-1 h-12 px-4 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-gray-500" />
              <button className="h-12 px-6 bg-gradient-to-r from-amber-400 to-amber-600 text-white font-semibold rounded-xl">Notify Me</button>
            </div>
          </div>
          <Link href="/" className="inline-flex items-center gap-2 text-brand-primary hover:text-brand-glow">
            <Sparkles className="w-5 h-5" />
            Try our Coloring Page Generator instead
          </Link>
        </div>
      </section>

      <footer className="border-t border-zinc-800 py-12 mt-20">
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
