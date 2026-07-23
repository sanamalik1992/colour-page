'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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
  Lock,
  BookOpen,
  Loader2,
} from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { Hero3D } from '@/components/ui/hero-3d'
import { BeforeAfter } from '@/components/ui/before-after'
import { ProActivityPreviews } from '@/components/ui/pro-activity-previews'
import { Footer } from '@/components/sections/footer'
import { useSessionId } from '@/hooks/useSessionId'
import { prepareImageForUpload, readJsonSafe, friendlyError } from '@/lib/client-image'
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

  // Which way in: upload a photo, or type what they're learning today.
  const [genMode, setGenMode] = useState<'photo' | 'topic'>('photo')

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  // 'preparing' while we downscale/convert in the background; 'ready' once set.
  const [uploadState, setUploadState] = useState<'idle' | 'preparing' | 'ready'>('idle')
  // True when the browser can't render the chosen file (e.g. HEIC on Chrome) —
  // we show a clear "photo attached" card instead of a broken image.
  const [previewError, setPreviewError] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const objectUrlsRef = useRef<string[]>([])
  const uploadTokenRef = useRef(0)

  // Topic state ("What are they learning today?")
  const [topic, setTopic] = useState('')
  const [childAge, setChildAge] = useState<number | ''>('')
  // What was actually searched, for the Pro-activity preview thumbnails.
  const [previewToken, setPreviewToken] = useState('')
  const [previewWords, setPreviewWords] = useState<string[]>([])
  const [previewCategory, setPreviewCategory] = useState('')

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

  // Smoothed progress: the server only reports a few coarse milestones and sits
  // still during the (long) AI generation, so we ease a display value forward
  // continuously — it never stalls, never goes backwards, and snaps to real
  // milestones and to 100% when done.
  const [displayPct, setDisplayPct] = useState(0)
  const genStartRef = useRef<number | null>(null)

  // Results
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const [isWatermarked, setIsWatermarked] = useState(true)

  // Dot-to-dot conversion (from the generated colouring page)
  const [dotState, setDotState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [dotPngUrl, setDotPngUrl] = useState<string | null>(null)
  const [dotPdfUrl, setDotPdfUrl] = useState<string | null>(null)
  const [dotError, setDotError] = useState('')

  // Limits
  const [remaining, setRemaining] = useState(3)
  const [isPro, setIsPro] = useState(false)
  // Whether daily limits are actually being enforced. When they're off (testing
  // / launch), we hide the "N free left" counter rather than show a placeholder.
  const [limitsEnforced, setLimitsEnforced] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!sessionId) return
    fetch(`/api/check-limits?sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((d) => {
        setRemaining(d.remaining ?? 3)
        setIsPro(d.isPro ?? false)
        // Only show the counter when the server confirms limits are enforced
        // (the disabled branch returns limitsEnforced:false).
        setLimitsEnforced(d.limitsEnforced !== false)
      })
      .catch(() => {})
  }, [sessionId])

  const trackUrl = (u: string) => {
    objectUrlsRef.current.push(u)
    return u
  }
  const revokeUrls = () => {
    objectUrlsRef.current.forEach((u) => URL.revokeObjectURL(u))
    objectUrlsRef.current = []
  }

  const handleFile = useCallback(async (f: File) => {
    setError('')
    setPreviewError(false)
    const token = ++uploadTokenRef.current
    revokeUrls()

    // Phase A — show the photo and attach it IMMEDIATELY, so the very first tap
    // gives instant feedback. Upload works even if the background prep fails.
    setFileName(f.name)
    setFile(f)
    setPreview(trackUrl(URL.createObjectURL(f)))
    setUploadState('preparing')

    // Phase B — downscale / re-encode to JPEG in the background: keeps uploads
    // small (no 413s) and yields a preview that renders in every browser,
    // including HEIC on Safari. If it's superseded by a newer pick, bail.
    try {
      const prepared = await prepareImageForUpload(f)
      if (token !== uploadTokenRef.current) return
      setFile(prepared)
      if (prepared !== f && prepared.type === 'image/jpeg') {
        setPreview(trackUrl(URL.createObjectURL(prepared)))
        setPreviewError(false)
      }
    } catch {
      // Keep the original file + preview; the server converts HEIC on its side.
    } finally {
      if (token === uploadTokenRef.current) setUploadState('ready')
    }
  }, [])

  // Release object URLs when leaving the page.
  useEffect(() => () => revokeUrls(), [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const f = e.dataTransfer.files[0]
      // Accept HEIC/HEIF too (their MIME type is sometimes empty on drop).
      if (f && (f.type.startsWith('image/') || /\.(heic|heif)$/i.test(f.name))) handleFile(f)
    },
    [handleFile]
  )

  const handleGenerate = async () => {
    if (!file || !sessionId) return
    setIsSubmitting(true)
    setError('')
    genStartRef.current = Date.now()
    setDisplayPct(0)

    // Upload with a hard timeout so a stalled request can't leave the UI on
    // "submitting" forever, and one automatic retry to ride out a flaky network.
    const postOnce = async (): Promise<Response> => {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 45000)
      try {
        const fd = new FormData()
        fd.append('file', file)
        fd.append('sessionId', sessionId)
        fd.append('orientation', orientation)
        fd.append('lineThickness', lineThickness)
        fd.append('detailLevel', detailLevel)
        return await fetch('/api/photo-jobs/create', { method: 'POST', body: fd, signal: controller.signal })
      } finally {
        clearTimeout(timer)
      }
    }

    try {
      let res: Response
      try {
        res = await postOnce()
      } catch {
        res = await postOnce() // one retry on network error / timeout
      }

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(friendlyError(res.status, data))

      setJobId(data.jobId as string)
      setJobStatus('queued')
      setProgress(0)
      setIsPro((data.isPro as boolean) ?? false)
    } catch (err) {
      const msg =
        err instanceof Error && err.name === 'AbortError'
          ? 'The upload timed out — please check your connection and tap Generate again.'
          : err instanceof Error
            ? err.message
            : 'Failed to start generation'
      setError(msg)
      setIsSubmitting(false)
    }
  }

  const handleGenerateTopic = async (topicOverride?: string, ageOverride?: number | '') => {
    const useTopic = (topicOverride ?? topic).trim()
    const useAge = ageOverride ?? childAge
    if (!useTopic || !sessionId) return
    setIsSubmitting(true)
    setError('')
    genStartRef.current = Date.now()
    setDisplayPct(0)

    try {
      const res = await fetch('/api/topic-jobs/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: useTopic,
          sessionId,
          age: useAge === '' ? undefined : useAge,
        }),
      })

      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(friendlyError(res.status, data))

      // Remember what was searched so the Pro preview reflects it. Prefer the
      // glyph (e.g. "SH"); otherwise a short token from the typed topic.
      const derived = useTopic.toUpperCase().replace(/[^A-Z ]/g, '').split(' ').filter(Boolean).pop() || 'A'
      setPreviewToken((data.glyph as string) || derived.slice(0, 8))
      setPreviewWords(Array.isArray(data.words) ? (data.words as string[]) : [])
      setPreviewCategory(typeof data.category === 'string' ? data.category : '')

      setJobId(data.jobId as string)
      setJobStatus('queued')
      setProgress(0)
      setIsPro((data.isPro as boolean) ?? false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start generation')
      setIsSubmitting(false)
    }
  }

  // Ready-made gallery pick: the gallery links here as `/?topic=Lion&age=4`.
  // Once the session is ready, switch to topic mode, prefill, and kick off the
  // generation automatically so children go straight to their page.
  const autoRanRef = useRef(false)
  useEffect(() => {
    if (autoRanRef.current || !sessionId) return
    const params = new URLSearchParams(window.location.search)
    const t = (params.get('topic') || '').trim().slice(0, 80)
    if (!t) return
    autoRanRef.current = true
    const ageNum = parseInt(params.get('age') || '', 10)
    const age: number | '' = Number.isFinite(ageNum) ? Math.max(3, Math.min(10, ageNum)) : ''
    setGenMode('topic')
    setTopic(t)
    setChildAge(age)
    // Clear the query string so a later reset/refresh doesn't re-trigger.
    window.history.replaceState(null, '', window.location.pathname)
    handleGenerateTopic(t, age)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

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
      } catch { /* retry */ }
    }

    const interval = setInterval(poll, 2000)
    poll()
    return () => clearInterval(interval)
  }, [jobId, sessionId, jobStatus])

  // Track the REAL server progress rather than racing to ~96% and sitting there
  // (which is what made a slow job feel frozen and dishonest). The bar stays
  // close to the actual server value, never more than ~6% ahead, and always
  // inches a touch so it reads as alive — but if the server genuinely stalls, it
  // holds near the true percentage instead of pretending it's almost done.
  useEffect(() => {
    const processing = jobStatus && jobStatus !== 'done' && jobStatus !== 'failed'
    if (!processing) return
    if (genStartRef.current == null) genStartRef.current = Date.now()
    const id = setInterval(() => {
      setDisplayPct((prev) => {
        const ceiling = Math.min(96, Math.max(progress + 6, 10)) // never far past reality
        const next = Math.max(prev, progress) + 0.2 // follow milestones + gentle drift
        return Math.min(next, ceiling)
      })
    }, 200)
    return () => clearInterval(id)
  }, [jobStatus, progress])

  // Snap to 100% when finished.
  useEffect(() => {
    if (jobStatus === 'done') setDisplayPct(100)
  }, [jobStatus])

  const handleReset = () => {
    revokeUrls()
    setFile(null)
    setPreview(null)
    setPreviewError(false)
    setUploadState('idle')
    setFileName('')
    setTopic('')
    genStartRef.current = null
    setDisplayPct(0)
    setJobId(null)
    setJobStatus(null)
    setProgress(0)
    setError('')
    setPdfUrl(null)
    setPngUrl(null)
    setIsSubmitting(false)
    setDotState('idle')
    setDotPngUrl(null)
    setDotPdfUrl(null)
    setDotError('')
  }

  // Retry the SAME sheet after a failure/timeout, without making the parent
  // re-type the topic or re-pick the photo. Clears only the job/error state,
  // then re-runs the generator for the current mode.
  const handleRetry = () => {
    setError('')
    setJobId(null)
    setJobStatus(null)
    setProgress(0)
    setDisplayPct(0)
    genStartRef.current = null
    setPdfUrl(null)
    setPngUrl(null)
    if (genMode === 'topic') handleGenerateTopic()
    else handleGenerate()
  }
  const canRetry = genMode === 'topic' ? !!topic.trim() : !!file

  const handleMakeDotToDot = async () => {
    if (!jobId) return
    setDotState('loading')
    setDotError('')
    try {
      const res = await fetch('/api/photo-jobs/to-dot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, sessionId, dotCount: 50 }),
      })
      const data = await readJsonSafe(res)
      if (!res.ok) throw new Error(friendlyError(res.status, data))
      setDotPngUrl((data.pngUrl as string) || null)
      setDotPdfUrl((data.pdfUrl as string) || null)
      setDotState('done')
    } catch (err) {
      setDotError(err instanceof Error ? err.message : 'Could not create the dot-to-dot.')
      setDotState('error')
    }
  }

  const handlePrintDot = () => {
    if (!dotPngUrl) return
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(
        `<!DOCTYPE html><html><head><title>Dot-to-Dot</title><style>@page{size:A4;margin:0.5in}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:white}img{max-width:100%;max-height:95vh}</style></head><body><img src="${dotPngUrl}" onload="setTimeout(function(){window.print()},400)"/></body></html>`
      )
      w.document.close()
    }
  }

  if (!mounted) return null

  const isProcessing = jobStatus && jobStatus !== 'done' && jobStatus !== 'failed'
  const isDone = jobStatus === 'done'
  const limitReached = !isPro && remaining <= 0

  const pct = Math.round(displayPct)
  const elapsedSec = isProcessing && genStartRef.current != null
    ? (Date.now() - genStartRef.current) / 1000
    : 0
  // Detailed sheets (several generated pictures) legitimately take a while. Once
  // we're near the top of the bar, reassure rather than sit on a frozen number
  // so a slow-but-fine job never reads as "stuck".
  const stageLabel =
    pct < 12 ? (genMode === 'topic' ? 'Planning the activity…' : 'Getting your photo ready…')
      : pct < 45 ? (genMode === 'topic' ? 'Designing the sheet…' : 'Reading your photo…')
      : pct < 75 ? 'Drawing the outlines…'
      : elapsedSec > 70 ? 'Still working — detailed sheets can take a minute or two…'
      : pct < 95 ? 'Adding the finishing touches…'
      : 'Almost ready…'

  return (
    <div className="min-h-screen app-bg">
      <NavHeader active="create" isPro={isPro} />

      <main className="container mx-auto px-4 sm:px-6 pt-8 sm:pt-12 pb-16 relative">
        <Hero3D />
        <div className="max-w-xl mx-auto relative z-10">
          {/* Headline */}
          <div className="text-center mb-7">
            <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-5">
              <Sparkles className="w-3.5 h-3.5 text-brand-glow" />
              <span className="text-xs sm:text-sm font-semibold text-gray-300 tracking-wide">Free &middot; No sign-up needed</span>
            </div>
            <h1 className="font-display text-4xl sm:text-[3.25rem] font-extrabold text-white mb-4 leading-[0.98]">
              Screen-time that ends<br className="hidden sm:block" /> up on the <span className="text-brand-glow">fridge</span>.
            </h1>
            <p className="text-gray-400 text-base sm:text-lg max-w-md mx-auto mb-6">
              Turn a photo into a colouring page — or type what they&rsquo;re learning today. Print-ready in seconds.
            </p>
            {/* One glance = they get it: a photo becomes a printable colouring page. */}
            <BeforeAfter />
          </div>

          {/* Generator Card */}
          <div className="bg-white rounded-3xl shadow-2xl ring-1 ring-black/5 overflow-hidden">
            <div className="p-5 sm:p-8">

              {/* Mode tabs: photo upload vs learning topic */}
              {!jobId && !isSubmitting && (
                <div className="grid grid-cols-2 gap-2 mb-5 p-1 bg-gray-100 rounded-xl">
                  <button
                    onClick={() => { setGenMode('photo'); setError('') }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      genMode === 'photo' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Upload className="w-4 h-4" /> From a photo
                  </button>
                  <button
                    onClick={() => { setGenMode('topic'); setError('') }}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                      genMode === 'topic' ? 'bg-white text-brand-primary shadow-sm' : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Sparkles className="w-4 h-4" /> Learning topic
                  </button>
                </div>
              )}

              {/* Limit indicator — only shown when limits are actually enforced,
                  so a real visitor never sees a placeholder count. */}
              {!isPro && limitsEnforced && !jobId && !isSubmitting && (
                <div className="flex items-center justify-between mb-5 pb-4 border-b border-gray-100">
                  <span className="text-sm text-gray-500">
                    {remaining > 0
                      ? `${remaining} free generation${remaining !== 1 ? 's' : ''} left today`
                      : 'Daily free limit reached'}
                  </span>
                  {limitReached && (
                    <Link href="/pro" className="text-sm font-semibold text-brand-primary hover:underline flex items-center gap-1">
                      <Lock className="w-3.5 h-3.5" /> Upgrade
                    </Link>
                  )}
                </div>
              )}

              {/* Upload State (photo mode) */}
              {genMode === 'photo' && !jobId && !isSubmitting && (
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
                      <div className="relative rounded-xl overflow-hidden bg-gray-50 border border-gray-100 min-h-[9rem]">
                        {previewError ? (
                          // Browser can't render this file (e.g. HEIC on Chrome) —
                          // confirm it's attached rather than showing a blank box.
                          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                            <ImageIcon className="w-10 h-10 text-emerald-500 mb-2" />
                            <p className="font-semibold text-gray-700">Photo attached</p>
                            <p className="text-xs text-gray-400 mt-1 max-w-[15rem] truncate">{fileName}</p>
                          </div>
                        ) : (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={preview}
                            alt="Preview"
                            className="w-full max-h-64 object-contain"
                            onError={() => setPreviewError(true)}
                          />
                        )}
                        {uploadState === 'preparing' && (
                          <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                            <span className="flex items-center gap-2 text-gray-700 text-sm font-medium bg-white/90 px-3 py-1.5 rounded-full shadow">
                              <Loader2 className="w-4 h-4 animate-spin" /> Getting your photo ready…
                            </span>
                          </div>
                        )}
                        <button
                          onClick={(e) => { e.stopPropagation(); revokeUrls(); setFile(null); setPreview(null); setPreviewError(false); setUploadState('idle'); setFileName('') }}
                          className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center shadow hover:bg-red-50 transition-colors"
                          aria-label="Remove photo"
                        >
                          <RotateCcw className="w-4 h-4 text-gray-600" />
                        </button>
                      </div>

                      {/* Settings */}
                      <div className="space-y-4">
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

                      <button
                        onClick={handleGenerate}
                        disabled={limitReached || uploadState === 'preparing'}
                        className="btn-primary w-full"
                      >
                        {uploadState === 'preparing' ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Getting your photo ready…</>
                        ) : (
                          <><Sparkles className="w-5 h-5" /> Generate Colouring Page</>
                        )}
                      </button>

                      {limitReached && (
                        <p className="text-xs text-gray-400 text-center">
                          You&apos;ve used your free generations for today.{' '}
                          <Link href="/pro" className="text-brand-primary font-semibold hover:underline">Go Pro</Link> for unlimited.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Photo-privacy reassurance — parents hesitate before uploading
                      photos of their children. Wording matches /privacy. */}
                  <div className="mt-4 flex items-start gap-2 rounded-xl bg-gray-50 border border-gray-100 px-3.5 py-3">
                    <Lock className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-gray-500 leading-relaxed">
                      Your photos stay private — never shared, and never used to train AI. You can delete them any time.{' '}
                      <Link href="/privacy" className="text-gray-600 font-semibold hover:underline">How we handle your data</Link>
                    </p>
                  </div>
                </>
              )}

              {/* Topic State ("What are they learning today?") */}
              {genMode === 'topic' && !jobId && !isSubmitting && (
                <div className="space-y-5">
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">
                      What&apos;s your child learning today?
                    </label>
                    <input
                      type="text"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && topic.trim() && !limitReached) handleGenerateTopic() }}
                      maxLength={80}
                      placeholder="e.g. letter B, numbers to 10, space…"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
                    />
                    {/* Quick-pick suggestions */}
                    <div className="flex flex-wrap gap-2 mt-3">
                      {['letters', 'numbers to 10', 'shapes', 'animals', 'space', 'colours', 'minibeasts'].map((s) => (
                        <button
                          key={s}
                          onClick={() => setTopic(s)}
                          className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                            topic === s
                              ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Optional age */}
                  <div>
                    <label className="text-sm font-medium text-gray-600 mb-2 block">
                      Child&apos;s age <span className="text-gray-400 font-normal">(optional — sets the difficulty)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {[3, 4, 5, 6, 7, 8, 9, 10].map((a) => (
                        <button
                          key={a}
                          onClick={() => setChildAge(childAge === a ? '' : a)}
                          className={`w-10 h-10 rounded-lg text-sm font-semibold border transition-all ${
                            childAge === a
                              ? 'border-brand-primary bg-brand-primary/10 text-brand-primary'
                              : 'border-gray-200 text-gray-500 hover:border-gray-300'
                          }`}
                        >
                          {a}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={() => handleGenerateTopic()}
                    disabled={limitReached || !topic.trim()}
                    className="btn-primary w-full"
                  >
                    <Sparkles className="w-5 h-5" />
                    Make a learning sheet
                  </button>

                  {limitReached && (
                    <p className="text-xs text-gray-400 text-center">
                      You&apos;ve used your free sheets for today.{' '}
                      <Link href="/pro" className="text-brand-primary font-semibold hover:underline">Go Pro</Link> for more.
                    </p>
                  )}
                </div>
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
                        strokeDashoffset={`${2 * Math.PI * 35 * (1 - pct / 100)}`}
                        style={{ transition: 'stroke-dashoffset 0.35s linear' }}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-lg font-bold text-gray-800">
                      {pct}%
                    </span>
                  </div>
                  <p className="font-semibold text-gray-700">{stageLabel}</p>
                  <p className="text-sm text-gray-400 mt-1">This usually takes 10–30 seconds</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700">{error}</p>
                      <div className="flex items-center gap-4 mt-1">
                        <button onClick={canRetry ? handleRetry : handleReset} className="text-sm font-semibold text-red-700 hover:underline flex items-center gap-1">
                          <RefreshCw className="w-3.5 h-3.5" /> Try again
                        </button>
                        {canRetry && (
                          <button onClick={handleReset} className="text-sm text-red-600 hover:underline">
                            Start over
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Done State */}
              {isDone && (
                <div className="space-y-5">
                  {pngUrl && (
                    <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={pngUrl} alt="Generated colouring page" className="w-full object-contain max-h-[400px]" />
                    </div>
                  )}

                  {isWatermarked && !isPro && genMode === 'topic' && (
                    <div className="rounded-xl border border-brand-primary/30 bg-zinc-900/60 p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Sparkles className="w-4 h-4 text-brand-primary" />
                        <p className="text-sm font-bold text-white">Pro adds more activities to every sheet</p>
                      </div>
                      <p className="text-xs text-gray-400 mb-4">
                        You&apos;re seeing the free taster. Pro packs in extra age-matched activities
                        — and removes the watermark.
                      </p>
                      {(previewCategory === 'letter' || previewCategory === 'words') && (
                        <ProActivityPreviews token={previewToken} words={previewWords} />
                      )}
                      <Link href="/pro" className="btn-primary w-full mt-4">
                        <Sparkles className="w-4 h-4" />
                        Unlock full activity sheets with Pro
                      </Link>
                    </div>
                  )}

                  {isWatermarked && !isPro && genMode !== 'topic' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3">
                      <Lock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                      <p className="text-sm text-amber-700">
                        Free downloads include a light watermark.{' '}
                        <Link href="/pro" className="font-semibold underline">Upgrade to Pro</Link>{' '}
                        for clean pages.
                      </p>
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

                  <div className="flex gap-3">
                    <button onClick={handleReset} className="btn-outline flex-1">
                      <RotateCcw className="w-4 h-4" /> Create Another
                    </button>
                    <Link href="/library" className="btn-secondary flex-1">
                      <BookOpen className="w-4 h-4" /> My Pages
                    </Link>
                  </div>

                  {/* Turn into a dot-to-dot (uses the clean line art we just made) */}
                  <div className="border-t border-gray-100 pt-5">
                    {dotState === 'done' && dotPngUrl ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-600">
                          <CheckCircle2 className="w-5 h-5" />
                          <span className="font-semibold">Dot-to-dot ready!</span>
                        </div>
                        <div className="rounded-xl overflow-hidden bg-gray-50 border border-gray-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={dotPngUrl} alt="Dot-to-dot puzzle" className="w-full object-contain max-h-[360px]" />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          {dotPdfUrl && (
                            <a href={dotPdfUrl} download="dot-to-dot.pdf" className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 hover:border-amber-400 transition-colors">
                              <FileText className="w-5 h-5 text-amber-500" />
                              <span className="text-xs font-semibold text-gray-700">PDF</span>
                            </a>
                          )}
                          <a href={dotPngUrl} download="dot-to-dot.png" className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 hover:border-amber-400 transition-colors">
                            <ImageIcon className="w-5 h-5 text-amber-500" />
                            <span className="text-xs font-semibold text-gray-700">PNG</span>
                          </a>
                          <button onClick={handlePrintDot} className="flex flex-col items-center gap-1 p-3 rounded-xl border border-gray-200 hover:border-amber-400 transition-colors">
                            <Printer className="w-5 h-5 text-amber-500" />
                            <span className="text-xs font-semibold text-gray-700">Print</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={handleMakeDotToDot}
                          disabled={dotState === 'loading'}
                          className="w-full h-12 rounded-xl font-semibold flex items-center justify-center gap-2 bg-gradient-to-r from-amber-400 to-orange-500 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
                        >
                          {dotState === 'loading' ? (
                            <><Loader2 className="w-5 h-5 animate-spin" /> Making dot-to-dot…</>
                          ) : (
                            <><CircleDot className="w-5 h-5" /> Turn into a Dot-to-Dot</>
                          )}
                        </button>
                        <p className="text-xs text-gray-400 text-center mt-2">
                          Works best when the page shows one clear subject with a bit of space around it (a person, pet, or toy). Very busy scenes or tight close-ups won&apos;t trace into a single outline.
                        </p>
                        {dotState === 'error' && (
                          <p className="text-xs text-red-500 text-center mt-2">{dotError}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="mt-6">
            <Link
              href="/print-pages"
              className="flex items-center gap-3 bg-zinc-800/50 border border-zinc-700 rounded-xl p-4 hover:border-zinc-600 transition-colors group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
                <Printer className="w-5 h-5 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white leading-tight">Colouring Gallery</p>
                <p className="text-xs text-gray-500 truncate">Ready-made pages for kids to choose</p>
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
