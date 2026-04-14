import { useEffect, useCallback, useState } from 'react'
import { getCurrentUrlWithUpdatedSearchParams, navigateTo } from '@/common/utils/navigationUtils'

function getSessionIdFromUrl(): string | null {
  if (typeof globalThis.location === 'undefined') return null
  return new URLSearchParams(globalThis.location.search).get('sessionId')
}

function getViewFromUrl(): string | null {
  if (typeof globalThis.location === 'undefined') return null
  return new URLSearchParams(globalThis.location.search).get('view')
}

export const useSessionUrlState = () => {
  const [urlSessionId, setUrlSessionId] = useState<string | null>(() => getSessionIdFromUrl())
  const [urlView, setUrlView] = useState<string | null>(() => getViewFromUrl())

  const handlePopState = useCallback(() => {
    setUrlSessionId(getSessionIdFromUrl())
    setUrlView(getViewFromUrl())
  }, [])

  useEffect(() => {
    if (typeof globalThis.addEventListener !== 'function') return undefined
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [handlePopState])

  const updateUrl = useCallback((params: { sessionId?: string | null; view?: string | null }) => {
    if (typeof globalThis.history === 'undefined') return
    const next = getCurrentUrlWithUpdatedSearchParams(params)
    navigateTo(next)
  }, [])

  return { urlSessionId, urlView, updateUrl }
}
