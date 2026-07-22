'use client'

import { useEffect } from 'react'

/**
 * Safety net for OAuth. Supabase should redirect back to /auth/callback, but if
 * its Redirect-URLs allowlist doesn't include that path it falls back to the
 * Site URL (our homepage) with the `?code=` appended — and nothing there
 * exchanges it, so the user stays logged out. This catches a stray `?code=` on
 * any page and forwards it to /auth/callback (the PKCE verifier cookie is
 * first-party, so the exchange still works), then cleans the URL.
 */
export function OAuthCodeCatcher() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (!code) return
    if (url.pathname === '/auth/callback') return // handled there already

    // Preserve where the user was headed (minus the code) as `next`.
    url.searchParams.delete('code')
    const next = url.pathname + (url.searchParams.toString() ? `?${url.searchParams}` : '')
    window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}&next=${encodeURIComponent(next || '/')}`)
  }, [])

  return null
}
