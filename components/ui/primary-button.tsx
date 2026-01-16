'use client'

import { Loader2 } from 'lucide-react'

interface PrimaryButtonProps {
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  loading?: boolean
  icon?: React.ReactNode
  variant?: 'primary' | 'secondary' | 'outline'
  className?: string
}

export function PrimaryButton({ 
  children, 
  onClick, 
  disabled, 
  loading, 
  icon,
  variant = 'primary',
  className = '' 
}: PrimaryButtonProps) {
  const baseStyles = "h-12 px-6 rounded-xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
  
  const variants = {
    primary: "bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none",
    secondary: "bg-gray-100 hover:bg-gray-200 text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed",
    outline: "border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 disabled:cursor-not-allowed"
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : icon}
      {children}
    </button>
  )
}