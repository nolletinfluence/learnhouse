'use client'

import { useEffect, useState } from 'react'

export function useGoogleSignIn(allowed: boolean) {
  const [status, setStatus] = useState<'checking' | 'configured' | 'unconfigured'>('checking')
  useEffect(() => {
    if (!allowed) return
    const controller = new AbortController()
    fetch('/api/auth/google/authorize', { signal: controller.signal })
      .then(async response => response.ok ? response.json() : { configured: false })
      .then(data => { if (!controller.signal.aborted) setStatus(data.configured === true ? 'configured' : 'unconfigured') })
      .catch(() => { if (!controller.signal.aborted) setStatus('unconfigured') })
    return () => controller.abort()
  }, [allowed])
  return allowed ? status : 'unconfigured'
}
