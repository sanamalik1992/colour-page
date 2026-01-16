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
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-200 max-w-[520px] mx-auto">
        {/* Card Header */}
        <div className="flex items-center gap-3 mb-6 pb-5 border-b border-gray-200">
          <div className="w-7 h-7 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex-shrink-0" />
          <h2 className="text-xl font-bold text-gray-900">
            Colouring Page Generator
          </h2>
        </div>

        {/* Processing Status */}
        {isProcessingState && (
          <div className="bg-blue-50 rounded-xl px-5 py-4 mb-6 flex items-center justify-between border border-blue-100">
            <div className="flex items-center gap-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
              <span className="text-sm font-semibold text-gray-900">
                {processing.message}
              </span>
            </div>
            <span className="text-sm text-gray-600 font-medium">
              {processing.progress}%
            </span>
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
              disabled={isProcessingState}
            />
          )}
        </div>

        {/* Optional Fields */}
        <div className="space-y-4 mb-6">
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
        <div className="pt-6 border-t border-gray-200 space-y-4">
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
                <Loader2 className="w-4 h-4 animate-spin" />
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