import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ALL_CONTENTS_QUERY, QueryVariables } from '../queries/ContentQueries'
import { Content } from '../types/content.types'

export interface ContentsDataQueryVariables {
  offset: number
  articleGroupRef?: string
  limit: number
  search?: string
  sorter?: {
    field: string
    order: 'ascend' | 'descend'
  }
  tags?: string[]
  articleTypeRef?: string
  articleId?: string
}

export interface ContentsData {
  ArticleEmployeeView: Content[]
  ArticleEmployeeViewAggregate: {
    aggregate: {
      count: number
    }
  }
}

export interface UseContentsResult {
  data: Content[]
  totalCount: number
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useContents = (variables: ContentsDataQueryVariables, accessToken?: string): UseContentsResult => {
  const [data, setData] = useState<Content[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchContents = useCallback(async () => {
    if (!accessToken) {
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_ALL_CONTENTS_QUERY(variables as QueryVariables)
      const result = await graphqlClient.request<ContentsData>(query)

      setData(result?.ArticleEmployeeView || [])
      setTotalCount(result?.ArticleEmployeeViewAggregate?.aggregate?.count || 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch contents')
      setData([])
      setTotalCount(0)
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, graphqlClient, JSON.stringify(variables)])

  useEffect(() => {
    fetchContents()
  }, [fetchContents])

  return {
    data,
    totalCount,
    isLoading,
    error,
    refetch: fetchContents
  }
}
