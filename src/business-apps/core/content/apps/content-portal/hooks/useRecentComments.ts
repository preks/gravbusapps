import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ContentRole } from '@/common/data/content/types/contentEnums'

export interface ArticleComment {
  id: string
  content: string | null
  createdAt: string
  creatorEmployee: {
    id: string
    displayName: string | null
    firstName: string | null
    lastName: string | null
    pictureThumbnail: string | null
  } | null
}

interface UseArticleCommentsResult {
  comments: ArticleComment[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface UseArticleCommentsParams {
  accessToken?: string
  articleId?: string | null
  limit?: number
}

/**
 * Hook to fetch comments for a specific article
 * Fetches COMMENT role entries for the given root article ID
 */
export const useArticleComments = ({
  accessToken,
  articleId,
  limit = 10
}: UseArticleCommentsParams): UseArticleCommentsResult => {
  const [comments, setComments] = useState<ArticleComment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchComments = useCallback(async () => {
    if (!articleId) {
      setComments([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = `
        query getArticleComments($articleId: uuid!, $limit: Int!) {
          ContentEntry(
            where: {
              role: { _eq: "${ContentRole.COMMENT}" }
              rootContentEntryId: { _eq: $articleId }
              isDeleted: { _eq: false }
              content: { _isNull: false }
            }
            orderBy: { createdAt: DESC }
            limit: $limit
          ) {
            id
            content
            createdAt
            creatorEmployee {
              id
              displayName
              firstName
              lastName
              pictureThumbnail
            }
          }
        }
      `

      const response = await graphqlClient.request<{ ContentEntry: ArticleComment[] }>(query, {
        articleId,
        limit
      })

      setComments(response.ContentEntry || [])
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch article comments')
      setError(errorObj)
      console.error('Error fetching article comments:', err)
    } finally {
      setIsLoading(false)
    }
  }, [graphqlClient, articleId, limit])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  return {
    comments,
    isLoading,
    error,
    refetch: fetchComments
  }
}
