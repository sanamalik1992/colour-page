'use client'

import { useState } from 'react'
import { AnimatedBorderCard } from '@/components/ui/animated-border-card'
import { ProcessingTimer } from '@/components/ui/processing-timer'
import { PrimaryButton } from '@/components/ui/primary-button'
import { UploadButton } from '@/components/generator/upload-button'
import { ImagePreview } from '@/components/generator/image-preview'
import { OptionalField } from '@/components/generator/optional-field'
import { ComplexityToggle } from '@/components/generator/complexity-toggle'
import { ResultPreview } from '@/components/generator/result-preview'
import { Sparkles } from 'lucide-react'

type ProcessingState = {
  isProcessing: boolean
  status: string
  startTime?: number
}

export function GeneratorSection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [complexity, setComplexity] = useState<'simple' | 'detailed'>('simple')
  const [instructions, setInstructions] = useState('')
  const [customText, setCustomText] = useState('')
  const [processing, setProcessing] = useState<ProcessingState>({
    isProcessing: false,
    status: '',
  })
  const [result, setResult] = useState<string | null>(null)

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

    const stages = [
      { status: 'Uploading image...', delay: 1500 },
      { status: 'Analyzing photo...', delay: 2500 },
      { status: 'Removing color...', delay: 3000 },
      { status: 'Defining edges...', delay: 2500 },
      { status: 'Generating colouring page...', delay: 3500 },
      { status: 'Finalizing...', delay: 2000 },
    ]

    setProcessing({
      isProcessing: true,
      status: stages[0].status,
      startTime: Date.now(),
    })

    for (const stage of stages) {
      await new Promise(resolve => setTimeout(resolve, stage.delay))
      setProcessing(prev => ({
        ...prev,
        status: stage.status,
      }))
    }

    // Simulate result
    setResult(previewUrl)
    setProcessing({ isProcessing: false, status: '' })
  }

  const handleReset = () => {
    setResult(null)
    setSelectedFile(null)
    setPreviewUrl(null)
    setInstructions('')
    setCustomText('')
  }

  return (
    <section className="container mx-auto px-6 pb-20">
      <div className="max-w-3xl mx-auto">
        {/* Result Preview */}
        {result && !processing.isProcessing && (
          <ResultPreview
            resultUrl={result}
            onReset={handleReset}
          />
        )}

        {/* Generator Card */}
        {!result && (
          <AnimatedBorderCard isAnimating={processing.isProcessing}>
            <div className="p-8">
              {/* Card Header */}
              <div className="flex items-center gap-3 mb-6 pb-6 border-b border-gray-200">
                <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-green-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Colouring Page Generator
                </h2>
              </div>

              {/* Processing Timer */}
              <ProcessingTimer
                status={processing.status}
                startTime={processing.startTime}
                isProcessing={processing.isProcessing}
              />

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
                    disabled={processing.isProcessing}
                  />
                )}
              </div>

              {/* Optional Fields */}
              <div className="space-y-4 mb-6">
                <OptionalField
                  label="Instructions"
                  placeholder="e.g., Make it more detailed, add borders"
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
                
                <PrimaryButton
                  onClick={handleCreate}
                  disabled={!selectedFile || processing.isProcessing}
                  loading={processing.isProcessing}
                  icon={<Sparkles className="w-4 h-4" />}
                  className="w-full"
                >
                  {processing.isProcessing ? 'Creating...' : 'Create Colouring Page'}
                </PrimaryButton>
              </div>
            </div>
          </AnimatedBorderCard>
        )}
      </div>
    </section>
  )
}