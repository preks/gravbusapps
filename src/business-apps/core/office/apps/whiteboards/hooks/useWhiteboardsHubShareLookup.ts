import { useCallback, useEffect, useRef, useState } from 'react'
import { WhiteboardApiService } from '../services/WhiteboardApiService'
import type { WhiteboardSummary } from '../types'
import { getWhiteboardCapabilities } from '../utils/whiteboardPermissions'

function shouldLoadShareCount(whiteboard: WhiteboardSummary): boolean {
  return getWhiteboardCapabilities(whiteboard).canManageSharing
}

async function fetchShareCount(accessToken: string, whiteboardId: string): Promise<number> {
  try {
    const shares = await WhiteboardApiService.getSharedUsers(accessToken, whiteboardId)
    return Array.isArray(shares) ? shares.length : 0
  } catch {
    return 0
  }
}

export function useWhiteboardsHubShareLookup(params: { accessToken: string; whiteboards: WhiteboardSummary[] }): {
  sharedUsersCountMap: Record<string, number>
  hasSharesForWhiteboard: (whiteboardId: string) => boolean
  refreshSharesForWhiteboard: (whiteboardId: string) => Promise<void>
} {
  const [sharedUsersCountMap, setSharedUsersCountMap] = useState<Record<string, number>>({})
  const loadedSharesRef = useRef<Set<string>>(new Set())

  const refreshSharesForWhiteboard = useCallback(
    async (whiteboardId: string) => {
      if (!params.accessToken || !whiteboardId) return
      const count = await fetchShareCount(params.accessToken, whiteboardId)
      setSharedUsersCountMap(prev => ({ ...prev, [whiteboardId]: count }))
    },
    [params.accessToken]
  )

  const hasSharesForWhiteboard = useCallback(
    (whiteboardId: string) => (sharedUsersCountMap[whiteboardId] ?? 0) > 0,
    [sharedUsersCountMap]
  )

  useEffect(() => {
    if (!params.accessToken || params.whiteboards.length === 0) return

    const ownedToLoad = params.whiteboards.filter(wb => shouldLoadShareCount(wb) && !loadedSharesRef.current.has(wb.id))
    if (ownedToLoad.length === 0) return

    ownedToLoad.forEach(wb => loadedSharesRef.current.add(wb.id))

    let cancelled = false
    void Promise.all(
      ownedToLoad.map(async wb => {
        const count = await fetchShareCount(params.accessToken, wb.id)
        return { whiteboardId: wb.id, count }
      })
    ).then(results => {
      if (cancelled) return
      setSharedUsersCountMap(prev => {
        const next = { ...prev }
        for (const result of results) {
          next[result.whiteboardId] = result.count
        }
        return next
      })
    })

    return () => {
      cancelled = true
    }
  }, [params.accessToken, params.whiteboards])

  return { sharedUsersCountMap, hasSharesForWhiteboard, refreshSharesForWhiteboard }
}
