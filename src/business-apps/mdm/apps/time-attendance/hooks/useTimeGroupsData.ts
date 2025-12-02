import { useState, useCallback, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// GraphQL Query
const GET_TIME_GROUPS_QUERY = `
  query GetTimeGroups {
    TimeGroup {
      id
      name
      code
    }
  }
`

export interface TimeGroup {
  id: string
  name: string
  code: string
}

export interface TimeGroupResponse {
  TimeGroup: TimeGroup[]
}

// Hook interface
export interface UseTimeGroupsDataReturn {
  timeGroups: TimeGroup[]
  loading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

export const useTimeGroupsData = (context: BusinessAppContextProps): UseTimeGroupsDataReturn => {
  const [timeGroups, setTimeGroups] = useState<TimeGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(context.accessToken)

  const fetchTimeGroupsData = useCallback(async () => {
    if (!context.accessToken) {
      setError(new Error('Access token is required'))
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<TimeGroupResponse>(GET_TIME_GROUPS_QUERY, {})
      setTimeGroups(result.TimeGroup || [])
    } catch (err) {
      console.error('Error fetching time groups:', err)
      setError(err instanceof Error ? err : new Error('Failed to fetch time groups'))
    } finally {
      setLoading(false)
    }
  }, [context.accessToken, graphqlClient])

  const refetch = useCallback(async () => {
    await fetchTimeGroupsData()
  }, [fetchTimeGroupsData])

  // Initial fetch
  useEffect(() => {
    fetchTimeGroupsData()
  }, [fetchTimeGroupsData])

  return { timeGroups, loading, error, refetch }
}
