/**
 * useContentComments Hook
 * Fetch comments (ContentEntry with role = COMMENT) for a content entry
 */
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { ContentRole } from '../constants/contentConstants'
import type { ContentEntry } from '../types/contentEntryTypes'
import {
  CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT,
  CONTENT_ENTRY_REACTION_FRAGMENT,
  DESCENDANT_COMMENT_COUNT_FRAGMENT
} from '../queries/fragments/contentFragments'

export interface CommentWithReplies extends ContentEntry {
  replies: CommentWithReplies[]
}

export interface UseContentCommentsResult {
  comments: CommentWithReplies[]
  allComments: ContentEntry[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Build query for content comments
 * Fetches ALL comments for a root content entry (article)
 */
const buildContentCommentsQuery = (contentEntryId: string): string => {
  return `
    query getContentComments {
      ContentEntry(
        where: {
          rootContentEntryId: { _eq: "${contentEntryId}" }
          role: { _eq: "${ContentRole.COMMENT}" }
          isDeleted: { _eq: false }
        }
        orderBy: { createdAt: DESC }
      ) {
        ${CONTENT_ENTRY_WITH_CATALOGS_FRAGMENT}
        contentEntryReactions {
          ${CONTENT_ENTRY_REACTION_FRAGMENT}
        }
        ${DESCENDANT_COMMENT_COUNT_FRAGMENT}
      }
      ContentEntryAggregate(
        where: {
          rootContentEntryId: { _eq: "${contentEntryId}" }
          role: { _eq: "${ContentRole.COMMENT}" }
          isDeleted: { _eq: false }
        }
      ) {
        aggregate {
          count
        }
      }
    }
  `
}

interface ContentCommentsResponse {
  ContentEntry: ContentEntry[]
  ContentEntryAggregate: {
    aggregate: {
      count: number
    }
  }
}

/**
 * Hook to fetch comments for a content entry
 */
export const useContentComments = (
  contentEntryId: string | undefined,
  accessToken: string | undefined
): UseContentCommentsResult => {
  const [allComments, setAllComments] = useState<ContentEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const graphqlClient = useGraphQLClient(accessToken)

  const fetchComments = useCallback(async () => {
    if (!contentEntryId || !accessToken) {
      setIsLoading(false)
      setAllComments([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const query = buildContentCommentsQuery(contentEntryId)
      const result = await graphqlClient.request<ContentCommentsResponse>(query)

      setAllComments(result?.ContentEntry || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch comments')
      setAllComments([])
    } finally {
      setIsLoading(false)
    }
  }, [contentEntryId, accessToken, graphqlClient])

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
      commentMap.set(comment.id, { ...comment, replies: [] } as CommentWithReplies)
    })

    // Second pass: build tree structure
    allComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)
      if (!commentWithReplies) return

      if (!comment.parentContentEntryId || comment.parentContentEntryId === contentEntryId) {
        // Top-level comment (direct child of the content entry)
        rootComments.push(commentWithReplies)
      } else {
        // Reply to another comment
        const parentComment = commentMap.get(comment.parentContentEntryId)
        if (parentComment) {
          parentComment.replies.push(commentWithReplies)
        }
      }
    })

    return rootComments
  }, [allComments, contentEntryId])

  const refetch = useCallback(async () => {
    await fetchComments()
  }, [fetchComments])

  return {
    comments,
    allComments,
    isLoading,
    error,
    refetch
  }
}
