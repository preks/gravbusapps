/**
 * Lightweight hook that resolves one or more employee userIds to
 * { displayName, pictureThumbnail } for use in UI chips / avatars.
 *
 * Deliberately minimal — only fetches the two fields needed by AssigneeChip.
 * Batches multiple userIds into a single GraphQL request.
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface EmployeeSummary {
  userId: string
  displayName: string
  pictureThumbnail: string | null
}

const QUERY = `
  query GetEmployeeSummaries($userIds: [String!]!) {
    Employee(
      where: { userId: { _in: $userIds }, isDeleted: { _eq: false } }
    ) {
      userId
      displayName
      firstName
      lastName
      pictureThumbnail
    }
  }
`

interface RawEmployee {
  userId: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  pictureThumbnail: string | null
}

function toSummary(e: RawEmployee): EmployeeSummary {
  const displayName = e.displayName || [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || 'Unknown'
  return { userId: e.userId, displayName, pictureThumbnail: e.pictureThumbnail ?? null }
}

export function useEmployeeSummaries(
  accessToken: string,
  userIds: string[]
): { summaries: Map<string, EmployeeSummary>; loading: boolean } {
  const [summaries, setSummaries] = useState<Map<string, EmployeeSummary>>(new Map())
  const [loading, setLoading] = useState(false)
  const graphqlClient = useGraphQLClient(accessToken)

  const dedupedIds = userIds.filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)

  const fetch = useCallback(async () => {
    if (!accessToken || dedupedIds.length === 0) {
      setSummaries(new Map())
      return
    }
    setLoading(true)
    try {
      const result = await graphqlClient.request<{ Employee: RawEmployee[] }>(QUERY, {
        userIds: dedupedIds
      })
      const map = new Map<string, EmployeeSummary>()
      for (const e of result.Employee ?? []) {
        map.set(e.userId, toSummary(e))
      }
      setSummaries(map)
    } catch {
      // Non-critical — fallback to raw UUID display handled in component
    } finally {
      setLoading(false)
    }
  }, [accessToken, dedupedIds.join(','), graphqlClient])

  useEffect(() => {
    void fetch()
  }, [fetch])

  return { summaries, loading }
}
