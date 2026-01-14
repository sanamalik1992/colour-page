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
          block w-full min-h-[120px] border-2 border-dashed rounded-lg
          bg-gray-50 cursor-pointer transition-all duration-150
          flex flex-col items-center justify-center gap-2
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-300 hover:bg-gray-100'}
        `}
      >
        <Upload className="w-6 h-6 text-gray-400" />
        <span className="text-sm font-medium text-gray-700">Choose Photo</span>
        <span className="text-xs text-gray-400">PNG, JPG, WEBP up to 10MB</span>
      </label>
    </div>
  )
}