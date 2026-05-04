import { useEffect, useCallback, useState } from 'react'
import { getCurrentUrlWithUpdatedSearchParams } from '@/common/utils/navigationUtils'

function getSessionIdFromUrl(): string | null {
  if (typeof globalThis.location === 'undefined') return null
  return new URLSearchParams(globalThis.location.search).get('sessionId')
}

function getViewFromUrl(): string | null {
  if (typeof globalThis.location === 'undefined') return null
  if (globalThis.location.pathname.endsWith('/skills')) return 'skills'
  return new URLSearchParams(globalThis.location.search).get('view')
}

function getCurrentPathAndSearch(): string {
  if (globalThis.location === undefined) return ''
  return `${globalThis.location.pathname}${globalThis.location.search}`
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
    if (globalThis.history === undefined || globalThis.location === undefined) return
    const next = getCurrentUrlWithUpdatedSearchParams(params)
    if (!next || next === getCurrentPathAndSearch()) return
    const nextSessionId = 'sessionId' in params ? (params.sessionId ?? null) : getSessionIdFromUrl()
    const nextView = 'view' in params ? (params.view ?? null) : getViewFromUrl()
    const currentState = globalThis.history.state
    globalThis.history.pushState(
      {
        ...(currentState !== null && currentState !== undefined ? currentState : {}),
        sessionId: nextSessionId,
        view: nextView
      },
      '',
      next
    )
    setUrlSessionId(nextSessionId)
    setUrlView(nextView)
  }, [])

  return { urlSessionId, urlView, updateUrl }
}
