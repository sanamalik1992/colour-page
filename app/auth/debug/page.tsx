'use client'

import { useEffect, useState } from 'react'

/**
 * Diagnostic page for auth. Visit /auth/debug after attempting Google sign-in to
 * see whether cookies are set client-side, whether the server sees them, and
 * whether a session resolves. Remove once auth is confirmed working.
 */
export default function AuthDebugPage() {
  const [serverDebug, setServerDebug] = useState<unknown>(null)
  const [me, setMe] = useState<unknown>(null)
  const [clientCookies, setClientCookies] = useState<string[]>([])
  const [href, setHref] = useState('')

  useEffect(() => {
    setHref(window.location.href)
    setClientCookies(
      document.cookie
        .split(';')
        .map((c) => c.trim().split('=')[0])
        .filter((n) => n.startsWith('sb-'))
    )
    fetch('/api/auth-debug', { cache: 'no-store' }).then((r) => r.json()).then(setServerDebug).catch((e) => setServerDebug({ fetchError: String(e) }))
    fetch('/api/me', { cache: 'no-store' }).then((r) => r.json()).then(setMe).catch((e) => setMe({ fetchError: String(e) }))
  }, [])

  const Block = ({ title, data }: { title: string; data: unknown }) => (
    <div style={{ marginBottom: 20 }}>
      <h2 style={{ fontWeight: 700, marginBottom: 6 }}>{title}</h2>
      <pre style={{ background: '#111', color: '#0f0', padding: 12, borderRadius: 8, overflowX: 'auto', fontSize: 13 }}>
        {JSON.stringify(data, null, 2)}
      </pre>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#000', color: '#fff', padding: 24, fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 16 }}>Auth debug</h1>
      <Block title="Current URL" data={href} />
      <Block title="Supabase cookies visible to the BROWSER (names only)" data={clientCookies} />
      <Block title="/api/auth-debug (server view)" data={serverDebug} />
      <Block title="/api/me (session identity)" data={me} />
      <p style={{ color: '#888', fontSize: 12 }}>
        Copy this whole page&apos;s output and send it over. (This page and the debug
        endpoint get removed once sign-in works.)
      </p>
    </div>
  )
}
