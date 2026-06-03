/**
 * useContentReactions Hook
 * Fetch and aggregate reactions for content entries
 */
import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { buildContentReactionsQuery, buildContentReactionsVariables } from '../queries/contentQueries'
import type { ContentEntryReaction, ReactionAggregation } from '../types/contentEntryTypes'
import type { ContentReactionQueryParams } from '../queries/contentQueries'

interface UseContentReactionsResult {
  reactions: ContentEntryReaction[]
  aggregated: ReactionAggregation[]
  isLoading: boolean
  error: Error | null
  totalCount: number
  refetch: () => Promise<void>
}

interface ContentReactionsResponse {
  ContentEntryReaction: ContentEntryReaction[]
  ContentEntryReactionAggregate?: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Aggregate reactions by emoji type
 */
function aggregateReactions(reactions: ContentEntryReaction[]): ReactionAggregation[] {
  const reactionMap = new Map<string, ReactionAggregation>()

  reactions.forEach(reaction => {
    const reactionRef = reaction.contentReactionRef || 'unknown'
    const existing = reactionMap.get(reactionRef)

    if (existing && reaction.creatorEmployee) {
      existing.count++
      existing.employees.push(reaction.creatorEmployee)
    } else if (reaction.creatorEmployee) {
      reactionMap.set(reactionRef, {
        reactionRef,
        reactionName: reaction.contentReaction?.value || 'Unknown',
        reactionEmoji: reaction.contentReaction?.value,
        count: 1,
        employees: [reaction.creatorEmployee]
      })
    }
  })

  return Array.from(reactionMap.values()).sort((a, b) => b.count - a.count)
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
      const variables = buildContentReactionsVariables(params)
      const response = await graphqlClient.request<ContentReactionsResponse>(query, variables)

      if (response.ContentEntryReaction) {
        setReactions(response.ContentEntryReaction)

        // Aggregate reactions by emoji type
        const aggregatedReactions = aggregateReactions(response.ContentEntryReaction)
        setAggregated(aggregatedReactions)

        setTotalCount(response.ContentEntryReactionAggregate?.aggregate?.count || response.ContentEntryReaction.length)
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
  }, [params, graphqlClient])

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
