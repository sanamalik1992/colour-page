'use client'

import { useCallback, useEffect, useState } from 'react'

export interface Me {
  user: { id: string; email: string } | null
  isPro: boolean
}

/**
 * The current session identity + Pro status, from the server-verified /api/me.
 * Logged-out visitors get { user: null, isPro: false } so callers can keep the
 * free-try flow open.
 */
export function useMe() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/me', { cache: 'no-store' })
      const data = (await res.json()) as Me
      setMe(data)
    } catch {
      setMe({ user: null, isPro: false })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { me, loading, refresh }
}
