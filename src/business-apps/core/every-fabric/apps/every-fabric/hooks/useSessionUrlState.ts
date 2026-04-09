import { useEffect, useCallback, useState } from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

const BASE_PATH = '/platform/every-fabric'

function getSessionIdFromUrl(): string | null {
  if (typeof globalThis.location === 'undefined') return null
  return new URLSearchParams(globalThis.location.search).get('sessionId')
}

export const useSessionUrlState = () => {
  const [urlSessionId, setUrlSessionId] = useState<string | null>(() => getSessionIdFromUrl())

  const handlePopState = useCallback(() => {
    setUrlSessionId(getSessionIdFromUrl())
  }, [])

  useEffect(() => {
    if (typeof globalThis.addEventListener !== 'function') return undefined
    globalThis.addEventListener('popstate', handlePopState)
    return () => globalThis.removeEventListener('popstate', handlePopState)
  }, [handlePopState])

  const updateUrl = useCallback((sessionId: string | null) => {
    if (typeof globalThis.history === 'undefined') return
    if (sessionId) {
      const url = buildPlatformUrl(BASE_PATH, { sessionId })
      globalThis.history.pushState(null, '', url)
    } else {
      globalThis.history.pushState(null, '', BASE_PATH)
    }
  }, [])

  return { urlSessionId, updateUrl }
}
