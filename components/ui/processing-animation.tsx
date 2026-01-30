'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2, Sparkles, Wand2, Printer, Download } from 'lucide-react'

interface ProcessingAnimationProps {
  isProcessing: boolean
}

const STEPS = [
  { id: 1, label: 'Uploading image', icon: Sparkles, duration: 2000 },
  { id: 2, label: 'Analysing photo', icon: Wand2, duration: 3000 },
  { id: 3, label: 'Creating line art', icon: Sparkles, duration: 8000 },
  { id: 4, label: 'Optimising for print', icon: Printer, duration: 2000 },
  { id: 5, label: 'Finalising', icon: Download, duration: 1000 },
]

export function ProcessingAnimation({ isProcessing }: ProcessingAnimationProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [elapsed, setElapsed] = useState(0)
  const estimatedTotal = 15

  useEffect(() => {
    if (!isProcessing) {
      setCurrentStep(0)
      setElapsed(0)
      return
    }
    const startTime = Date.now()
    const timerInterval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000
      setElapsed(elapsedSeconds)
    }, 100)
    const stepInterval = setInterval(() => {
      const elapsedSeconds = (Date.now() - startTime) / 1000
      if (elapsedSeconds < 2) setCurrentStep(0)
      else if (elapsedSeconds < 5) setCurrentStep(1)
      else if (elapsedSeconds < 12) setCurrentStep(2)
      else if (elapsedSeconds < 14) setCurrentStep(3)
      else setCurrentStep(4)
    }, 500)
    return () => {
      clearInterval(timerInterval)
      clearInterval(stepInterval)
    }
  }, [isProcessing])

  if (!isProcessing) return null
  const progressPercent = Math.min((elapsed / estimatedTotal) * 100, 95)

  return (
    <div className="bg-gradient-to-br from-zinc-800/80 to-zinc-900/80 border border-zinc-700 rounded-2xl p-6 mb-6 backdrop-blur-sm">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
            </div>
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-brand-primary rounded-full animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Creating your colouring page</h3>
            <p className="text-sm text-gray-400">This usually takes 10-15 seconds</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-brand-primary tabular-nums">{elapsed.toFixed(0)}s</p>
          <p className="text-xs text-gray-500">elapsed</p>
        </div>
      </div>
      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Progress</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-2 bg-zinc-700 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-brand-primary to-brand-glow rounded-full transition-all duration-500 ease-out relative" style={{ width: `${progressPercent}%` }}>
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
        </div>
      </div>
      <div className="space-y-3">
        {STEPS.map((step, index) => {
          const StepIcon = step.icon
          const isComplete = index < currentStep
          const isCurrent = index === currentStep
          return (
            <div key={step.id} className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${isCurrent ? 'bg-brand-primary/10 border border-brand-primary/30' : isComplete ? 'bg-zinc-800/50' : 'opacity-50'}`}>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isComplete ? 'bg-brand-primary text-white' : isCurrent ? 'bg-brand-primary/20 text-brand-primary' : 'bg-zinc-700 text-gray-400'}`}>
                {isComplete ? <CheckCircle2 className="w-4 h-4" /> : isCurrent ? <Loader2 className="w-4 h-4 animate-spin" /> : <StepIcon className="w-4 h-4" />}
              </div>
              <span className={`text-sm font-medium ${isCurrent ? 'text-white' : isComplete ? 'text-gray-300' : 'text-gray-500'}`}>{step.label}</span>
              {isCurrent && (
                <div className="ml-auto flex gap-1">
                  <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-6 pt-4 border-t border-zinc-700">
        <p className="text-xs text-gray-500 text-center">💡 Tip: Simple images with clear outlines produce the best results!</p>
      </div>
    </div>
  )
}
