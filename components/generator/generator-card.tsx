'use client'

import { useState } from 'react'
import { UploadButton } from './upload-button'
import { ImagePreview } from './image-preview'
import { OptionalField } from './optional-field'
import { ComplexityToggle } from './complexity-toggle'
import { Loader2 } from 'lucide-react'

type ProcessingState = {
  isProcessing: boolean
  message: string
  progress: number
}

export function GeneratorCard() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [complexity, setComplexity] = useState<'simple' | 'detailed'>('simple')
  const [instructions, setInstructions] = useState('')
  const [customText, setCustomText] = useState('')
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    message: '',
    progress: 0,
  })

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveFile = () => {
    setSelectedFile(null)
    setPreviewUrl(null)
  }

  const handleCreate = async () => {
    if (!selectedFile) return

    setProcessing({ isProcessing: true, message: 'Uploading image...', progress: 0 })
    
    const stages = [
      { message: 'Uploading image...', progress: 10, delay: 1000 },
      { message: 'Analyzing photo...', progress: 30, delay: 2000 },
      { message: 'Generating colouring page...', progress: 60, delay: 3000 },
      { message: 'Almost done...', progress: 90, delay: 1500 },
    ]

    try {
      for (const stage of stages) {
        await new Promise(resolve => setTimeout(resolve, stage.delay))
        setProcessing({
          isProcessing: true,
          message: stage.message,
          progress: stage.progress,
        })
      }

      setProcessing({ isProcessing: false, message: '', progress: 100 })
      alert('Processing complete! Email gate modal will appear here.')
    } catch (error) {
      console.error('Generation error:', error)
      setProcessing({ isProcessing: false, message: '', progress: 0 })
      alert('Generation failed. Please try again.')
    }
  }

  const isProcessingState = processing.isProcessing

  return (
    <div className={isProcessingState ? 'processing-border' : ''}>
      <div className="bg-white rounded-3xl p-10 shadow-lg border border-gray-200">
        {/* Card Header - Larger font */}
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-200">
          <div className="w-8 h-8 rounded-xl flex-shrink-0" style={{
            background: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)'
          }} />
          <h2 className="text-2xl font-black text-gray-900">
            Colouring Page Generator
          </h2>
        </div>

        {/* Processing Status */}
        {isProcessingState && (
          <div className="bg-green-50 rounded-2xl px-6 py-4 mb-8 flex items-center justify-between border-2 border-green-200 animate-in fade-in">
            <div className="flex items-center gap-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary-600" />
              <span className="text-base font-bold text-gray-900 animate-in fade-in">
                {processing.message}
              </span>
            </div>
            <span className="text-base text-gray-600 font-bold">
              {processing.progress}%
            </span>
          </div>
        )}

        {/* Upload Area */}
        <div className="mb-8">
          {previewUrl ? (
            <ImagePreview
              src={previewUrl}
              alt="Uploaded image"
              onRemove={handleRemoveFile}
            />
          ) : (
            <UploadButton
              onFileSelect={handleFileSelect}
              disabled={isProcessingState}
            />
          )}
        </div>

        {/* Optional Fields */}
        <div className="space-y-5 mb-8">
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

        {/* Controls */}
        <div className="pt-8 border-t border-gray-200 space-y-5">
          <ComplexityToggle
            value={complexity}
            onChange={setComplexity}
          />
          
          <button
            onClick={handleCreate}
            disabled={!selectedFile || isProcessingState}
            className="btn-primary"
          >
            {isProcessingState ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Creating...
              </>
            ) : (
              'Create'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
