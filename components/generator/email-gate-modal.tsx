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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)

    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address')
      return
    }

    setIsSubmitting(true)

    try {
      await onEmailSubmit(email)
      setEmail('')
      onClose()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />

        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-8 shadow-2xl">
          <Dialog.Close className="absolute right-4 top-4 text-gray-400 transition hover:text-gray-600">
            <X className="h-5 w-5" />
          </Dialog.Close>

          {previewUrl && (
            <div className="mb-4 flex justify-center">
              <div className="relative h-32 w-32 overflow-hidden rounded-xl blur-sm">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            </div>
          )}

          <Dialog.Title className="mb-2 text-center text-xl font-semibold text-gray-900">
            Your colouring page is ready
          </Dialog.Title>

          <Dialog.Description className="mb-6 text-center text-gray-500">
            Enter your email to download for free
          </Dialog.Description>

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
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Sending...
                </span>
              ) : (
                'Download Free'
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              We&apos;ll send you weekly coloring pages
            </p>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
