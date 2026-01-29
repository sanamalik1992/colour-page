'use client'

import { CheckCircle } from 'lucide-react'

export function ReadyTicker() {
  return (
    <div className="bg-gradient-to-r from-brand-primary to-brand-border rounded-xl p-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-center gap-3">
        <CheckCircle className="w-6 h-6 text-white" />
        <span className="text-white font-semibold text-lg">
          Your colouring page is ready! ✨
        </span>
      </div>
    </div>
  )
}