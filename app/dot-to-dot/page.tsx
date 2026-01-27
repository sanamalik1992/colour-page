'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Crown, Lock, Sparkles, Loader2, Download, RotateCcw } from 'lucide-react'

export default function DotToDotPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [dotCount, setDotCount] = useState<number>(50)
  const [isProcessing, setIsProcessing] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [freeUsesLeft, setFreeUsesLeft] = useState(1)

  useEffect(() => {
    const used = localStorage.getItem('dotToDotFreeUsed')
    if (used === 'true') setFreeUsesLeft(0)
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setSelectedFile(file)
      const reader = new FileReader()
      reader.onloadend = () => setPreviewUrl(reader.result as string)
      reader.readAsDataURL(file)
      setError('')
      setResultUrl(null)
    }
  }

  const handleGenerate = async () => {
    if (!selectedFile) return
    if (freeUsesLeft <= 0) {
      window.location.href = '/pro'
      return
    }
    setIsProcessing(true)
    setError('')
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('dotCount', String(dotCount))
      formData.append('type', 'dot-to-dot')
      formData.append('sessionId', 'dot-' + Date.now())
      const res = await fetch('/api/create', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      setJobId(data.jobId)
      localStorage.setItem('dotToDotFreeUsed', 'true')
      setFreeUsesLeft(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed')
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    if (!jobId) return
    const poll = async () => {
      try {
        const res = await fetch(`/api/status?jobId=${jobId}&sessionId=dot`)
        const data = await res.json()
        if (data.job?.status === 'completed' && data.job?.result_url) {
          setIsProcessing(false)
          const { data: urlData } = await fetch(`/api/get-result-url?path=${data.job.result_url}`).then(r => r.json()).catch(() => ({ data: null }))
          setResultUrl(urlData || data.job.result_url)
        } else if (data.job?.status === 'failed') {
          setIsProcessing(false)
          setError('Generation failed')
        }
      } catch (err) { console.error(err) }
    }
    const interval = setInterval(poll, 2000)
    poll()
    return () => clearInterval(interval)
  }, [jobId])

  const handleReset = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setResultUrl(null)
    setJobId(null)
    setError('')
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
        <div className="inline-flex items-center gap-2 bg-amber-500/20 border border-amber-500/30 rounded-full px-4 py-2 mb-6">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-amber-400">{freeUsesLeft > 0 ? '1 Free Try Available!' : 'Pro Feature'}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Dot-to-Dot Generator</h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto">Transform any photo into a connect-the-dots puzzle!</p>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Dot-to-Dot Generator</h2>
            </div>

            {error && <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6"><p className="text-sm font-semibold text-red-600">{error}</p></div>}

            {resultUrl ? (
              <div className="space-y-4">
                <div className="aspect-square bg-gray-100 rounded-xl overflow-hidden">
                  <img src={resultUrl} alt="Dot to dot result" className="w-full h-full object-contain" />
                </div>
                <a href={resultUrl} download="dot-to-dot.png" className="w-full h-12 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                  <Download className="w-5 h-5" />Download
                </a>
                <button onClick={handleReset} className="w-full h-12 bg-gray-100 text-gray-700 font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-200">
                  <RotateCcw className="w-5 h-5" />Create Another
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  {previewUrl ? (
                    <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden">
                      <img src={previewUrl} alt="Preview" className="w-full h-full object-contain" />
                      <button onClick={() => { setSelectedFile(null); setPreviewUrl(null) }} className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600">×</button>
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-48 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50 transition-colors">
                      <Sparkles className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-700">Click to upload a photo</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                      <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                    </label>
                  )}
                </div>

                {isProcessing ? (
                  <div className="flex flex-col items-center py-8">
                    <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                    <p className="text-gray-600 font-medium">Creating your dot-to-dot puzzle...</p>
                    <p className="text-gray-400 text-sm">This takes about 15-20 seconds</p>
                  </div>
                ) : (
                  <>
                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Number of dots: {dotCount}</label>
                      <input type="range" min="30" max="100" value={dotCount} onChange={(e) => setDotCount(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
                      <div className="flex justify-between text-xs text-gray-500 mt-1"><span>Simple (30)</span><span>Complex (100)</span></div>
                    </div>

                    <div className="pt-6 border-t border-gray-200">
                      {freeUsesLeft > 0 ? (
                        <button onClick={handleGenerate} disabled={!selectedFile} className="w-full h-12 bg-gradient-to-r from-amber-400 to-amber-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 hover:from-amber-500 hover:to-amber-700">
                          <Sparkles className="w-5 h-5" />Generate Dot-to-Dot (Free!)
                        </button>
                      ) : (
                        <Link href="/pro" className="w-full h-12 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2">
                          <Lock className="w-5 h-5" />Unlock with Pro
                        </Link>
                      )}
                      <p className="text-sm text-gray-500 text-center mt-4">{freeUsesLeft > 0 ? '1 free generation • Then Pro required' : 'Unlimited with Pro subscription'}</p>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-20">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-white mb-6 text-center">Why Kids Love Dot-to-Dot</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">🔢</div><h3 className="font-semibold text-white mb-1">Learn Numbers</h3><p className="text-sm text-gray-400">Practice counting</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">✏️</div><h3 className="font-semibold text-white mb-1">Fine Motor Skills</h3><p className="text-sm text-gray-400">Hand-eye coordination</p>
            </div>
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 text-center">
              <div className="text-3xl mb-2">🎨</div><h3 className="font-semibold text-white mb-1">Color After!</h3><p className="text-sm text-gray-400">Complete then color</p>
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
            <Link href="/contact" className="hover:text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
