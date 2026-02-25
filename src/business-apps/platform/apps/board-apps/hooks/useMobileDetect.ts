/**
 * useMobileDetect - detects mobile viewport and touch capability.
 *
 * Used across board components to switch between desktop (side panel, dense table)
 * and mobile (full-screen pages, agenda calendar, stacked kanban) layouts.
 */

import { useState, useEffect } from 'react'

const MOBILE_BREAKPOINT = 768

export interface UseMobileDetectReturn {
  isMobile: boolean
  isTouch: boolean
  viewportWidth: number
}

export function useMobileDetect(): UseMobileDetectReturn {
  const [state, setState] = useState<UseMobileDetectReturn>(() => ({
    isMobile: typeof window !== 'undefined' ? window.innerWidth < MOBILE_BREAKPOINT : false,
    isTouch: typeof window !== 'undefined' ? 'ontouchstart' in window || navigator.maxTouchPoints > 0 : false,
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1024
  }))

  useEffect(() => {
    const handleResize = () => {
      setState(prev => {
        const newWidth = window.innerWidth
        const newIsMobile = newWidth < MOBILE_BREAKPOINT
        if (prev.viewportWidth === newWidth) return prev
        return { ...prev, isMobile: newIsMobile, viewportWidth: newWidth }
      })
    }

    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return state
}
