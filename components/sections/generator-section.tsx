'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { AnimatedBorderCard } from '@/components/ui/animated-border-card'
import { ProcessingAnimation } from '@/components/ui/processing-animation'
import { UploadButton } from '@/components/generator/upload-button'
import { ImagePreview } from '@/components/generator/image-preview'
import { OptionalField } from '@/components/generator/optional-field'
import { ComplexityToggle } from '@/components/generator/complexity-toggle'
import { ReadyTicker } from '@/components/generator/ready-ticker'
import { EmailGateModal } from '@/components/generator/email-gate-modal'
import { useSessionId } from '@/hooks/useSessionId'
import { Sparkles, Lock } from 'lucide-react'
import type { Job } from '@/types/job'

const FREE_LIMIT = 3

export function GeneratorSection() {
  const sessionId = useSessionId()
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [complexity, setComplexity] = useState<'simple' | 'detailed'>('simple')
  const [instructions, setInstructions] = useState('')
  const [customText, setCustomText] = useState('')
  const [addTextOverlay, setAddTextOverlay] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [jobId, setJobId] = useState<string | null>(null)
  const [job, setJob] = useState<Job | null>(null)
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [error, setError] = useState('')
  const [usageCount, setUsageCount] = useState(0)
  const [canCreate, setCanCreate] = useState(true)

  const checkLimits = useCallback(async () => {
    if (!sessionId) return
    try {
      const res = await fetch(`/api/check-limits?sessionId=${sessionId}`)
      const data = await res.json()
      setUsageCount(data.used || 0)
      setCanCreate(data.canCreate !== false)
    } catch {
      setCanCreate(true)
    }
  }, [sessionId])

  useEffect(() => {
    if (sessionId) {
      checkLimits()
    }
  }, [sessionId, checkLimits])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
    setError('')
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const handleCreate = async () => {
    if (!selectedFile || !sessionId) return

    if (!canCreate) {
      setError('You have used all 3 free conversions. Upgrade to Pro for unlimited access!')
      return
    }

    setIsProcessing(true)
    setError('')

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('complexity', complexity)
      formData.append('instructions', instructions)
      formData.append('customText', customText)
      formData.append('addTextOverlay', String(addTextOverlay))
      formData.append('sessionId', sessionId)

      const response = await fetch('/api/create', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create job')
      }

      setJobId(data.jobId)
      setUsageCount(prev => prev + 1)
      
      if (usageCount + 1 >= FREE_LIMIT) {
        setCanCreate(false)
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job')
      setIsProcessing(false)
    }
  }

  useEffect(() => {
    if (!jobId || !sessionId) return

    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/status?jobId=${jobId}&sessionId=${sessionId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check status')
        }

        setJob(data.job)

        if (data.job.status === 'completed') {
          setIsProcessing(false)
          setShowEmailGate(true)
        } else if (data.job.status === 'failed') {
          setIsProcessing(false)
          setError(data.job.error_message || 'Generation failed. Please try again.')
        }

      } catch (err) {
        console.error('Status poll error:', err)
      }
    }

    const interval = setInterval(pollStatus, 2000)
    pollStatus()

    return () => clearInterval(interval)
  }, [jobId, sessionId])

  const handleReset = () => {
    setJobId(null)
    setJob(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    setInstructions('')
    setCustomText('')
    setAddTextOverlay(false)
    setIsProcessing(false)
    setShowEmailGate(false)
    setError('')
    checkLimits()
  }

  const remaining = FREE_LIMIT - usageCount

  return (
    <section className="container mx-auto px-6 pb-20">
      <div className="max-w-3xl mx-auto">
        <AnimatedBorderCard isAnimating={isProcessing}>
          <div className="p-8 md:p-10">
            <div className="flex items-center justify-between gap-3 mb-8 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-border rounded-xl flex items-center justify-center shadow-glow">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Colouring Page Generator</h2>
              </div>
              {!canCreate ? (
                <span className="text-sm font-medium text-red-500 flex items-center gap-1">
                  <Lock className="w-4 h-4" /> Limit reached
                </span>
              ) : (
                <span className="text-sm font-medium text-gray-500">{remaining} free {remaining === 1 ? 'try' : 'tries'} left</span>
              )}
            </div>

            {!canCreate && !isProcessing && !job && (
              <div className="bg-gradient-to-r from-brand-primary/10 to-brand-border/10 border border-brand-primary/30 rounded-xl p-6 mb-6 text-center">
                <Lock className="w-10 h-10 mx-auto mb-3 text-brand-primary" />
                <h3 className="text-lg font-bold text-gray-900 mb-2">Free Limit Reached</h3>
                <p className="text-gray-600 mb-4">You have used all 3 free colouring page conversions.</p>
                <Link href="/pro" className="inline-flex items-center gap-2 h-12 px-6 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl hover:opacity-90 transition-opacity">
                  <Sparkles className="w-5 h-5" />
                  Upgrade to Pro - Unlimited Access
                </Link>
              </div>
            )}

            {job?.status === 'completed' && <ReadyTicker />}
            {isProcessing && <ProcessingAnimation isProcessing={isProcessing} />}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6">
                <p className="text-sm font-semibold text-red-600">{error}</p>
                {error.includes('Pro') && (
                  <Link href="/pro" className="text-sm text-brand-primary hover:underline mt-2 inline-block">View Pro Plans →</Link>
                )}
              </div>
            )}

            {canCreate && (
              <div className="mb-6">
                {previewUrl ? (
                  <ImagePreview src={previewUrl} alt="Uploaded image" onRemove={handleRemoveFile} />
                ) : (
                  <UploadButton onFileSelect={handleFileSelect} disabled={isProcessing} />
                )}
              </div>
            )}

            {canCreate && !isProcessing && !job && (
              <>
                <div className="space-y-4 mb-6">
                  <OptionalField label="Instructions (optional)" placeholder="e.g., Make it more detailed, add borders" value={instructions} onChange={setInstructions} />
                  
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <input type="checkbox" checked={addTextOverlay} onChange={(e) => setAddTextOverlay(e.target.checked)} className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary" />
                      <span className="text-sm font-medium text-gray-700">Add text to image</span>
                    </label>
                    
                    {addTextOverlay && (
                      <OptionalField label="" placeholder="Enter your text here" value={customText} onChange={setCustomText} />
                    )}
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-200 space-y-4">
                  <ComplexityToggle value={complexity} onChange={setComplexity} />
                  
                  <button onClick={handleCreate} disabled={!selectedFile || isProcessing} className="btn-primary w-full">
                    <Sparkles className="w-5 h-5" />
                    Generate Colouring Page
                  </button>
                  
                  <p className="text-sm text-gray-500 text-center">{remaining} of 3 free conversions remaining</p>
                </div>
              </>
            )}

            {job?.status === 'completed' && (
              <button onClick={() => setShowEmailGate(true)} className="btn-primary w-full">Get Download Link via Email</button>
            )}

            {job && (
              <button onClick={handleReset} className="btn-secondary w-full mt-4">Create Another</button>
            )}
          </div>
        </AnimatedBorderCard>

        {showEmailGate && jobId && sessionId && (
          <EmailGateModal jobId={jobId} sessionId={sessionId} onClose={() => setShowEmailGate(false)} />
        )}
      </div>
    </section>
  )
}
