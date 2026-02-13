'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  ImagePlus,
  Clock,
  CheckCircle2,
  AlertCircle,
  Printer,
} from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { useSessionId } from '@/hooks/useSessionId'
import type { PhotoJobStatus } from '@/types/photo-job'

interface LibraryJob {
  id: string
  status: PhotoJobStatus
  progress: number
  settings: {
    orientation?: string
    lineThickness?: string
    detailLevel?: string
  }
  is_pro: boolean
  is_watermarked: boolean
  original_filename?: string
  created_at: string
  completed_at?: string
  pdfUrl?: string
  pngUrl?: string
}

const STATUS_ICONS: Record<string, React.ReactNode> = {
  queued: <Clock className="w-4 h-4 text-yellow-500" />,
  processing: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
  rendering: <Loader2 className="w-4 h-4 text-purple-500 animate-spin" />,
  done: <CheckCircle2 className="w-4 h-4 text-brand-primary" />,
  failed: <AlertCircle className="w-4 h-4 text-red-500" />,
}

export default function LibraryPage() {
  const sessionId = useSessionId()
  const [jobs, setJobs] = useState<LibraryJob[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!sessionId) return

    const loadJobs = async () => {
      try {
        const res = await fetch(`/api/photo-jobs/library?sessionId=${sessionId}`)
        const data = await res.json()
        setJobs(data.jobs || [])
      } catch {
        setJobs([])
      } finally {
        setLoading(false)
      }
    }

    loadJobs()

    // Refresh every 10s for in-progress jobs
    const interval = setInterval(loadJobs, 10000)
    return () => clearInterval(interval)
  }, [sessionId])

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const handlePrint = (pngUrl: string, title: string) => {
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(
        `<!DOCTYPE html><html><head><title>${title}</title><style>@page{size:A4;margin:0.5in}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:white}img{max-width:100%;max-height:90vh}</style></head><body><img src="${pngUrl}" onload="setTimeout(function(){window.print()},500)"/></body></html>`
      )
      w.document.close()
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <NavHeader active="library" />

      <main className="container mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">My Library</h1>
          <p className="text-gray-400">All your generated colouring pages in one place</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 text-brand-primary animate-spin mb-4" />
            <p className="text-gray-400">Loading your library...</p>
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <ImagePlus className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">No pages yet</h2>
            <p className="text-gray-400 mb-6">Create your first colouring page to get started!</p>
            <Link href="/create" className="btn-primary inline-flex">
              <ImagePlus className="w-5 h-5" /> Create Colouring Page
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {jobs.map((job) => (
              <div
                key={job.id}
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden hover:border-zinc-600 transition-all group"
              >
                {/* Thumbnail */}
                <div className="aspect-[3/4] bg-zinc-900 relative">
                  {job.pngUrl ? (
                    <img
                      src={job.pngUrl}
                      alt="Colouring page"
                      className="w-full h-full object-contain p-3"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                      {job.status === 'failed' ? (
                        <AlertCircle className="w-10 h-10 mb-2" />
                      ) : (
                        <>
                          <Loader2 className="w-10 h-10 animate-spin mb-2" />
                          <span className="text-sm">{job.progress}%</span>
                        </>
                      )}
                    </div>
                  )}

                  {/* Overlay actions on hover */}
                  {job.status === 'done' && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                      {job.pdfUrl && (
                        <a
                          href={job.pdfUrl}
                          download
                          className="w-11 h-11 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors shadow-lg"
                          title="Download PDF"
                        >
                          <FileText className="w-5 h-5" />
                        </a>
                      )}
                      {job.pngUrl && (
                        <a
                          href={job.pngUrl}
                          download
                          className="w-11 h-11 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors shadow-lg"
                          title="Download PNG"
                        >
                          <Download className="w-5 h-5" />
                        </a>
                      )}
                      {job.pngUrl && (
                        <button
                          onClick={() => handlePrint(job.pngUrl!, 'Colouring Page')}
                          className="w-11 h-11 bg-white rounded-full flex items-center justify-center hover:bg-brand-primary hover:text-white transition-colors shadow-lg"
                          title="Print"
                        >
                          <Printer className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      {STATUS_ICONS[job.status]}
                      <span className="text-sm font-medium text-gray-300 capitalize">
                        {job.status === 'done' ? 'Ready' : job.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatDate(job.created_at)}
                    </span>
                  </div>
                  {job.original_filename && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {job.original_filename}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <PageFooter />
    </div>
  )
}
