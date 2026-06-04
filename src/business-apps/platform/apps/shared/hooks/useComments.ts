/**
 * useComments Hook
 *
 * Reusable hook for comment management across Documents, Notes, and Spreadsheets.
 * Provides functionality for document-level and inline comments, threading, and real-time updates.
 *
 * NOTE: This requires backend comments API to be implemented first.
 */

import { useState, useCallback, useEffect } from 'react'
import type { Socket } from 'socket.io-client'
import type { Comment, CommentQueryOptions, CreateCommentInput } from '../types/versioning'

export interface UseCommentsOptions {
  entityId: string
  entityType: 'document' | 'note' | 'slide' | 'spreadsheet_app' | 'whiteboard'
  socket?: Socket | null
  apiService?: {
    createComment: (id: string, comment: CreateCommentInput) => Promise<Comment | null>
    listComments: (id: string, options?: CommentQueryOptions) => Promise<Comment[]>
    updateComment: (commentId: string, updates: Partial<Comment>) => Promise<Comment | null>
    resolveComment: (commentId: string) => Promise<boolean>
    unresolveComment: (commentId: string) => Promise<boolean>
    deleteComment: (commentId: string) => Promise<boolean>
    replyToComment: (
      commentId: string,
      reply: string,
      userName?: string,
      userAvatar?: string
    ) => Promise<Comment | null>
  }
  autoRefreshInterval?: number // ms, default 0 (disabled - use WebSocket events instead)
  onCommentCreated?: (comment: Comment) => void
  onCommentResolved?: (comment: Comment) => void
  onError?: (error: Error) => void
  /** Translation function for user-facing error messages */
  t?: (key: string, vars?: Record<string, string | number>) => string
}

export interface UseCommentsState {
  comments: Comment[]
  unresolvedCount: number
  isLoading: boolean
  error: string | null
}

export interface UseCommentsActions {
  loadComments: (options?: CommentQueryOptions) => Promise<void>
  createComment: (input: CreateCommentInput) => Promise<Comment | null>
  updateComment: (commentId: string, updates: Partial<Comment>) => Promise<Comment | null>
  resolveComment: (commentId: string) => Promise<boolean>
  unresolveComment: (commentId: string) => Promise<boolean>
  deleteComment: (commentId: string) => Promise<boolean>
  replyToComment: (commentId: string, reply: string, userName?: string, userAvatar?: string) => Promise<Comment | null>
  clearError: () => void
}

export interface UseCommentsReturn extends UseCommentsState, UseCommentsActions {}

function flattenCommentThreads(comments: Comment[]): Comment[] {
  const commentsById = new Map<string, Comment>()

  comments.forEach(comment => {
    commentsById.set(comment.id, comment)

    comment.replies?.forEach(reply => {
      commentsById.set(reply.id, {
        ...reply,
        parentId: reply.parentId ?? comment.id
      })
    })
  })

  return Array.from(commentsById.values())
}

const allCommentsQueryOptions: CommentQueryOptions = {
  includeResolved: true,
  includeReplies: true
}

/**
 * Hook for managing comments
 *
 * TODO: Implement once backend comments API is ready
 */
export function useComments(options: UseCommentsOptions): UseCommentsReturn {
  const {
    entityId,
    socket,
    apiService,
    autoRefreshInterval = 0, // Disabled by default - use WebSocket events
    onCommentCreated,
    onCommentResolved,
    onError,
    t
  } = options

  // State
  const [state, setState] = useState<UseCommentsState>({
    comments: [],
    unresolvedCount: 0,
    isLoading: false,
    error: null
  })

  /**
   * Load comments
   */
  const loadComments = useCallback(
    async (queryOptions?: CommentQueryOptions) => {
      if (!apiService) {
        console.warn('[useComments] Backend API not yet implemented')
        return
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }))

      try {
        const comments = flattenCommentThreads(await apiService.listComments(entityId, queryOptions))
        const unresolvedCount = comments.filter(c => !c.resolvedAt && !c.parentId).length

        setState(prev => ({
          ...prev,
          comments,
          unresolvedCount,
          isLoading: false
        }))
      } catch (error) {
        const errorMessage = t
          ? t('shared-error-load-comments')
          : error instanceof Error
            ? error.message
            : String(error)
        setState(prev => ({
          ...prev,
          error: errorMessage,
          isLoading: false
        }))

        if (onError) {
          onError(error instanceof Error ? error : new Error(errorMessage))
        }
      }
    },
    [entityId, apiService, onError, t]
  )

  const reloadComments = useCallback(async () => {
    await loadComments(allCommentsQueryOptions)
  }, [loadComments])

  /**
   * Create a new comment
   */
  const createComment = useCallback(
    async (input: CreateCommentInput): Promise<Comment | null> => {
      if (!apiService) {
        console.warn('[useComments] Backend API not yet implemented')
        return null
      }

      try {
        const comment = await apiService.createComment(entityId, input)

        if (comment) {
          setState(prev => ({
            ...prev,
            comments: [...prev.comments, comment],
            unresolvedCount: comment.parentId ? prev.unresolvedCount : prev.unresolvedCount + 1
          }))

          if (onCommentCreated) {
            onCommentCreated(comment)
          }
        }

        return comment
      } catch (error) {
        if (onError) {
          onError(
            error instanceof Error
              ? error
              : new Error(t ? t('shared-error-create-comment') : error instanceof Error ? error.message : String(error))
          )
        }
        return null
      }
    },
    [entityId, apiService, onCommentCreated, onError, t]
  )

  /**
   * Update a comment
   */
  const updateComment = useCallback(
    async (commentId: string, updates: Partial<Comment>): Promise<Comment | null> => {
      if (!apiService) {
        console.warn('[useComments] Backend API not yet implemented')
        return null
      }

      try {
        const updated = await apiService.updateComment(commentId, updates)

        if (updated) {
          setState(prev => ({
            ...prev,
            comments: prev.comments.map(c => (c.id === commentId ? updated : c))
          }))
        }

        return updated
      } catch (error) {
        if (onError) {
          onError(
            error instanceof Error
              ? error
              : new Error(t ? t('shared-error-update-comment') : error instanceof Error ? error.message : String(error))
          )
        }
        return null
      }
    },
    [apiService, onError, t]
  )

  /**
   * Resolve a comment
   */
  const resolveComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!apiService) {
        console.warn('[useComments] Backend API not yet implemented')
        return false
      }

      try {
        const success = await apiService.resolveComment(commentId)

        if (success) {
          await reloadComments()

          const comment = state.comments.find(c => c.id === commentId)
          if (comment && onCommentResolved) {
            onCommentResolved(comment)
          }
        }

        return success
      } catch (error) {
        if (onError) {
          onError(
            error instanceof Error
              ? error
              : new Error(
                  t ? t('shared-error-resolve-comment') : error instanceof Error ? error.message : String(error)
                )
          )
        }
        return false
      }
    },
    [apiService, reloadComments, state.comments, onCommentResolved, onError, t]
  )

  /**
   * Unresolve a comment
   */
  const unresolveComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!apiService) {
        console.warn('[useComments] Backend API not yet implemented')
        return false
      }

      try {
        const success = await apiService.unresolveComment(commentId)

        if (success) {
          await reloadComments()
        }

        return success
      } catch (error) {
        if (onError) {
          onError(
            error instanceof Error
              ? error
              : new Error(
                  t ? t('shared-error-unresolve-comment') : error instanceof Error ? error.message : String(error)
                )
          )
        }
        return false
      }
    },
    [apiService, onError, reloadComments, t]
  )

  /**
   * Delete a comment
   */
  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      if (!apiService) {
        console.warn('[useComments] Backend API not yet implemented')
        return false
      }

      try {
        const success = await apiService.deleteComment(commentId)

        if (success) {
          const comment = state.comments.find(c => c.id === commentId)
          setState(prev => ({
            ...prev,
            comments: prev.comments.filter(c => c.id !== commentId && c.parentId !== commentId),
            unresolvedCount:
              comment && !comment.resolvedAt && !comment.parentId ? prev.unresolvedCount - 1 : prev.unresolvedCount
          }))
        }

        return success
      } catch (error) {
        if (onError) {
          onError(
            error instanceof Error
              ? error
              : new Error(t ? t('shared-error-delete-comment') : error instanceof Error ? error.message : String(error))
          )
        }
        return false
      }
    },
    [apiService, state.comments, onError, t]
  )

  /**
   * Reply to a comment
   */
  const replyToComment = useCallback(
    async (commentId: string, reply: string, userName?: string, userAvatar?: string): Promise<Comment | null> => {
      if (!apiService) {
        console.warn('[useComments] Backend API not yet implemented')
        return null
      }

      try {
        const replyComment = await apiService.replyToComment(commentId, reply, userName, userAvatar)

        if (replyComment) {
          await reloadComments()
        }

        return replyComment
      } catch (error) {
        if (onError) {
          onError(
            error instanceof Error
              ? error
              : new Error(t ? t('shared-error-reply-comment') : error instanceof Error ? error.message : String(error))
          )
        }
        return null
      }
    },
    [apiService, onError, reloadComments, t]
  )

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  const refreshComments = useCallback(() => {
    reloadComments().catch(() => undefined)
  }, [reloadComments])

  // Load comments on mount - only if entityId is not empty
  useEffect(() => {
    if (entityId && entityId.trim() !== '' && apiService) {
      refreshComments()
    }
  }, [entityId, apiService, refreshComments])

  useEffect(() => {
    if (!socket || !apiService || !entityId.trim()) {
      return
    }

    socket.on('comment:created', refreshComments)
    socket.on('comment:updated', refreshComments)
    socket.on('comment:resolved', refreshComments)
    socket.on('comment:deleted', refreshComments)

    return () => {
      socket.off('comment:created', refreshComments)
      socket.off('comment:updated', refreshComments)
      socket.off('comment:resolved', refreshComments)
      socket.off('comment:deleted', refreshComments)
    }
  }, [socket, apiService, entityId, refreshComments])

  // Auto-refresh (disabled by default - use WebSocket events for real-time updates)
  useEffect(() => {
    if (!apiService || !autoRefreshInterval || autoRefreshInterval === 0) return

    const interval = setInterval(() => {
      refreshComments()
    }, autoRefreshInterval)

    return () => clearInterval(interval)
  }, [apiService, autoRefreshInterval, refreshComments])

  return {
    // State
    ...state,

    // Actions
    loadComments,
    createComment,
    updateComment,
    resolveComment,
    unresolveComment,
    deleteComment,
    replyToComment,
    clearError
  }
}
