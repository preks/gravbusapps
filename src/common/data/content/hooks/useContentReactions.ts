/**
 * useContentReactions Hook
 * Fetch and aggregate reactions for content entries
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql-mock/useGraphQLClient'
import { buildContentReactionsQuery } from '../queries/contentQueries'
import { mapBaseToContentEntryReaction, aggregateReactions } from '../mappers/contentMappers'
import type { ContentEntryReaction, ContentReactionQueryParams, ReactionAggregation } from '../types/contentTypes'
import type { BaseContentEntryReaction } from '../types/contentBaseTypes'

interface UseContentReactionsResult {
  reactions: ContentEntryReaction[]
  aggregated: ReactionAggregation[]
  isLoading: boolean
  error: Error | null
  totalCount: number
  refetch: () => Promise<void>
}

interface ContentReactionsResponse {
  ContentEntryReaction: BaseContentEntryReaction[]
  ContentEntryReactionAggregate?: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch content reactions with optional aggregation
 */
export const useContentReactions = (
  params: ContentReactionQueryParams,
  accessToken?: string
): UseContentReactionsResult => {
  const [reactions, setReactions] = useState<ContentEntryReaction[]>([])
  const [aggregated, setAggregated] = useState<ReactionAggregation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalCount, setTotalCount] = useState(0)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchReactions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const query = buildContentReactionsQuery(params)
      const response = await graphqlClient.request<ContentReactionsResponse>(query)

      if (response.ContentEntryReaction) {
        const mappedReactions = response.ContentEntryReaction.map(mapBaseToContentEntryReaction)
        setReactions(mappedReactions)

        // Aggregate reactions by emoji type
        const aggregatedReactions = aggregateReactions(response.ContentEntryReaction)
        setAggregated(aggregatedReactions)

        setTotalCount(response.ContentEntryReactionAggregate?.aggregate?.count || mappedReactions.length)
      } else {
        setReactions([])
        setAggregated([])
        setTotalCount(0)
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch content reactions')
      setError(errorObj)
      console.error('Error fetching content reactions:', err)
    } finally {
      setIsLoading(false)
    }
  }, [params, accessToken])

  useEffect(() => {
    fetchReactions()
  }, [fetchReactions])

  return {
    reactions,
    aggregated,
    isLoading,
    error,
    totalCount,
    refetch: fetchReactions
  }
}
