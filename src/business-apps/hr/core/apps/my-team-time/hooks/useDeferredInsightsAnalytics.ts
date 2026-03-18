import { useEffect, useState } from 'react'

type IdleCallbackApi = typeof globalThis & {
  requestIdleCallback?: (callback: () => void, options?: { timeout?: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

const idleCallbackApi = globalThis as IdleCallbackApi

const scheduleDeferredLoad = (onReady: () => void): (() => void) => {
  if (idleCallbackApi.requestIdleCallback) {
    const handle = idleCallbackApi.requestIdleCallback(onReady, { timeout: 300 })
    return () => idleCallbackApi.cancelIdleCallback?.(handle)
  }

  const timeoutId = globalThis.setTimeout(onReady, 150)
  return () => globalThis.clearTimeout(timeoutId)
}

export const useDeferredInsightsAnalytics = (): boolean => {
  const [showAbsenceAnalytics, setShowAbsenceAnalytics] = useState(false)

  useEffect(() => {
    if (showAbsenceAnalytics) return
    return scheduleDeferredLoad(() => setShowAbsenceAnalytics(true))
  }, [showAbsenceAnalytics])

  return showAbsenceAnalytics
}
