'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ProcessingTimerProps {
  status: string
  startTime?: number
  isProcessing: boolean
}

export function ProcessingTimer({ status, startTime, isProcessing }: ProcessingTimerProps) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!isProcessing || !startTime) {
      setElapsed(0)
      return
    }

    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000))
    }, 100)

    return () => clearInterval(interval)
  }, [isProcessing, startTime])

  if (!isProcessing) return null

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl px-5 py-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{status}</p>
            <p className="text-xs text-gray-500 mt-0.5">Processing your image...</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-emerald-600">{elapsed}s</p>
          <p className="text-xs text-gray-500">elapsed</p>
        </div>
      </div>
    </div>
  )
}