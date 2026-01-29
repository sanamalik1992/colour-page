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
          block w-full min-h-[160px] border-2 border-dashed rounded-xl
          flex flex-col items-center justify-center gap-3
          transition-all duration-200
          ${disabled 
            ? 'border-gray-300 bg-gray-50 opacity-50 cursor-not-allowed' 
            : 'border-gray-300 bg-gray-50 hover:border-emerald-400 hover:bg-emerald-50/50 cursor-pointer'
          }
        `}
      >
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center shadow-lg">
          <Upload className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <span className="text-base font-semibold text-gray-900 block mb-1">
            Choose Photo
          </span>
          <span className="text-sm text-gray-500">
            PNG, JPG, WEBP up to 10MB
          </span>
        </div>
      </label>
    </div>
  )
}