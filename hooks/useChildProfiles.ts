'use client'

import { useEffect, useState, useCallback } from 'react'

export interface ChildProfile {
  id: string
  name: string
  age: number
}

const KEY = 'childProfiles'

// Child profiles saved locally (no account needed). They autofill the generator
// and packs with a child's name and age. Pro Family personalises the sheets
// themselves with the name; the local store is a convenience for everyone.
export function useChildProfiles() {
  const [profiles, setProfiles] = useState<ChildProfile[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY)
      if (raw) setProfiles(JSON.parse(raw))
    } catch {
      /* ignore corrupt storage */
    }
  }, [])

  const persist = useCallback((next: ChildProfile[]) => {
    setProfiles(next)
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      /* ignore quota errors */
    }
  }, [])

  // Save (or update, matching on case-insensitive name) a child. Returns the id.
  const save = useCallback(
    (name: string, age: number): string => {
      const clean = name.trim().slice(0, 20)
      if (!clean) return ''
      const existing = profiles.find((p) => p.name.toLowerCase() === clean.toLowerCase())
      if (existing) {
        persist(profiles.map((p) => (p.id === existing.id ? { ...p, age } : p)))
        return existing.id
      }
      const id = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`
      persist([...profiles, { id, name: clean, age }])
      return id
    },
    [profiles, persist]
  )

  const remove = useCallback((id: string) => persist(profiles.filter((p) => p.id !== id)), [profiles, persist])

  return { profiles, save, remove }
}
