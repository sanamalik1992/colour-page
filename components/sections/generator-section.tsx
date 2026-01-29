'use client'

import { useState, useEffect } from 'react'
import { AnimatedBorderCard } from '@/components/ui/animated-border-card'
import { ProcessingAnimation } from '@/components/ui/processing-animation'
import { UploadButton } from '@/components/generator/upload-button'
import { ImagePreview } from '@/components/generator/image-preview'
import { OptionalField } from '@/components/generator/optional-field'
import { ComplexityToggle } from '@/components/generator/complexity-toggle'
import { ReadyTicker } from '@/components/generator/ready-ticker'
import { EmailGateModal } from '@/components/generator/email-gate-modal'
import { useSessionId } from '@/hooks/useSessionId'
import { Sparkles } from 'lucide-react'
import type { Job } from '@/types/job'

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

    setIsProcessing(true)
    setError('')

    try {
      // Create FormData
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('complexity', complexity)
      formData.append('instructions', instructions)
      formData.append('customText', customText)
      formData.append('addTextOverlay', String(addTextOverlay))
      formData.append('sessionId', sessionId)

      // Call create API
      const response = await fetch('/api/create', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create job')
      }

      setJobId(data.jobId)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create job')
      setIsProcessing(false)
    }
  }

  // Poll for job status
  useEffect(() => {
    if (!jobId || !sessionId) return

    const pollStatus = async () => {
      try {
        const response = await fetch(
          `/api/status?jobId=${jobId}&sessionId=${sessionId}`
        )
        
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
          setError(data.job.errorMessage || 'Generation failed')
        }

      } catch (err) {
        console.error('Status poll error:', err)
      }
    }

    // Poll every 2 seconds while processing
    const interval = setInterval(pollStatus, 2000)
    pollStatus() // Initial poll

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
  }

  return (
    <section className="container mx-auto px-6 pb-20">
      <div className="max-w-3xl mx-auto">
        <AnimatedBorderCard isAnimating={isProcessing}>
          <div className="p-8 md:p-10">
            {/* Card Header */}
            <div className="flex items-center gap-3 mb-8 pb-6 border-b border-gray-200">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-primary to-brand-border rounded-xl flex items-center justify-center shadow-glow">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                Colouring Page Generator
              </h2>
            </div>

            {/* Ready Ticker */}
            {job?.status === 'completed' && <ReadyTicker />}

            {/* Processing Timer */}
            {isProcessing && <ProcessingAnimation isProcessing={isProcessing} />}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4 mb-6">
                <p className="text-sm font-semibold text-red-600">{error}</p>
              </div>
            )}

            {/* Upload Area */}
            <div className="mb-6">
              {previewUrl ? (
                <ImagePreview
                  src={previewUrl}
                  alt="Uploaded image"
                  onRemove={handleRemoveFile}
                />
              ) : (
                <UploadButton
                  onFileSelect={handleFileSelect}
                  disabled={isProcessing}
                />
              )}
            </div>

            {/* Options Panel */}
            {!isProcessing && !job && (
              <>
                <div className="space-y-4 mb-6">
                  <OptionalField
                    label="Instructions (optional)"
                    placeholder="e.g., Make it more detailed, add borders"
                    value={instructions}
                    onChange={setInstructions}
                  />
                  
                  <div>
                    <label className="flex items-center gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={addTextOverlay}
                        onChange={(e) => setAddTextOverlay(e.target.checked)}
                        className="w-4 h-4 text-brand-primary border-gray-300 rounded focus:ring-brand-primary"
                      />
                      <span className="text-sm font-medium text-gray-700">
                        Add text to image
                      </span>
                    </label>
                    
                    {addTextOverlay && (
                      <OptionalField
                        label=""
                        placeholder="Enter your text here"
                        value={customText}
                        onChange={setCustomText}
                      />
                    )}
                  </div>
                </div>

                {/* Controls */}
                <div className="pt-6 border-t border-gray-200 space-y-4">
                  <ComplexityToggle
                    value={complexity}
                    onChange={setComplexity}
                  />
                  
                  <button
                    onClick={handleCreate}
                    disabled={!selectedFile || isProcessing}
                    className="btn-primary w-full"
                  >
                    <Sparkles className="w-5 h-5" />
                    Generate Colouring Page
                  </button>
                  
                  <p className="text-sm text-gray-500 text-center">
                    Free • No signup required • Instant download
                  </p>
                </div>
              </>
            )}

            {/* Email Gate Button */}
            {job?.status === 'completed' && (
              <button
                onClick={() => setShowEmailGate(true)}
                className="btn-primary w-full"
              >
                Get Download Link via Email
              </button>
            )}

            {/* Start Over Button */}
            {job && (
              <button
                onClick={handleReset}
                className="btn-secondary w-full mt-4"
              >
                Create Another
              </button>
            )}
          </div>
        </AnimatedBorderCard>

        {/* Email Gate Modal */}
        {showEmailGate && jobId && sessionId && (
          <EmailGateModal
            jobId={jobId}
            sessionId={sessionId}
            onClose={() => setShowEmailGate(false)}
          />
        )}
      </div>
    </section>
  )
}