// Environment probes shared by the glass card scene and its consumers.
//
// WebGL availability and the user's reduced-motion preference both gate the 3D
// experience: when either fails we render a static design-system fallback grid
// and skip the per-card jitter ticker.

import { useEffect, useState } from 'react'

export function detectWebGL(): boolean {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return !!ctx
  } catch {
    return false
  }
}

export function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
  })
  useEffect(() => {
    if (typeof window === 'undefined') return
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return
    const handler = () => setPrefers(mq.matches)
    mq.addEventListener?.('change', handler)
    return () => mq.removeEventListener?.('change', handler)
  }, [])
  return prefers
}
