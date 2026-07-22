'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useSessionId } from '@/hooks/useSessionId'

// Coarse, non-identifying label for where the visitor is.
function activityFor(path: string): string {
  if (path === '/') return 'home'
  if (path.startsWith('/print-pages') || path.startsWith('/colouring-pages')) return 'gallery'
  if (path.startsWith('/library')) return 'my-pages'
  if (path.startsWith('/pro')) return 'pro'
  if (path.startsWith('/printer')) return 'printer'
  if (path.startsWith('/result')) return 'result'
  return 'browsing'
}

/**
 * Fires an anonymous presence heartbeat every ~25s so the admin dashboard can
 * show who's on the site now. Fire-and-forget; never blocks anything.
 */
export function PresencePing() {
  const sessionId = useSessionId()
  const pathname = usePathname()

  useEffect(() => {
    if (!sessionId) return
    let cancelled = false
    const ping = () => {
      if (cancelled || typeof document === 'undefined' || document.visibilityState === 'hidden') return
      fetch('/api/presence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, activity: activityFor(pathname) }),
        keepalive: true,
      }).catch(() => {})
    }
    ping()
    const id = setInterval(ping, 25_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [sessionId, pathname])

  return null
}
