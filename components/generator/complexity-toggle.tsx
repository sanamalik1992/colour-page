'use client'

interface ComplexityToggleProps {
  value: 'simple' | 'detailed'
  onChange: (value: 'simple' | 'detailed') => void
}

export function ComplexityToggle({ value, onChange }: ComplexityToggleProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      <button
        type="button"
        onClick={() => onChange('simple')}
        className={`
          flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
          ${value === 'simple' 
            ? 'bg-white text-gray-900 shadow-sm' 
            : 'text-gray-600 hover:text-gray-900'}
        `}
      >
        Simple
      </button>
      
      <button
        type="button"
        onClick={() => onChange('detailed')}
        className={`
          flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
          ${value === 'detailed' 
            ? 'bg-white text-gray-900 shadow-sm' 
            : 'text-gray-600 hover:text-gray-900'}
        `}
      >
        Detailed
      </button>
    </div>
  )
}