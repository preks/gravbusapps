import { useEffect, useRef, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import type { NoteSummary } from '../types'

type OwnerInfo = { name: string; avatar?: string }
type OwnerInfoMap = Map<string, OwnerInfo>

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

export function useNoteAppsHubUserLookup(params: { accessToken: string; notes: NoteSummary[] }): {
  ownerInfoMap: OwnerInfoMap
  sharedUsersMap: Record<string, never[]>
} {
  const graphqlClient = useGraphQLClient(params.accessToken)
  const [ownerInfoMap, setOwnerInfoMap] = useState<OwnerInfoMap>(new Map())
  const loadingOwnerInfoRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!graphqlClient) return

    const loadOwnerInfo = async () => {
      for (const note of params.notes) {
        const ownerId = note.ownerId
        if (!ownerId) continue
        if (ownerInfoMap.has(ownerId)) continue
        if (loadingOwnerInfoRef.current.has(ownerId)) continue

        loadingOwnerInfoRef.current.add(ownerId)
        try {
          const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(ownerId)
          const result = await graphqlClient.request<{
            Employee: Array<{ displayName: string; pictureThumbnail?: string }>
          }>(query)
          const emp = result.Employee?.[0]
          setOwnerInfoMap(prev =>
            new Map(prev).set(ownerId, {
              name: emp?.displayName || `User ${ownerId.slice(0, 8)}`,
              avatar: toAvatarDataUrl(emp?.pictureThumbnail)
            })
          )
        } catch {
          setOwnerInfoMap(prev => new Map(prev).set(ownerId, { name: `User ${ownerId.slice(0, 8)}` }))
        } finally {
          loadingOwnerInfoRef.current.delete(ownerId)
        }
      }
    }

    loadOwnerInfo()
  }, [params.notes, graphqlClient, ownerInfoMap])

  // Notes hub currently does not populate shared users (kept for API parity with other hubs).
  return { ownerInfoMap, sharedUsersMap: {} }
}
