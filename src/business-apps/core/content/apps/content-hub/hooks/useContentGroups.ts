import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_CONTENT_GROUPS_QUERY } from '../queries/ContentQueries'

export interface SelectOption {
  id: string
  name: string
}

interface ContentGroupsData {
  ArticleGroup: { id: string; name: string }[]
}

export interface UseContentGroupsResult {
  groupValues: SelectOption[]
  isLoading: boolean
  error: any
  refetch: () => void
}

export const useContentGroups = (accessToken?: string): UseContentGroupsResult => {
  const [groupValues, setGroupValues] = useState<SelectOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<any>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchGroups = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await graphqlClient.request<ContentGroupsData>(GET_CONTENT_GROUPS_QUERY)

      const groups = result?.ArticleGroup || []
      const formattedGroups = groups.map(group => ({
        id: group.id,
        name: group.name
      }))

      setGroupValues(formattedGroups)
    } catch (err) {
      setError(err)
      setGroupValues([])
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  return {
    groupValues,
    isLoading,
    error,
    refetch: fetchGroups
  }
}
