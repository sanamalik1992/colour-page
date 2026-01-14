'use client'

import { useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Loader2 } from 'lucide-react'
import Image from 'next/image'

interface EmailGateModalProps {
  isOpen: boolean
  onClose: () => void
  previewUrl?: string
  onEmailSubmit: (email: string) => Promise<void>
}

export function EmailGateModal({
  isOpen,
  onClose,
  previewUrl,
  onEmailSubmit,
}: EmailGateModalProps) {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)
    try {
      await onEmailSubmit(email)
      onClose()
    } catch (error) {
      console.error('Email submit error:', error)
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        {/* Overlay */}
        <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 z-50" />
        
        {/* Modal */}
        <Dialog.Content className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-8 max-w-md w-[calc(100%-2rem)] shadow-2xl animate-zoom-in-95">
          {/* Close button */}
          <Dialog.Close className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </Dialog.Close>
          
          {/* Preview thumbnail (optional) */}
          {previewUrl && (
            <div className="mb-4 flex justify-center">
              <div className="relative w-32 h-32 rounded-xl overflow-hidden blur-sm">
                <Image src={previewUrl} alt="Preview" fill className="object-cover" />
              </div>
            </div>
          )}
          
          {/* Content */}
          <Dialog.Title className="text-xl font-semibold text-gray-900 mb-2 text-center">
            Your colouring page is ready!
          </Dialog.Title>
          
          <Dialog.Description className="text-gray-500 text-center mb-6">
            Enter your email to download for free
          </Dialog.Description>
          
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="form-input"
              disabled={isSubmitting}
              required
            />
            
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Download Free'
              )}
            </button>
            
            <p className="text-xs text-gray-400 text-center">
              We'll send you weekly coloring pages
            </p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}