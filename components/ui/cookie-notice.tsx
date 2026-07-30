'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

const STORAGE_KEY = 'cp-cookie-notice-v1'

/**
 * A lightweight, PECR-friendly cookie notice. We only set strictly-necessary
 * cookies (sign-in session, secure checkout) plus privacy-friendly analytics,
 * so this is an acknowledgement banner, not a consent gate — the user can
 * dismiss it and it won't show again. Rendered site-wide from the root layout.
 */
export function CookieNotice() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setShow(true)
    } catch {
      // localStorage unavailable (private mode edge cases) — just don't show.
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setShow(false)
  }

  if (!show) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-[70] p-3 sm:p-4">
      <div className="mx-auto max-w-3xl rounded-2xl border border-zinc-700 bg-zinc-900/95 backdrop-blur px-4 py-3.5 shadow-xl sm:flex sm:items-center sm:gap-4">
        <p className="text-sm text-gray-300 flex-1">
          We use cookies to keep you signed in, process secure checkouts, and understand how the site is used.{' '}
          <Link href="/cookies" className="text-brand-primary font-semibold hover:underline">Learn more</Link>.
        </p>
        <button
          onClick={dismiss}
          className="mt-3 sm:mt-0 w-full sm:w-auto shrink-0 px-5 py-2 rounded-xl bg-brand-primary text-[#2A1E00] font-bold text-sm hover:opacity-90 transition-opacity"
        >
          Got it
        </button>
      </div>
    </div>
  )
}
