'use client'

import { Download, Printer } from 'lucide-react'

interface PageActionsProps {
  previewUrl: string
  slug: string
  title: string
}

export function PageActions({ previewUrl, slug, title }: PageActionsProps) {
  const handlePrint = () => {
    if (!previewUrl) return
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(
        `<!DOCTYPE html><html><head><title>${title}</title><style>@page{size:A4;margin:0.5in}body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:white}img{max-width:100%;max-height:90vh}</style></head><body><img src="${previewUrl}" onload="setTimeout(function(){window.print()},500)"/></body></html>`
      )
      w.document.close()
    }
    // Best-effort download tracking
    fetch(`/api/colouring-pages/${slug}/download`, { method: 'POST' }).catch(() => {})
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-8">
      <a
        href={previewUrl}
        download={`${slug}.png`}
        onClick={() => fetch(`/api/colouring-pages/${slug}/download`, { method: 'POST' }).catch(() => {})}
        className="flex-1 h-14 bg-brand-primary hover:bg-brand-border text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <Download className="w-5 h-5" />
        Download PNG
      </a>
      <button
        onClick={handlePrint}
        className="flex-1 h-14 bg-zinc-700 hover:bg-zinc-600 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-colors"
      >
        <Printer className="w-5 h-5" />
        Print
      </button>
    </div>
  )
}
