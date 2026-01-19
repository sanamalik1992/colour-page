'use client'

import { useState, useEffect } from 'react'
import { X, Mail, Loader2, CheckCircle, Download } from 'lucide-react'

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
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)

  useEffect(() => {
    async function getDownloadUrl() {
      try {
        const response = await fetch(`/api/status?jobId=${jobId}&sessionId=${sessionId}`)
        const data = await response.json()
        if (data.signedResultUrl) {
          setDownloadUrl(data.signedResultUrl)
        }
      } catch (err) {
        console.error('Failed to get download URL:', err)
      }
    }
    getDownloadUrl()
  }, [jobId, sessionId])

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
        <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-brand-primary" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Check Your Inbox! 📧
          </h2>
          <p className="text-gray-600 mb-4">
            We&apos;ve sent your colouring page to <strong>{email}</strong>
          </p>
          <p className="text-sm text-gray-500">
            The email should arrive within 1-2 minutes. Check your spam folder if you don&apos;t see it.
          </p>
          
          <button
            onClick={onClose}
            className="mt-6 btn-secondary w-full"
          >
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full relative animate-in fade-in zoom-in-95 duration-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
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
            Download directly or receive via email
          </p>
        </div>

        {downloadUrl && (
          <div className="mb-6">
            
              href={downloadUrl}
              download="coloring-page.png"
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <Download className="w-5 h-5" />
              Download Now
            </a>
            <p className="text-xs text-gray-500 text-center mt-2">
              High-quality A4 PNG ready to print
            </p>
          </div>
        )}

        <div className="relative mb-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">Or send via email</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-brand-border focus:ring-2 focus:ring-brand-primary/20 outline-none transition-all"
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-5 h-5" />
                Send to Email
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            We&apos;ll never share your email. Link expires in 7 days.
          </p>
        </form>
      </div>
    </div>
  )
}