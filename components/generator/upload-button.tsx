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
          block w-full min-h-[160px] border-3 border-dashed border-gray-300 rounded-2xl
          bg-gradient-to-br from-green-50 to-white cursor-pointer transition-all duration-200
          flex flex-col items-center justify-center gap-4
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:border-primary-500 hover:from-green-100 hover:to-green-50 hover:shadow-md'
          }
        `}
      >
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{
          background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
        }}>
          <Upload className="w-8 h-8 text-white" />
        </div>
        <div className="text-center">
          <span className="text-lg font-bold text-gray-900 block mb-1">
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