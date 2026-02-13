'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  CircleDot,
  Upload,
  Download,
  Printer,
  Loader2,
  ArrowRight,
  Crown,
  Lock,
  RotateCcw,
  Sparkles,
  Eye,
} from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { useSessionId } from '@/hooks/useSessionId'
import { DOT_COUNT_OPTIONS, DEFAULT_DOT_SETTINGS } from '@/types/dot-job'

type Stage = 'upload' | 'settings' | 'processing' | 'preview'

export default function DotToDotPage() {
  const sessionId = useSessionId()
  const [stage, setStage] = useState<Stage>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [dotCount, setDotCount] = useState(DEFAULT_DOT_SETTINGS.dotCount)
  const [showGuideLines, setShowGuideLines] = useState(DEFAULT_DOT_SETTINGS.showGuideLines)
  const [jobId, setJobId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isPro, setIsPro] = useState(false)
  const [limitReached, setLimitReached] = useState(false)

  // Check usage on mount
  useEffect(() => {
    if (!sessionId) return
    const email = localStorage.getItem('pro_email')
    fetch(`/api/check-limits?sessionId=${sessionId}${email ? `&email=${encodeURIComponent(email)}` : ''}`)
      .then(r => r.json())
      .then(data => {
        setIsPro(data.isPro || false)
      })
      .catch(() => {})
  }, [sessionId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewSrc(reader.result as string)
    reader.readAsDataURL(f)
    setError('')
    setStage('settings')
  }

  const handleGenerate = async () => {
    if (!file || !sessionId) return
    setStage('processing')
    setProgress(0)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('sessionId', sessionId)
      formData.append('dotCount', String(dotCount))
      formData.append('showGuideLines', String(showGuideLines))
      formData.append('difficulty', 'medium')

      const email = localStorage.getItem('pro_email')
      if (email) formData.append('email', email)

      const res = await fetch('/api/dot-jobs/create', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok) {
        if (res.status === 429) {
          setLimitReached(true)
          setError(data.error)
          setStage('upload')
          return
        }
        throw new Error(data.error || 'Failed to create job')
      }

      setJobId(data.jobId)
      if (data.remaining !== undefined) setRemaining(data.remaining)
      setIsPro(data.isPro || false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStage('settings')
    }
  }

  // Poll job status
  useEffect(() => {
    if (!jobId || stage !== 'processing') return

    const poll = async () => {
      try {
        const res = await fetch(`/api/dot-jobs/status?jobId=${jobId}`)
        const data = await res.json()
        if (!data.job) return

        setProgress(data.job.progress || 0)

        if (data.job.status === 'done') {
          setPngUrl(data.job.pngUrl)
          setPdfUrl(data.job.pdfUrl)
          setStage('preview')
        } else if (data.job.status === 'failed') {
          setError(data.job.error || 'Processing failed')
          setStage('settings')
        }
      } catch {
        // keep polling
      }
    }

    const interval = setInterval(poll, 2000)
    poll()
    return () => clearInterval(interval)
  }, [jobId, stage])

  const handleReset = () => {
    setStage('upload')
    setFile(null)
    setPreviewSrc(null)
    setJobId(null)
    setProgress(0)
    setPngUrl(null)
    setPdfUrl(null)
    setError('')
    setDotCount(DEFAULT_DOT_SETTINGS.dotCount)
    setShowGuideLines(DEFAULT_DOT_SETTINGS.showGuideLines)
  }

  const handlePrint = () => {
    if (!pngUrl) return
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(
        `<!DOCTYPE html><html><head><title>Dot-to-Dot</title><style>@page{size:A4;margin:0}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:white}img{max-width:100%;max-height:100vh}</style></head><body><img src="${pngUrl}" onload="setTimeout(function(){window.print()},500)"/></body></html>`
      )
      w.document.close()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <NavHeader active="dot-to-dot" isPro={isPro} />

      <main className="container mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 mb-4">
            <CircleDot className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium text-amber-400">
              {isPro ? 'Pro - Unlimited' : '1 Free Try'}
            </span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3">
            Dot-to-Dot Generator
          </h1>
          <p className="text-gray-400 max-w-xl mx-auto">
            Transform any photo into a numbered connect-the-dots puzzle. Print it and let kids connect the dots!
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Limit Reached */}
          {limitReached && !isPro && (
            <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-2xl p-8 mb-8 text-center">
              <Lock className="w-12 h-12 mx-auto mb-4 text-amber-400" />
              <h3 className="text-xl font-bold text-white mb-2">Free Try Used</h3>
              <p className="text-gray-400 mb-6">
                Upgrade to Pro for unlimited dot-to-dot puzzles plus all other features.
              </p>
              <Link
                href="/pro"
                className="inline-flex items-center gap-2 h-12 px-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-semibold rounded-xl hover:opacity-90 transition-opacity"
              >
                <Crown className="w-5 h-5" />
                Upgrade to Pro
              </Link>
            </div>
          )}

          {error && !limitReached && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-5 py-4 mb-6">
              <p className="text-sm font-semibold text-red-400">{error}</p>
            </div>
          )}

          {/* Upload Stage */}
          {stage === 'upload' && !limitReached && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-zinc-600 rounded-2xl p-12 cursor-pointer hover:border-amber-500/50 hover:bg-zinc-800/30 transition-all">
                <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-amber-500/20">
                  <Upload className="w-10 h-10 text-white" />
                </div>
                <span className="text-lg font-semibold text-white mb-2">Upload a Photo</span>
                <span className="text-sm text-gray-400">JPG, PNG, HEIC up to 20MB</span>
                <input
                  type="file"
                  accept="image/*,.heic,.heif"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>

              {!isPro && remaining !== null && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  {remaining > 0 ? `${remaining} free try remaining` : 'No free tries remaining'}
                </p>
              )}
            </div>
          )}

          {/* Settings Stage */}
          {stage === 'settings' && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8">
              {/* Preview */}
              {previewSrc && (
                <div className="mb-6 rounded-xl overflow-hidden bg-zinc-900 flex items-center justify-center max-h-64">
                  <img src={previewSrc} alt="Preview" className="max-h-64 object-contain" />
                </div>
              )}

              {/* Dot Count */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-white mb-3">Number of Dots</label>
                <div className="grid grid-cols-2 gap-3">
                  {DOT_COUNT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDotCount(opt.value)}
                      className={`p-4 rounded-xl text-left transition-all ${
                        dotCount === opt.value
                          ? 'bg-amber-500/20 border-2 border-amber-500 text-white'
                          : 'bg-zinc-900 border-2 border-zinc-700 text-gray-400 hover:border-zinc-500'
                      }`}
                    >
                      <span className="block font-bold text-lg">{opt.label}</span>
                      <span className="text-xs opacity-70">{opt.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Guide Lines Toggle */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGuideLines}
                    onChange={e => setShowGuideLines(e.target.checked)}
                    className="w-5 h-5 text-amber-500 border-zinc-600 rounded focus:ring-amber-500 bg-zinc-900"
                  />
                  <div>
                    <span className="text-sm font-semibold text-white">Include faint guide lines</span>
                    <span className="block text-xs text-gray-500">Show light connecting lines between dots</span>
                  </div>
                </label>
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                className="w-full h-14 bg-gradient-to-r from-amber-400 to-orange-500 text-white font-bold text-lg rounded-xl hover:from-amber-500 hover:to-orange-600 transition-all flex items-center justify-center gap-3"
              >
                <Sparkles className="w-5 h-5" />
                Generate Dot-to-Dot
                <ArrowRight className="w-5 h-5" />
              </button>

              <button
                onClick={handleReset}
                className="w-full mt-3 text-sm text-gray-500 hover:text-white transition-colors"
              >
                Choose a different photo
              </button>
            </div>
          )}

          {/* Processing Stage */}
          {stage === 'processing' && (
            <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-12 text-center">
              <div className="relative w-24 h-24 mx-auto mb-6">
                <Loader2 className="w-24 h-24 text-amber-400 animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-white">
                  {progress}%
                </span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Creating your puzzle...</h3>
              <p className="text-gray-400 text-sm">
                Detecting edges and placing dots. This takes 10-30 seconds.
              </p>

              {/* Progress bar */}
              <div className="mt-6 max-w-sm mx-auto">
                <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 to-orange-500 rounded-full transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Preview Stage */}
          {stage === 'preview' && (
            <div className="space-y-6">
              {/* Preview Image */}
              {pngUrl && (
                <div className="bg-white rounded-2xl p-4 shadow-xl">
                  <img
                    src={pngUrl}
                    alt="Dot-to-Dot result"
                    className="w-full rounded-xl"
                  />
                </div>
              )}

              {/* Actions */}
              <div className="grid grid-cols-3 gap-3">
                {pdfUrl && (
                  <a
                    href={pdfUrl}
                    download="dot-to-dot.pdf"
                    className="flex flex-col items-center gap-2 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-amber-500/50 transition-all"
                  >
                    <Download className="w-6 h-6 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Download PDF</span>
                  </a>
                )}
                {pngUrl && (
                  <a
                    href={pngUrl}
                    download="dot-to-dot.png"
                    className="flex flex-col items-center gap-2 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-amber-500/50 transition-all"
                  >
                    <Eye className="w-6 h-6 text-amber-400" />
                    <span className="text-sm font-semibold text-white">Download PNG</span>
                  </a>
                )}
                <button
                  onClick={handlePrint}
                  className="flex flex-col items-center gap-2 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-amber-500/50 transition-all"
                >
                  <Printer className="w-6 h-6 text-amber-400" />
                  <span className="text-sm font-semibold text-white">Print</span>
                </button>
              </div>

              {/* Create Another */}
              <button
                onClick={handleReset}
                className="w-full h-12 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Create Another Puzzle
              </button>

              {!isPro && (
                <div className="bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 rounded-xl p-6 text-center">
                  <p className="text-amber-400 font-semibold mb-2">Want unlimited puzzles?</p>
                  <Link
                    href="/pro"
                    className="inline-flex items-center gap-2 text-sm text-white hover:text-amber-400 transition-colors"
                  >
                    <Crown className="w-4 h-4" />
                    Upgrade to Pro
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
