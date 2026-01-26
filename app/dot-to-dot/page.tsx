'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Crown, Lock, Sparkles } from 'lucide-react'

export default function DotToDotPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dotCount, setDotCount] = useState<number>(50)
  const isPro = false

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreviewUrl(reader.result as string)
      reader.readAsDataURL(file)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></Link>
          <nav className="hidden md:flex items-center gap-1">
            <Link href="/" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Create</Link>
            <Link href="/dot-to-dot" className="px-4 py-2 text-sm font-semibold text-brand-primary hover:bg-zinc-800 rounded-lg">Dot-to-Dot</Link>
            <Link href="/print" className="px-4 py-2 text-sm font-semibold text-gray-400 hover:text-white hover:bg-zinc-800 rounded-lg">Print</Link>
          </nav>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

      <section className="container mx-auto px-6 py-12 text-center">
        <div className="inline-flex items-center gap-2 bg-brand-primary/20 border border-brand-primary/30 rounded-full px-4 py-2 mb-6">
          <Crown className="w-4 h-4 text-brand-primary" /><span className="text-sm font-semibold text-brand-primary">Pro Feature</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Dot-to-Dot Generator</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">Transform any photo into a connect-the-dots puzzle. Perfect for teaching numbers and hand-eye coordination!</p>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-border rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Dot-to-Dot Generator</h2>
            </div>

            <div className="mb-6">
              {previewUrl ? (
                <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
                  <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                  <button onClick={() => { setSelectedFile(null); setPreviewUrl(null) }} className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">×</button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-brand-primary hover:bg-gray-50 transition-colors">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 rounded-xl flex items-center justify-center"><Sparkles className="w-6 h-6 text-gray-400" /></div>
                    <p className="text-sm font-medium text-gray-700">Click to upload a photo</p>
                    <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                  </div>
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                </label>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Number of dots: {dotCount}</label>
              <input type="range" min="20" max="150" value={dotCount} onChange={(e) => setDotCount(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500" />
              <div className="flex justify-between text-xs text-gray-500 mt-1"><span>Simple (20)</span><span>Complex (150)</span></div>
            </div>

            <div className="pt-6 border-t border-gray-200">
              {isPro ? (
                <button disabled={!selectedFile} className="w-full h-12 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                  <Sparkles className="w-5 h-5" />Generate Dot-to-Dot
                </button>
              ) : (
                <Link href="/pro" className="w-full h-12 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                  <Lock className="w-5 h-5" />Unlock with Pro
                </Link>
              )}
              <p className="text-sm text-gray-500 text-center mt-4">{isPro ? 'Unlimited generations with Pro' : 'Pro subscription required'}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Why Kids Love Dot-to-Dot</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">🔢</div>
              <h3 className="font-semibold text-white mb-1">Learn Numbers</h3>
              <p className="text-sm text-gray-400">Practice counting from 1 to 150</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">✏️</div>
              <h3 className="font-semibold text-white mb-1">Fine Motor Skills</h3>
              <p className="text-sm text-gray-400">Improve hand-eye coordination</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">🎨</div>
              <h3 className="font-semibold text-white mb-1">Color After!</h3>
              <p className="text-sm text-gray-400">Complete the puzzle then color it in</p>
            </div>
          </div>
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
