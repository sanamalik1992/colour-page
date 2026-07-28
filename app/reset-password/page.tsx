'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Loader2, Lock, CheckCircle2, AlertCircle } from 'lucide-react'
import { NavHeader } from '@/components/ui/nav-header'
import { PageFooter } from '@/components/ui/page-footer'
import { createClient } from '@/lib/supabase/client'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // The reset link goes through /auth/callback, which exchanges the code for a
  // (recovery) session before landing here. Confirm we actually have one.
  useEffect(() => {
    let cancelled = false
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return
      setHasSession(!!data.session)
      setChecking(false)
    })
    return () => { cancelled = true }
  }, [supabase])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('The passwords don’t match'); return }
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error
      setDone(true)
      setTimeout(() => window.location.assign('/'), 1500)
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
          {checking ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-brand-primary" /></div>
          ) : done ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">Password updated</h1>
              <p className="text-gray-400 text-sm">You&apos;re all set — taking you back in…</p>
            </div>
          ) : !hasSession ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto mb-4" />
              <h1 className="text-xl font-bold text-white mb-2">This link has expired</h1>
              <p className="text-gray-400 text-sm mb-5">Password reset links can only be used once and expire quickly. Request a fresh one and try again.</p>
              <Link href="/forgot-password" className="inline-flex items-center justify-center w-full py-3 rounded-xl bg-brand-primary text-[#2A1E00] font-bold hover:opacity-90 transition-opacity">
                Send a new reset link
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <h1 className="text-2xl font-extrabold text-white">Choose a new password</h1>
                <p className="text-gray-400 text-sm mt-1">Pick something you&apos;ll remember — at least 6 characters.</p>
              </div>
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 sm:p-6">
                <form onSubmit={submit} className="space-y-3">
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="New password"
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-gray-500 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      autoComplete="new-password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-3 py-3 rounded-xl bg-zinc-900 border border-zinc-700 text-white placeholder-gray-500 focus:border-brand-primary focus:outline-none"
                    />
                  </div>
                  {error && <p className="text-sm text-red-400">{error}</p>}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 rounded-xl bg-brand-primary text-[#2A1E00] font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Update password'}
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </main>
      <PageFooter />
    </div>
  )
}
