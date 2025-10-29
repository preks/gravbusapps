import { useState, useEffect, useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ARTICLE_LIKES_QUERY, ArticleLikesResponse, ArticleLikeData } from '../queries/ContentInteractionQueries'

export interface UserLike {
  id: string
  version: number
  liked: boolean
}

export interface UseArticleLikesResult {
  likes: ArticleLikeData[]
  userLike: UserLike | null
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useArticleLikes = (
  articleId: string | undefined,
  userId: string | undefined,
  accessToken: string | undefined
): UseArticleLikesResult => {
  const [likes, setLikes] = useState<ArticleLikeData[]>([])
  const [userLike, setUserLike] = useState<UserLike | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchLikes = useCallback(async () => {
    if (!articleId || !accessToken) {
      setIsLoading(false)
      setLikes([])
      setUserLike(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_ARTICLE_LIKES_QUERY(articleId)
      const result = await graphqlClient.request<ArticleLikesResponse>(query)

      const likesData = result?.ArticleLike || []
      setLikes(likesData)

      // Find current user's like
      if (userId) {
        const currentUserLike = likesData.find(like => like.createdBy === userId)
        if (currentUserLike) {
          setUserLike({
            id: currentUserLike.id,
            version: currentUserLike.version,
            liked: currentUserLike.liked
          })
        } else {
          setUserLike(null)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch likes')
      setLikes([])
      setUserLike(null)
    } finally {
      setIsLoading(false)
    }
  }, [articleId, userId, accessToken, graphqlClient])

  useEffect(() => {
    fetchLikes()
  }, [fetchLikes])

  return {
    likes,
    userLike,
    isLoading,
    error,
    refetch: fetchLikes
  }
}
