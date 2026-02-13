'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Upload,
  Sparkles,
  ArrowRight,
  CircleDot,
  Printer,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { Footer } from '@/components/sections/footer'
import { useSessionId } from '@/hooks/useSessionId'
import type { PhotoJobStatus } from '@/types/photo-job'

const STATUS_LABELS: Record<PhotoJobStatus, string> = {
  queued: 'Queued...',
  processing: 'Processing image...',
  rendering: 'Rendering PDF...',
  done: 'Ready!',
  failed: 'Failed',
}

export default function Home() {
  const sessionId = useSessionId()
  const [mounted, setMounted] = useState(false)

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Job state
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<PhotoJobStatus | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Results
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pngUrl, setPngUrl] = useState<string | null>(null)

  // Limits
  const [remaining, setRemaining] = useState(3)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/check-limits?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((d) => setRemaining(d.remaining ?? 3))
      .catch(() => {})
  }, [sessionId])

  const handleFile = useCallback((f: File) => {
    setFile(f)
    setError('')
    const reader = new FileReader()
    reader.onloadend = () => setPreview(reader.result as string)
    reader.readAsDataURL(f)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      if (f && f.type.startsWith('image/')) handleFile(f)
    },
    [handleFile]
  )

  const handleGenerate = async () => {
    if (!file || !sessionId) return
    setIsSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', sessionId)
      formData.append('orientation', 'portrait')
      formData.append('lineThickness', 'medium')
      formData.append('detailLevel', 'medium')

      const res = await fetch('/api/photo-jobs/create', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create job')

      setJobId(data.jobId)
      setJobStatus('queued')
      setProgress(0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
      setIsSubmitting(false)
    }
  }

  // Poll for status
  useEffect(() => {
    if (!jobId || !sessionId) return
    if (jobStatus === 'done' || jobStatus === 'failed') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/photo-jobs/status?jobId=${jobId}&sessionId=${sessionId}`)
        const data = await res.json()
        if (data.job) {
          setJobStatus(data.job.status)
          setProgress(data.job.progress || 0)
          if (data.job.status === 'done') {
            setPdfUrl(data.signedPdfUrl || null)
            setPngUrl(data.signedPngUrl || null)
            setIsSubmitting(false)
          }
          if (data.job.status === 'failed') {
            setError(data.job.error || 'Generation failed')
            setIsSubmitting(false)
          }
        }
      } catch { /* retry */ }
    }

    const interval = setInterval(poll, 2000)
    poll()
    return () => clearInterval(interval)
  }, [jobId, sessionId, jobStatus])

  const handleReset = () => {
    setFile(null)
    setPreview(null)
    setJobId(null)
    setJobStatus(null)
    setProgress(0)
    setError('')
    setPdfUrl(null)
    setPngUrl(null)
    setIsSubmitting(false)
  }

  if (!mounted) return null

  const isProcessing = jobStatus && jobStatus !== 'done' && jobStatus !== 'failed'
  const isDone = jobStatus === 'done'

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <NavHeader active="create" />

      <main className="container mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16">
        <div className="max-w-xl mx-auto">
          {/* Headline */}
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight tracking-tight">
              Upload a Photo,<br />Print & Colour
            </h1>
            <p className="text-gray-400 text-base sm:text-lg">
              AI turns any photo into a printable colouring page
            </p>
          </div>

          {/* Generator Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-5 sm:p-8">

              {/* Upload State */}
              {!jobId && !isSubmitting && (
                <>
                  {!preview ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
                        dragOver
                          ? 'border-brand-primary bg-brand-primary/5'
                          : 'border-gray-200 hover:border-brand-primary/50 hover:bg-gray-50'
                      }`}
                      onClick={() => {
                        const input = document.createElement('input')
                        input.type = 'file'
                        input.accept = 'image/*,.heic,.heif'
                        input.onchange = (e) => {
                          const f = (e.target as HTMLInputElement).files?.[0]
                          if (f) handleFile(f)
                        }
                        input.click()
                      }}
                    >
                      <Upload className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                      <p className="font-semibold text-gray-700 mb-1">
                        Tap to select a photo
                      </p>
                      <p className="text-sm text-gray-400">
                        or drag and drop &middot; JPG, PNG, HEIC
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                        <img src={preview} alt="Preview" className="w-full max-h-64 object-contain" />
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null) }}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>

                      <button
                        onClick={handleGenerate}
                        disabled={remaining <= 0}
                        className="btn-primary w-full"
                      >
                        <Sparkles className="w-5 h-5" />
                        Generate Colouring Page
                      </button>

                      <p className="text-xs text-gray-400 text-center">
                        {remaining > 0 ? `${remaining} free generation${remaining !== 1 ? 's' : ''} left today` : 'Daily limit reached'}
                      </p>
                    </div>
                  )}
                </>
              )}

              {/* Processing State */}
              {isProcessing && (
                <div className="text-center py-6">
                  <div className="relative w-20 h-20 mx-auto mb-5">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle cx="40" cy="40" r="35" className="fill-none stroke-gray-100" strokeWidth="6" />
                      <circle
                        cx="40" cy="40" r="35"
                        className="fill-none stroke-brand-primary"
                        strokeWidth="6"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 35}`}
                        strokeDashoffset={`${2 * Math.PI * 35 * (1 - progress / 100)}`}
                        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-800">
                      {progress}%
                    </span>
                  </div>
                  <p className="font-semibold text-gray-700">{STATUS_LABELS[jobStatus!]}</p>
                  <p className="text-sm text-gray-400 mt-1">This usually takes 10-30 seconds</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">{error}</p>
                      <button onClick={handleReset} className="text-sm text-red-600 hover:underline mt-1 flex items-center gap-1">
                        <RefreshCw className="w-3.5 h-3.5" /> Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Done State */}
              {isDone && (
                <div className="space-y-5">
                  {pngUrl && (
                    <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                      <img src={pngUrl} alt="Generated colouring page" className="w-full object-contain max-h-[400px]" />
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-brand-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Your colouring page is ready!</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {pdfUrl && (
                      <a href={pdfUrl} download="colouring-page.pdf" className="btn-primary">
                        <FileText className="w-5 h-5" /> PDF
                      </a>
                    )}
                    {pngUrl && (
                      <a href={pngUrl} download="colouring-page.png" className="btn-secondary">
                        <ImageIcon className="w-5 h-5" /> PNG
                      </a>
                    )}
                  </div>

                  <button onClick={handleReset} className="btn-outline w-full">
                    <RotateCcw className="w-4 h-4" /> Create Another
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="grid grid-cols-2 gap-3 mt-6">
            <Link
              href="/dot-to-dot"
              className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 hover:border-zinc-600 transition-colors group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <CircleDot className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">Dot-to-Dot</p>
                <p className="text-xs text-gray-500 truncate">Photo puzzles</p>
              </div>
            </Link>
            <Link
              href="/print-pages"
              className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 hover:border-zinc-600 transition-colors group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">Print Library</p>
                <p className="text-xs text-gray-500 truncate">300+ free pages</p>
              </div>
            </Link>
          </div>

          {/* How it works - compact */}
          <div className="mt-8 text-center">
            <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
              <div className="flex flex-col items-center gap-1">
                <Upload className="w-5 h-5 text-gray-600" />
                <span>Upload</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-700" />
              <div className="flex flex-col items-center gap-1">
                <Sparkles className="w-5 h-5 text-gray-600" />
                <span>AI generates</span>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-700" />
              <div className="flex flex-col items-center gap-1">
                <FileText className="w-5 h-5 text-gray-600" />
                <span>Print</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
