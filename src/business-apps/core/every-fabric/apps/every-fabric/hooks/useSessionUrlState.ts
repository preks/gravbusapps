import { useEffect, useCallback, useState } from 'react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'

const BASE_PATH = '/platform/every-fabric'

function getSessionIdFromUrl(): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get('sessionId')
}

export const useSessionUrlState = () => {
  const [urlSessionId, setUrlSessionId] = useState<string | null>(() => getSessionIdFromUrl())

  const handlePopState = useCallback(() => {
    setUrlSessionId(getSessionIdFromUrl())
  }, [])

  useEffect(() => {
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [handlePopState])

  const updateUrl = useCallback((sessionId: string | null) => {
    if (sessionId) {
      const url = buildPlatformUrl(BASE_PATH, { sessionId })
      window.history.pushState(null, '', url)
    } else {
      window.history.pushState(null, '', BASE_PATH)
    }
  }, [])

  return { urlSessionId, updateUrl }
}
