'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Download, Printer, Share2 } from 'lucide-react'

interface Job {
  id: string
}

interface ResultViewProps {
  job: Job
  resultUrl: string | null
  isPaid: boolean
}

export function ResultView({ job, resultUrl, isPaid }: ResultViewProps) {
  const handlePrint = () => {
    window.print()
  }

  const handleDownload = async () => {
    if (!resultUrl) return

    const response = await fetch(resultUrl)
    const blob = await response.blob()

    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `colouring-page-${job.id}.png`
    a.click()

    window.URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    const shareUrl = window.location.href

    if (navigator.share) {
      await navigator.share({
        title: 'My Colouring Page',
        text: 'Check out this colouring page I created!',
        url: shareUrl,
      })
    } else {
      await navigator.clipboard.writeText(shareUrl)
    }
  }

  if (!isPaid) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="mb-4 text-3xl font-bold">Payment required</h1>
        <p className="text-gray-600">
          Complete your payment to access your colouring page.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Action bar (hidden on print) */}
      <div className="no-print mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your colouring page</h1>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDownload}
            disabled={!resultUrl}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="btn-secondary flex items-center gap-2"
          >
            <Printer className="h-4 w-4" />
            Print
          </button>

          <button
            type="button"
            onClick={handleShare}
            className="btn-secondary flex items-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>

      {/* Result image */}
      <div className="print-only rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        {resultUrl && (
          <div className="relative aspect-[8.5/11] w-full">
            <Image
              src={resultUrl}
              alt="Generated colouring page"
              fill
              className="object-contain"
              priority
            />
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="no-print mt-8 text-center">
        <Link
          href="/"
          className="inline-block rounded-lg bg-gray-100 px-6 py-3 font-medium text-gray-700 transition hover:bg-gray-200"
        >
          Create another
        </Link>
      </div>
    </div>
  )
}
