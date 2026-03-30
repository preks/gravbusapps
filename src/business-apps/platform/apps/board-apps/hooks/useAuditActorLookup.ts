import { useState, useEffect, useRef, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEES_LIGHT_BY_USER_IDS } from '@/common/data/employee/queries/employeeQueries'
import type { BoardAuditLogEntry } from '../types'

export interface ActorInfo {
  displayName: string
  avatar?: string
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function normaliseAvatar(raw?: string): string | undefined {
  if (!raw) return undefined
  return raw.startsWith('data:') ? raw : `data:image/png;base64,${raw}`
}

export function useAuditActorLookup(entries: BoardAuditLogEntry[], accessToken?: string) {
  const graphqlClient = useGraphQLClient(accessToken)
  const [actorMap, setActorMap] = useState<Map<string, ActorInfo>>(new Map())
  const resolvedRef = useRef<Set<string>>(new Set())

  const resolve = useCallback(
    async (ids: string[]) => {
      if (!graphqlClient || ids.length === 0) return

      try {
        const query = GET_EMPLOYEES_LIGHT_BY_USER_IDS(ids)
        const result = await graphqlClient.request<{
          Employee: Array<{
            userId: string
            displayName: string
            firstName?: string
            lastName?: string
            pictureThumbnail?: string
          }>
        }>(query)

        const next = new Map<string, ActorInfo>()
        for (const emp of result.Employee ?? []) {
          const name = emp.displayName || `${emp.firstName ?? ''} ${emp.lastName ?? ''}`.trim() || 'Unknown'
          next.set(emp.userId, {
            displayName: name,
            avatar: normaliseAvatar(emp.pictureThumbnail)
          })
        }

        for (const id of ids) {
          resolvedRef.current.add(id)
          if (!next.has(id)) {
            next.set(id, { displayName: `User ${id.slice(0, 8)}…` })
          }
        }

        setActorMap(prev => {
          const merged = new Map(prev)
          for (const [k, v] of next) merged.set(k, v)
          return merged
        })
      } catch {
        for (const id of ids) resolvedRef.current.add(id)
      }
    },
    [graphqlClient]
  )

  useEffect(() => {
    const unresolvedIds = [
      ...new Set(entries.map(e => e.actorUserId).filter(id => id && UUID_RE.test(id) && !resolvedRef.current.has(id)))
    ]
    if (unresolvedIds.length > 0) void resolve(unresolvedIds)
  }, [entries, resolve])

  return actorMap
}
