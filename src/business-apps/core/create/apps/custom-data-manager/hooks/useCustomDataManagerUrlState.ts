import { useCallback, useEffect, useRef } from 'react'

export const NAMESPACE_PARAM = 'namespace' as const
export const MODEL_ID_PARAM = 'modelId' as const

export function readUrlSnapshot(): { namespace: string | null; modelId: string | null } {
  if (globalThis.window === undefined) {
    return { namespace: null, modelId: null }
  }
  const params = new URLSearchParams(globalThis.window.location.search)
  return {
    namespace: params.get(NAMESPACE_PARAM)?.trim() || null,
    modelId: params.get(MODEL_ID_PARAM)?.trim() || null
  }
}

type UrlSyncUpdates = { namespace?: string | null; modelId?: string | null }

function applyUrlUpdates(updates: UrlSyncUpdates, usePush: boolean): void {
  if (globalThis.window === undefined) {
    return
  }
  const url = new URL(globalThis.window.location.href)
  for (const [key, value] of Object.entries(updates)) {
    if (key !== 'namespace' && key !== 'modelId') {
      continue
    }
    if (value == null || value === '') {
      url.searchParams.delete(key)
    } else {
      url.searchParams.set(key, value)
    }
  }
  const next = url.pathname + (url.search || '') + url.hash
  if (usePush) {
    globalThis.window.history.pushState(null, '', next)
  } else {
    globalThis.window.history.replaceState(null, '', next)
  }
}

export function pushCustomDataManagerUrl(updates: UrlSyncUpdates): void {
  applyUrlUpdates(updates, true)
}

export function replaceCustomDataManagerUrl(updates: UrlSyncUpdates): void {
  applyUrlUpdates(updates, false)
}

export function useCustomDataManagerUrlState(options: {
  onUrlSnapshot: (snapshot: ReturnType<typeof readUrlSnapshot>) => void
}): { pushUrl: (updates: UrlSyncUpdates) => void; replaceUrl: (updates: UrlSyncUpdates) => void } {
  const { onUrlSnapshot } = options
  const onUrlSnapshotRef = useRef(onUrlSnapshot)
  onUrlSnapshotRef.current = onUrlSnapshot

  const pushUrl = useCallback((updates: UrlSyncUpdates) => {
    applyUrlUpdates(updates, true)
  }, [])

  const replaceUrl = useCallback((updates: UrlSyncUpdates) => {
    applyUrlUpdates(updates, false)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      onUrlSnapshotRef.current(readUrlSnapshot())
    }
    globalThis.window.addEventListener('popstate', handlePopState)
    return () => globalThis.window.removeEventListener('popstate', handlePopState)
  }, [])

  return { pushUrl, replaceUrl }
}
