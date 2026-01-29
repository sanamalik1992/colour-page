'use client'
import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Send, Mail, MessageSquare, Loader2, CheckCircle } from 'lucide-react'

export default function ContactPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 1000))
    setSent(true)
    setSending(false)
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 via-zinc-900 to-black">
      <header className="sticky top-0 z-50 bg-zinc-900/80 backdrop-blur-lg border-b border-zinc-800">
        <div className="container mx-auto px-6 flex items-center justify-between h-20">
          <Link href="/" className="relative w-12 h-12"><Image src="/logo.png" alt="colour.page" fill className="object-contain" priority unoptimized /></Link>
          <Link href="/pro" className="h-10 px-5 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold text-sm rounded-lg flex items-center shadow-md">Pro</Link>
        </div>
      </header>

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
              <button type="submit" disabled={sending} className="w-full h-12 bg-gradient-to-r from-brand-primary to-brand-border text-white font-semibold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50">
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Send className="w-5 h-5" />Send Message</>}
              </button>
            </div>
          </form>
        )}

        <div className="mt-12 grid md:grid-cols-2 gap-6">
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 text-center">
            <Mail className="w-8 h-8 text-brand-primary mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-1">Email</h3>
            <p className="text-gray-400 text-sm">hello@colour.page</p>
          </div>
          <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 text-center">
            <MessageSquare className="w-8 h-8 text-brand-primary mx-auto mb-3" />
            <h3 className="font-semibold text-white mb-1">Response Time</h3>
            <p className="text-gray-400 text-sm">Within 24 hours</p>
          </div>
        </div>
      </main>

      <footer className="border-t border-zinc-800 py-12 mt-12">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="text-gray-400 text-sm">© 2025 colour.page</span>
          <div className="flex items-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/terms" className="hover:text-white">Terms</Link>
            <Link href="/contact" className="text-white">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
