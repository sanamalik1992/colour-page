'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Upload,
  Sparkles,
  Download,
  FileText,
  Image as ImageIcon,
  RotateCcw,
  Loader2,
  Lock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  BookOpen,
} from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { useSessionId } from '@/hooks/useSessionId'
import type { PhotoJobSettings, PhotoJobStatus } from '@/types/photo-job'

const STATUS_LABELS: Record<PhotoJobStatus, string> = {
  queued: 'Queued',
  processing: 'Processing image...',
  rendering: 'Rendering A4 PDF...',
  done: 'Ready!',
  failed: 'Failed',
}

const STATUS_COLORS: Record<PhotoJobStatus, string> = {
  queued: 'text-yellow-400',
  processing: 'text-blue-400',
  rendering: 'text-purple-400',
  done: 'text-brand-primary',
  failed: 'text-red-400',
}

export default function CreatePage() {
  const sessionId = useSessionId()

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  // Settings
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')
  const [lineThickness, setLineThickness] = useState<'thin' | 'medium' | 'thick'>('medium')
  const [detailLevel, setDetailLevel] = useState<'low' | 'medium' | 'high'>('medium')

  // Job state
  const [jobId, setJobId] = useState<string | null>(null)
  const [jobStatus, setJobStatus] = useState<PhotoJobStatus | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Results
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const [isWatermarked, setIsWatermarked] = useState(true)

  // Limits
  const [remaining, setRemaining] = useState(3)
  const [isPro, setIsPro] = useState(false)

  // Check limits on mount
  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/check-limits?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        setRemaining(d.remaining ?? 3)
        setIsPro(d.isPro ?? false)
      })
      .catch(() => {})
  }, [sessionId])

  // Handle file selection
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

  // Submit job
  const handleGenerate = async () => {
    if (!file || !sessionId) return
    setIsSubmitting(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', sessionId)
      formData.append('orientation', orientation)
      formData.append('lineThickness', lineThickness)
      formData.append('detailLevel', detailLevel)

      const res = await fetch('/api/photo-jobs/create', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create job')
      }

      setJobId(data.jobId)
      setJobStatus('queued')
      setProgress(0)
      setIsPro(data.isPro ?? false)
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
        const res = await fetch(
          `/api/photo-jobs/status?jobId=${jobId}&sessionId=${sessionId}`
        )
        const data = await res.json()

        if (data.job) {
          setJobStatus(data.job.status)
          setProgress(data.job.progress || 0)
          setIsWatermarked(data.job.is_watermarked ?? true)

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
      } catch {
        // Silently retry
      }
    }

    const interval = setInterval(poll, 2000)
    poll()

    return () => clearInterval(interval)
  }, [jobId, sessionId, jobStatus])

  // Reset
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

  const isProcessing = jobStatus && jobStatus !== 'done' && jobStatus !== 'failed'
  const isDone = jobStatus === 'done'

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <NavHeader active="create" />

      <main className="container mx-auto px-6 py-10">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Photo to Colouring Page
            </h1>
            <p className="text-gray-400">
              Upload any photo and get a print-ready A4 colouring page in seconds
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 md:p-8">
              {/* Limit indicator */}
              {!isPro && (
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                  <span className="text-sm text-gray-500">
                    {remaining > 0 ? `${remaining} free generation${remaining !== 1 ? 's' : ''} left today` : 'Daily limit reached'}
                  </span>
                  {remaining <= 0 && (
                    <Link href="/pro" className="text-sm font-semibold text-brand-primary hover:underline flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Upgrade to Pro
                    </Link>
                  )}
                </div>
              )}

              {/* STEP 1: Upload */}
              {!jobId && !isSubmitting && (
                <>
                  {!preview ? (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
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
                        Drop your photo here or click to browse
                      </p>
                      <p className="text-sm text-gray-400">
                        JPG, PNG, or HEIC &middot; up to 10MB
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {/* Preview */}
                      <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                        <img
                          src={preview}
                          alt="Preview"
                          className="w-full max-h-72 object-contain"
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); setFile(null); setPreview(null) }}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
                        >
                          <RotateCcw className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>

                      {/* STEP 2: Settings */}
                      <div className="space-y-4">
                        <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">
                          Settings
                        </h3>

                        {/* Orientation */}
                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">Orientation</label>
                          <div className="flex gap-2">
                            {(['portrait', 'landscape'] as const).map((o) => (
                              <button
                                key={o}
                                onClick={() => setOrientation(o)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                                  orientation === o
                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {o.charAt(0).toUpperCase() + o.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Line thickness */}
                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">Line Thickness</label>
                          <div className="flex gap-2">
                            {(['thin', 'medium', 'thick'] as const).map((t) => (
                              <button
                                key={t}
                                onClick={() => setLineThickness(t)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                                  lineThickness === t
                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {t.charAt(0).toUpperCase() + t.slice(1)}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Detail level */}
                        <div>
                          <label className="text-sm font-medium text-gray-600 mb-2 block">Detail Level</label>
                          <div className="flex gap-2">
                            {(['low', 'medium', 'high'] as const).map((d) => (
                              <button
                                key={d}
                                onClick={() => setDetailLevel(d)}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                                  detailLevel === d
                                    ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {d === 'low' ? 'Simple' : d === 'high' ? 'Detailed' : 'Medium'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Generate button */}
                      <button
                        onClick={handleGenerate}
                        disabled={!file || remaining <= 0 && !isPro}
                        className="btn-primary w-full"
                      >
                        <Sparkles className="w-5 h-5" />
                        Generate Colouring Page
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Processing State */}
              {isProcessing && (
                <div className="text-center py-8">
                  <div className="relative w-20 h-20 mx-auto mb-6">
                    <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                      <circle
                        cx="40" cy="40" r="35"
                        className="fill-none stroke-gray-100"
                        strokeWidth="6"
                      />
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

                  <p className={`font-semibold text-lg ${STATUS_COLORS[jobStatus!]}`}>
                    {STATUS_LABELS[jobStatus!]}
                  </p>
                  <p className="text-sm text-gray-400 mt-2">
                    Your colouring page is being generated. This usually completes quickly.
                  </p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-700 text-sm">{error}</p>
                      <button
                        onClick={handleReset}
                        className="text-sm text-red-600 hover:underline mt-2 flex items-center gap-1"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Try again
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Done State */}
              {isDone && (
                <div className="space-y-6">
                  {/* Preview */}
                  {pngUrl && (
                    <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                      <img
                        src={pngUrl}
                        alt="Generated colouring page"
                        className="w-full object-contain max-h-[500px]"
                      />
                    </div>
                  )}

                  {/* Watermark notice */}
                  {isWatermarked && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                      <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-sm text-amber-700">
                        Free tier includes a light watermark.{' '}
                        <Link href="/pro" className="font-semibold underline">
                          Upgrade to Pro
                        </Link>{' '}
                        for clean downloads.
                      </p>
                    </div>
                  )}

                  {/* Success message */}
                  <div className="flex items-center gap-2 text-brand-primary">
                    <CheckCircle2 className="w-5 h-5" />
                    <span className="font-semibold">Your colouring page is ready!</span>
                  </div>

                  {/* Download buttons */}
                  <div className="grid grid-cols-2 gap-3">
                    {pdfUrl && (
                      <a
                        href={pdfUrl}
                        download="colouring-page.pdf"
                        className="btn-primary"
                      >
                        <FileText className="w-5 h-5" />
                        Download PDF
                      </a>
                    )}
                    {pngUrl && (
                      <a
                        href={pngUrl}
                        download="colouring-page.png"
                        className="btn-secondary"
                      >
                        <ImageIcon className="w-5 h-5" />
                        Download PNG
                      </a>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3">
                    <button onClick={handleReset} className="btn-outline flex-1">
                      <RotateCcw className="w-4 h-4" />
                      Create Another
                    </button>
                    <Link href="/library" className="btn-secondary flex-1">
                      <BookOpen className="w-4 h-4" />
                      My Library
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
