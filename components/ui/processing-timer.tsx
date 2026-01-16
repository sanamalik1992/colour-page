'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ProcessingTimerProps {
  isProcessing: boolean
  onStatusChange?: (status: string) => void
}

const STATUS_STEPS = [
  "Uploading image…",
  "Cleaning up details…",
  "Detecting edges…",
  "Simplifying lines…",
  "Optimising for print…",
  "Finalising your colouring page…",
]

export function ProcessingTimer({ isProcessing, onStatusChange }: ProcessingTimerProps) {
  const [elapsed, setElapsed] = useState(0)
  const [status, setStatus] = useState(STATUS_STEPS[0])
  const [statusIndex, setStatusIndex] = useState(0)

  useEffect(() => {
    if (!isProcessing) {
      setElapsed(0)
      setStatusIndex(0)
      setStatus(STATUS_STEPS[0])
      return
    }

    const startTime = Date.now()

    // Update elapsed time every 100ms
    const timerInterval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000
      setElapsed(elapsedSeconds)
    }, 100)

    // Rotate status every 900ms
    const statusInterval = setInterval(() => {
      setStatusIndex(prev => {
        const nextIndex = (prev + 1) % STATUS_STEPS.length
        const nextStatus = STATUS_STEPS[nextIndex]
        setStatus(nextStatus)
        onStatusChange?.(nextStatus)
        return nextIndex
      })
    }, 900)

    // Show "Still working" message after 8 seconds
    const longRunningTimeout = setTimeout(() => {
      setStatus("Still working — nearly there.")
    }, 8000)

    return () => {
      clearInterval(timerInterval)
      clearInterval(statusInterval)
      clearTimeout(longRunningTimeout)
    }
  }, [isProcessing, onStatusChange])

  if (!isProcessing) return null

  return (
    <div 
      className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl px-5 py-4 mb-6"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-brand-primary motion-reduce:animate-none" />
          <div>
            <p className="text-sm font-semibold text-gray-900">{status}</p>
            <p className="text-xs text-gray-500 mt-0.5">Processing your image...</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-2xl font-bold text-brand-primary tabular-nums">
            {elapsed.toFixed(1)}s
          </p>
          <p className="text-xs text-gray-500">elapsed</p>
        </div>
      </div>
    </div>
  )
}
