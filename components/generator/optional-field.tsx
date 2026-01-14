'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface OptionalFieldProps {
  label: string
  placeholder: string
  value: string
  onChange: (value: string) => void
}

export function OptionalField({ label, placeholder, value, onChange }: OptionalFieldProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-primary-500 transition-colors"
      >
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
        <span>{label}</span>
        <span className="text-xs text-gray-400">Optional</span>
      </button>
      
      <div
        className={`
          overflow-hidden transition-all duration-300 ease-in-out
          ${isOpen ? 'max-h-40 opacity-100 mt-2' : 'max-h-0 opacity-0'}
        `}
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="form-input resize-none"
        />
      </div>
    </div>
  )
}