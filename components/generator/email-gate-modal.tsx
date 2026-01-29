'use client'

import { useState } from 'react'
import { X, Mail, Loader2, CheckCircle } from 'lucide-react'

interface EmailGateModalProps {
  jobId: string
  sessionId: string
  onClose: () => void
}

export function EmailGateModal({ jobId, sessionId, onClose }: EmailGateModalProps) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, email, sessionId })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to send email')
      }

      setSuccess(true)
      
      setTimeout(() => {
        onClose()
      }, 5000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-brand-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Check Your Inbox! 📧
          </h2>
          <p className="text-gray-600 mb-4">
            We&apos;ve sent your colouring page to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500 mb-2">
            The email should arrive within 1-2 minutes.
          </p>
          <p className="text-xs text-gray-400">
            Check your spam folder if you don&apos;t see it.
          </p>
          <button onClick={onClose} className="mt-6 btn-secondary w-full">
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors">
          <X className="w-6 h-6" />
        </button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-brand-primary to-brand-border rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Get Your Colouring Page
          </h2>
          <p className="text-gray-600">
            Enter your email to receive your download link
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              disabled={loading}
              autoFocus
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                <span>Send Download Link</span>
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            We&apos;ll never share your email. The download link expires in 7 days.
          </p>
        </form>
      </div>
    </div>
  )
}