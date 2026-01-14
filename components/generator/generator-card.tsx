'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { UploadButton } from './upload-button'
import { ImagePreview } from './image-preview'
import { OptionalField } from './optional-field'
import { ComplexityToggle } from './complexity-toggle'
import { EmailGateModal } from './email-gate-modal'
import { Loader2 } from 'lucide-react'

type Complexity = 'simple' | 'detailed'

type ProcessingState = {
  isProcessing: boolean
  message: string
  progress: number
}

type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

function getOrCreateSessionId() {
  if (typeof window === 'undefined') return ''
  const key = 'colourpage_session_id'
  let id = localStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(key, id)
  }
  return id
}

export function GeneratorCard() {
  const sessionId = useMemo(() => getOrCreateSessionId(), [])
  const pollTimeoutRef = useRef<number | null>(null)

  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [complexity, setComplexity] = useState<Complexity>('simple')
  const [instructions, setInstructions] = useState('')
  const [customText, setCustomText] = useState('')

  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    message: '',
    progress: 0,
  })

  const [jobId, setJobId] = useState<string | null>(null)
  const [showEmailGate, setShowEmailGate] = useState(false)
  const [previewSignedUrl, setPreviewSignedUrl] = useState<string | null>(null)
  const [resultSignedUrl, setResultSignedUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (pollTimeoutRef.current) window.clearTimeout(pollTimeoutRef.current)
    }
  }, [])

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)

    const reader = new FileReader()
    reader.onloadend = () => setPreviewUrl(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
    setJobId(null)
    setPreviewSignedUrl(null)
    setResultSignedUrl(null)
    setShowEmailGate(false)
  }

  const handleCreate = async () => {
    if (!selectedFile) return

    setProcessing({ isProcessing: true, message: 'Uploading image...', progress: 10 })

    try {
      const form = new FormData()
      form.append('file', selectedFile)
      form.append('complexity', complexity)
      form.append('instructions', instructions)
      form.append('customText', customText)
      form.append('sessionId', sessionId)

      const res = await fetch('/api/generate', {
        method: 'POST',
        body: form,
      })

      const response = await res.json()

      if (!res.ok) {
        throw new Error(response?.error || 'Failed to create job')
      }

      const newJobId = response.jobId as string
      setJobId(newJobId)

      setProcessing({ isProcessing: true, message: 'Generating...', progress: 35 })

      const checkStatus = async () => {
        try {
          const statusRes = await fetch(`/api/jobs/${newJobId}`, { method: 'GET' })
          const statusJson = await statusRes.json()

          if (!statusRes.ok) {
            throw new Error(statusJson?.error || 'Failed to fetch job status')
          }

          const status = statusJson?.job?.status as JobStatus | undefined

          if (status === 'completed') {
            setPreviewSignedUrl(statusJson?.preview_signed_url || null)
            setResultSignedUrl(statusJson?.result_signed_url || null)

            setProcessing({ isProcessing: false, message: '', progress: 100 })
            setShowEmailGate(true)
            return
          }

          if (status === 'failed') {
            setProcessing({ isProcessing: false, message: '', progress: 0 })
            alert('Generation failed. Please try again.')
            return
          }

          setProcessing({
            isProcessing: true,
            message: status === 'processing' ? 'Generating...' : 'Queued...',
            progress: status === 'processing' ? 65 : 45,
          })

          pollTimeoutRef.current = window.setTimeout(checkStatus, 2000)
        } catch (err) {
          console.error(err)
          pollTimeoutRef.current = window.setTimeout(checkStatus, 3000)
        }
      }

      pollTimeoutRef.current = window.setTimeout(checkStatus, 1000)
    } catch (error: any) {
      console.error(error)
      setProcessing({ isProcessing: false, message: '', progress: 0 })
      alert(error?.message || 'Something went wrong')
    }
  }

  const isProcessingState = processing.isProcessing

  return (
    <div className={isProcessingState ? 'processing-border' : ''}>
      <div className="mx-auto max-w-[520px] rounded-xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-2.5 border-b border-gray-100 pb-5">
          <div className="h-[26px] w-[26px] rounded-lg bg-gradient-to-br from-primary-500 to-primary-600" />
          <h2 className="text-xl font-bold text-gray-900">Colouring Page Generator</h2>
        </div>

        {isProcessingState && (
          <div className="mb-5 flex items-center justify-between rounded-xl bg-gray-50 px-5 py-3.5">
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary-500" />
              <span className="text-sm font-semibold text-gray-900">{processing.message}</span>
            </div>
            <span className="text-sm font-medium text-gray-500">{processing.progress}%</span>
          </div>
        )}

        <div className="mb-5">
          {previewUrl ? (
            <ImagePreview src={previewUrl} alt="Uploaded image" onRemove={handleRemoveFile} />
          ) : (
            <UploadButton onFileSelect={handleFileSelect} disabled={isProcessingState} />
          )}
        </div>

        <div className="mb-5 space-y-4">
          <OptionalField
            label="Instructions"
            placeholder="e.g., Make it more detailed"
            value={instructions}
            onChange={setInstructions}
          />

          <OptionalField
            label="Text"
            placeholder="Add text to the image"
            value={customText}
            onChange={setCustomText}
          />
        </div>

        <div className="space-y-4 border-t border-gray-100 pt-5">
          <ComplexityToggle value={complexity} onChange={setComplexity} />

          <button
            type="button"
            onClick={handleCreate}
            disabled={!selectedFile || isProcessingState}
            className="btn-primary"
          >
            {isProcessingState ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating...
              </span>
            ) : (
              'Create'
            )}
          </button>
        </div>
      </div>

      <EmailGateModal
        isOpen={showEmailGate}
        onClose={() => setShowEmailGate(false)}
        previewUrl={previewSignedUrl || previewUrl || undefined}
        onEmailSubmit={async (email) => {
          // TODO: wire to your /api/leads endpoint
          console.log('Email submitted:', email, 'jobId:', jobId)
        }}
      />

      {resultSignedUrl && (
        <div className="mx-auto mt-4 max-w-[520px] text-center text-sm text-gray-500">
          <a
            href={resultSignedUrl}
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            Download result
          </a>
        </div>
      )}
    </div>
  )
}
