'use client'
import { useState } from 'react'
import Link from 'next/link'
import { Send, Mail, MessageSquare, Loader2, CheckCircle } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'

const CONTACT_EMAIL = 'hello@colour.page'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    setError('')

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message }),
      })
      const data = await res.json()

      if (res.ok) {
        setSent(true)
      } else {
        setError(data.error || 'Failed to send your message.')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen app-bg">
      <NavHeader />

      <main className="container mx-auto px-6 py-16 max-w-2xl">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-gray-400">Have a question or feedback? We would love to hear from you.</p>
        </div>

        {sent ? (
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-12 text-center">
            <CheckCircle className="w-16 h-16 text-brand-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Message Sent!</h2>
            <p className="text-gray-400 mb-6">We will get back to you within 24 hours.</p>
            <Link href="/" className="inline-flex items-center gap-2 h-12 px-6 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl">Back to Home</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-zinc-800/50 border border-zinc-700 rounded-2xl p-8">
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary" placeholder="Your name" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full h-12 px-4 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary" placeholder="you@example.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Message</label>
                <textarea value={message} onChange={e => setMessage(e.target.value)} required rows={5} className="w-full px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-brand-primary resize-none" placeholder="How can we help?" />
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
                  <p className="text-sm text-red-400">{error}</p>
                  <p className="text-sm text-gray-400 mt-1">
                    You can also email us directly at{' '}
                    <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-primary hover:underline">{CONTACT_EMAIL}</a>.
                  </p>
                </div>
              )}

              <button type="submit" disabled={sending} className="w-full h-12 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" />Send Message</>}
              </button>
            </div>
          </form>
        )}

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <a href={`mailto:${CONTACT_EMAIL}`} className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 text-center hover:border-brand-primary/50 transition-colors">
            <Mail className="w-8 h-8 text-brand-primary mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-1">Email</h3>
            <p className="text-gray-400 text-sm">{CONTACT_EMAIL}</p>
          </a>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 text-center">
            <MessageSquare className="w-8 h-8 text-brand-primary mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-1">Response Time</h3>
            <p className="text-gray-400 text-sm">Within 24 hours</p>
          </div>
        </div>
      </main>

      <PageFooter />
    </div>
  )
}
