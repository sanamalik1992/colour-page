'use client'

import Image from 'next/image'
import { X } from 'lucide-react'

interface ImagePreviewProps {
  src: string
  alt: string
  onRemove: () => void
}

export function ImagePreview({ src, alt, onRemove }: ImagePreviewProps) {
  return (
    <div className="relative inline-block">
      <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200">
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover"
        />
      </div>
      
      <button
        onClick={onRemove}
        className="absolute -top-2 -right-2 w-6 h-6 bg-gray-900 hover:bg-gray-700 text-white rounded-full flex items-center justify-center transition-colors shadow-md"
        type="button"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}