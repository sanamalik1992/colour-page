'use client'

import { Upload } from 'lucide-react'
import { ChangeEvent, useRef } from 'react'

interface UploadButtonProps {
  onFileSelect: (file: File) => void
  disabled?: boolean
}

export function UploadButton({ onFileSelect, disabled }: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      onFileSelect(file)
    }
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
        id="file-upload"
      />
      
      <label
        htmlFor="file-upload"
        className={`
          block w-full min-h-[140px] border-2 border-dashed border-gray-300 rounded-xl
          bg-gray-50 cursor-pointer transition-all duration-200
          flex flex-col items-center justify-center gap-3
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-primary-500 hover:bg-blue-50'
          }
        `}
      >
        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
          <Upload className="w-6 h-6 text-primary-500" />
        </div>
        <div className="text-center">
          <span className="text-sm font-semibold text-gray-900 block mb-1">
            Choose Photo
          </span>
          <span className="text-xs text-gray-500">
            PNG, JPG, WEBP up to 10MB
          </span>
        </div>
      </label>
    </div>
  )
}