'use client'

import { useEffect, useState } from 'react'
import { nanoid } from 'nanoid'

export function useSessionId() {
  const [sessionId, setSessionId] = useState<string>('')

  useEffect(() => {
    // Get or create session ID
    let id = localStorage.getItem('sessionId')
    
    if (!id) {
      id = nanoid()
      localStorage.setItem('sessionId', id)
    }
    
    setSessionId(id)
  }, [])

  return sessionId
}