'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Loader2, Mail, CheckCircle2, ArrowLeft } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { createClient } from '@/lib/supabase/client'

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email.includes('@')) { setError('Please enter a valid email address'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) throw error
      // Always show success (Supabase doesn't reveal whether the email exists).
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen app-bg flex flex-col">
      <NavHeader />
      <main className="flex-1 container mx-auto px-4 sm:px-6 py-10 flex items-center justify-center">
        <div className="w-full max-w-sm">
          {sent ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Check your inbox</h1>
              <p className="text-gray-400 text-sm">
                If an account exists for <span className="text-white font-medium">{email}</span>, we&apos;ve sent a link to reset your password. It expires shortly, so use it soon.
              </p>
              <p className="text-gray-500 text-xs mt-3">
                Can&apos;t see it? Please check your <span className="text-gray-300 font-medium">spam or junk folder</span>.
              </p>
              <Link href="/login" className="mt-5 inline-flex items-center gap-1.5 text-sm text-brand-primary font-semibold hover:underline">
                <ArrowLeft className="w-4 h-4" /> Back to log in
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-extrabold text-white">Reset your password</h1>
                <p className="text-gray-400 text-sm mt-1">Enter your email and we&apos;ll send you a link to set a new one.</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 sm:p-6">
                <form onSubmit={submit} className="space-y-3">
                  <div className="relative">
                    <Mail className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email address"
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-gray-500 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-brand-primary text-[#2A1E00] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send reset link'}
                  </button>
                </form>
                <p className="text-center text-sm text-gray-400 mt-5">
                  Remembered it?{' '}
                  <Link href="/login" className="text-brand-primary font-semibold hover:underline">Log in</Link>
                </p>
              </div>
            </>
          )}
        </div>
      </main>
      <PageFooter />
    </div>
  )
}
