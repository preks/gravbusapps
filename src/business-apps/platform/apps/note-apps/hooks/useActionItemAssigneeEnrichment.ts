import { useEffect, useRef } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_EMPLOYEE_LIGHT_BY_USER_ID } from '@/common/data/employee/queries/employeeQueries'
import type { NoteActionItemFlow } from '../types'

function toAvatarDataUrl(pictureThumbnail?: string): string | undefined {
  if (!pictureThumbnail) return undefined
  return pictureThumbnail.startsWith('data:') ? pictureThumbnail : `data:image/png;base64,${pictureThumbnail}`
}

export function useActionItemAssigneeEnrichment(params: {
  accessToken?: string
  flows: NoteActionItemFlow[]
  setFlows: (next: NoteActionItemFlow[]) => void
}): void {
  const graphqlClient = useGraphQLClient(params.accessToken || '')
  const inFlightRef = useRef<Set<string>>(new Set())
  const hydratedRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!graphqlClient) return
    if (!params.flows || params.flows.length === 0) return

    const missing = params.flows.filter(
      f =>
        f.assigneeUserId &&
        (!f.assigneeDisplayName || !f.assigneeAvatarUrl) &&
        !hydratedRef.current.has(f.assigneeUserId)
    )
    if (missing.length === 0) return

    const run = async () => {
      for (const flow of missing) {
        const userId = flow.assigneeUserId
        if (!userId) continue
        if (hydratedRef.current.has(userId)) continue
        if (inFlightRef.current.has(userId)) continue

        inFlightRef.current.add(userId)
        try {
          const query = GET_EMPLOYEE_LIGHT_BY_USER_ID(userId)
          const result = await graphqlClient.request<{
            Employee: Array<{ displayName?: string; pictureThumbnail?: string }>
          }>(query)
          const emp = result.Employee?.[0]
          const displayName = emp?.displayName
          const avatarUrl = toAvatarDataUrl(emp?.pictureThumbnail)

          hydratedRef.current.add(userId)
          params.setFlows(
            params.flows.map(f =>
              f.assigneeUserId === userId
                ? {
                    ...f,
                    assigneeDisplayName: f.assigneeDisplayName || displayName,
                    assigneeAvatarUrl: f.assigneeAvatarUrl || avatarUrl
                  }
                : f
            )
          )
        } catch {
          hydratedRef.current.add(userId)
        } finally {
          inFlightRef.current.delete(userId)
        }
      }
    }

    void run()
    // Intentionally depend on flows array (we want to react when new flows are added)
  }, [graphqlClient, params.flows, params.setFlows])
}
