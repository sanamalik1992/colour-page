'use client'

import { useState, useEffect } from 'react'
import { AnimatedBorderCard } from '@/components/ui/animated-border-card-v2'
import { ProcessingTimer } from '@/components/ui/processing-timer-v2'
import { UploadButton } from '@/components/generator/upload-button'
import { ImagePreview } from '@/components/generator/image-preview'
import { OptionalField } from '@/components/generator/optional-field'
import { ComplexityToggle } from '@/components/generator/complexity-toggle'
import { ResultPreview } from '@/components/generator/result-preview'
import { Sparkles } from 'lucide-react'

export function GeneratorSection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [complexity, setComplexity] = useState<'simple' | 'detailed'>('simple')
  const [instructions, setInstructions] = useState('')
  const [customText, setCustomText] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [minLoaderTime, setMinLoaderTime] = useState(false)

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

    setIsProcessing(true)
    setMinLoaderTime(false)

    // Minimum loader time of 700ms to avoid flicker
    const minTimePromise = new Promise(resolve => {
      setTimeout(() => {
        setMinLoaderTime(true)
        resolve(true)
      }, 700)
    })

    // Simulate generation process (replace with actual API call)
    const generationPromise = new Promise(resolve => {
      setTimeout(() => {
        setResult(previewUrl)
        resolve(true)
      }, 5000)
    })

    // Wait for both minimum time and generation
    await Promise.all([minTimePromise, generationPromise])
    
    setIsProcessing(false)
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
        {result && !isProcessing && (
          <ResultPreview
            resultUrl={result}
            onReset={handleReset}
          />
        )}

        {/* Generator Card */}
        {!result && (
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

              {/* Processing Timer */}
              <ProcessingTimer isProcessing={isProcessing} />

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
                
                <button
                  onClick={handleCreate}
                  disabled={!selectedFile || isProcessing}
                  className="btn-primary w-full"
                >
                  {isProcessing ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Generate Colouring Page
                    </>
                  )}
                </button>
                
                {/* Secondary text under CTA */}
                <p className="text-sm text-gray-500 text-center">
                  Free • No signup required • Instant download
                </p>
              </div>
            </div>
          </AnimatedBorderCard>
        )}
      </div>
    </section>
  )
}
