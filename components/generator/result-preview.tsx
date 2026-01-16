'use client'

import Image from 'next/image'
import { PrimaryButton } from '@/components/ui/primary-button'
import { Download, Printer, RotateCcw, Share2 } from 'lucide-react'

interface ResultPreviewProps {
  resultUrl: string
  onReset: () => void
}

export function ResultPreview({ resultUrl, onReset }: ResultPreviewProps) {
  const handleDownload = () => {
    // Download logic here
    console.log('Download clicked')
  }

  const handlePrint = () => {
    window.print()
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'My Colouring Page',
        text: 'Check out this colouring page I created!',
      })
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Success Message */}
      <div className="bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl p-6 text-center">
        <h2 className="text-2xl font-bold text-white mb-2">
          Your colouring page is ready! 🎉
        </h2>
        <p className="text-emerald-100">
          Download, print, or share your creation below
        </p>
      </div>

      {/* Preview */}
      <div className="bg-white rounded-2xl p-6 shadow-lg">
        <div className="relative w-full aspect-[8.5/11] bg-gray-50 rounded-xl overflow-hidden mb-6">
          <Image
            src={resultUrl}
            alt="Generated colouring page"
            fill
            className="object-contain"
          />
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <PrimaryButton
            onClick={handleDownload}
            variant="primary"
            icon={<Download className="w-4 h-4" />}
          >
            Download
          </PrimaryButton>
          
          <PrimaryButton
            onClick={handlePrint}
            variant="outline"
            icon={<Printer className="w-4 h-4" />}
          >
            Print
          </PrimaryButton>
          
          <PrimaryButton
            onClick={handleShare}
            variant="secondary"
            icon={<Share2 className="w-4 h-4" />}
          >
            Share
          </PrimaryButton>
          
          <PrimaryButton
            onClick={onReset}
            variant="secondary"
            icon={<RotateCcw className="w-4 h-4" />}
          >
            New
          </PrimaryButton>
        </div>
      </div>
    </div>
  )
}