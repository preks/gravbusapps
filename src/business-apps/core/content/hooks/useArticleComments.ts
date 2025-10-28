import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_ARTICLE_COMMENTS_QUERY,
  ArticleCommentsResponse,
  ArticleCommentData
} from '../queries/ContentInteractionQueries'

export interface CommentWithReplies extends ArticleCommentData {
  replies: CommentWithReplies[]
}

export interface UseArticleCommentsResult {
  comments: CommentWithReplies[]
  allComments: ArticleCommentData[]
  isLoading: boolean
  error: string | null
  refetch: () => void
}

export const useArticleComments = (
  articleId: string | undefined,
  accessToken: string | undefined
): UseArticleCommentsResult => {
  const [allComments, setAllComments] = useState<ArticleCommentData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchComments = useCallback(async () => {
    if (!articleId || !accessToken) {
      setIsLoading(false)
      setAllComments([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = GET_ARTICLE_COMMENTS_QUERY(articleId)
      const result = await graphqlClient.request<ArticleCommentsResponse>(query)

      setAllComments(result?.ArticleComment || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments')
      setAllComments([])
    } finally {
      setIsLoading(false)
    }
  }, [articleId, accessToken, graphqlClient])

  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  // Build comment tree structure
  const comments = useMemo(() => {
    if (allComments.length === 0) return []

    // Create a map for quick lookup
    const commentMap = new Map<string, CommentWithReplies>()
    const rootComments: CommentWithReplies[] = []

    // First pass: create all comment objects with empty replies
    allComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] })
    })

    // Second pass: build tree structure
    allComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)
      if (!commentWithReplies) return

      if (comment.articleCommentId === null) {
        // Top-level comment
        rootComments.push(commentWithReplies)
      } else {
        // Reply to another comment
        const parentComment = commentMap.get(comment.articleCommentId)
        if (parentComment) {
          parentComment.replies.push(commentWithReplies)
        }
      }
    })

    return rootComments
  }, [allComments])

  return {
    comments,
    allComments,
    isLoading,
    error,
    refetch: fetchComments
  }
}
