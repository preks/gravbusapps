import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface ReactionSummary {
  [emoji: string]: {
    emoji: string
    count: number
    userReacted: boolean
    reactionId?: string
    catalogEntryId?: string // Catalog entry ID for the reaction
    imageUrl?: string
    version?: number // Version from the database
  }
}

export interface UserContentReactionsProps {
  contentEntryIds: string[]
  currentUserId?: string
  accessToken: string
}

/**
 * Batch query for multiple content entry reactions
 */
const buildBatchReactionsQuery = (contentEntryIds: string[]): string => {
  if (contentEntryIds.length === 0) {
    return `query { ContentEntryReaction(where: { id: { _eq: "none" } }) { id } }`
  }

  return `
    query getBatchContentEntryReactions {
      ContentEntryReaction(
        where: {
          contentEntryId: { _in: [${contentEntryIds.map(id => `"${id}"`).join(', ')}] }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: DESC }
      ) {
        id
        version
        contentEntryId
        createdBy
        contentReactionRef
        createdAt
        contentReaction {
          id
          code
          value
          description
          type
          additionalValue1
          additionalValue2
          additionalValue3
        }
      }
    }
  `
}

/**
 * Hook to batch-fetch reactions for multiple content entries
 * Returns a map of contentEntryId -> ReactionSummary
 */
export const useUserContentReactions = ({ contentEntryIds, currentUserId, accessToken }: UserContentReactionsProps) => {
  const [reactionsByArticle, setReactionsByArticle] = useState<Record<string, ReactionSummary>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(accessToken)

  const fetchReactions = useCallback(async () => {
    if (contentEntryIds.length === 0) {
      setReactionsByArticle({})
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = buildBatchReactionsQuery(contentEntryIds)
      const result = await graphqlClient.request<{ ContentEntryReaction: any[] }>(query)
      const reactionsData = result.ContentEntryReaction || []

      // Group reactions by contentEntryId
      const reactionsByContent: Record<string, ReactionSummary> = {}

      // Initialize empty summaries for all articles
      contentEntryIds.forEach(id => {
        reactionsByContent[id] = {}
      })

      // Build reaction summaries
      reactionsData.forEach(reaction => {
        const contentId = reaction.contentEntryId
        const catalogReaction = reaction.contentReaction

        // Skip reactions without a valid catalog entry (e.g., deleted reactions)
        if (!catalogReaction?.description) {
          return
        }

        const emoji = catalogReaction.description
        const reactionType = catalogReaction?.type
        const catalogEntryId = catalogReaction?.id
        const imageUrl = reactionType === 'CUSTOM' ? catalogReaction?.additionalValue3 : undefined

        const createdByUserId = reaction.createdBy

        if (!reactionsByContent[contentId]) {
          reactionsByContent[contentId] = {}
        }

        if (!reactionsByContent[contentId][emoji]) {
          reactionsByContent[contentId][emoji] = {
            emoji,
            count: 0,
            userReacted: false,
            catalogEntryId,
            imageUrl
          }
        }

        reactionsByContent[contentId][emoji].count += 1

        // Check if current user reacted (compare User IDs!)
        if (currentUserId && createdByUserId === currentUserId) {
          reactionsByContent[contentId][emoji].userReacted = true
          reactionsByContent[contentId][emoji].reactionId = reaction.id
          reactionsByContent[contentId][emoji].version = reaction.version
        }
      })

      setReactionsByArticle(reactionsByContent)
    } catch (err) {
      console.error('Error fetching batch reactions:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch reactions')
    } finally {
      setIsLoading(false)
    }
  }, [contentEntryIds.join(','), currentUserId, accessToken, graphqlClient])

  useEffect(() => {
    if (accessToken && contentEntryIds.length > 0) {
      fetchReactions()
    }
  }, [accessToken, fetchReactions])

  return {
    reactionsByArticle,
    isLoading,
    error,
    refetch: fetchReactions
  }
}
