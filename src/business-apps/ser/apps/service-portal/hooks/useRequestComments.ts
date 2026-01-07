import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  ServicePortalComment,
  ServicePortalCommentVisibility,
  RequestCommentContext,
  PostCommentRequest,
  CommentResponse
} from '../types/comments'
import { SubmittedRequest } from '../../../types'

/**
 * Hook for managing request comments in service-portal
 * Handles fetching, posting, and managing comment state
 */
export const useRequestComments = (request: SubmittedRequest, contextProps: BusinessAppContextProps) => {
  const [comments, setComments] = useState<ServicePortalComment[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Determine user's role and context for this request
  const commentContext: RequestCommentContext = {
    requestId: request.id,
    userId: contextProps.userInfo?.id || 'anonymous',
    userRole: determineUserRole(request, contextProps.userInfo?.id || 'anonymous'),
    isRequester: request.requesterId === (contextProps.userInfo?.id || 'anonymous'),
    isAssignedToAnyStep: request.steps.some(
      step =>
        step.assignedToUserId === (contextProps.userInfo?.id || 'anonymous') ||
        step.claimedByUserId === (contextProps.userInfo?.id || 'anonymous')
    ),
    canPostComments: true, // All users can post comments (visibility will be filtered)
    defaultVisibility: getDefaultVisibility(request, contextProps.userInfo?.id || 'anonymous')
  }

  /**
   * Fetch comments for the request from all workflow steps
   */
  const fetchComments = useCallback(async (): Promise<void> => {
    setIsLoading(true)
    setError(null)

    try {
      console.log(`[useRequestComments] Fetching comments for request: ${request.id}`)

      // Get comments from all steps in the request workflow
      const allComments: ServicePortalComment[] = []

      // Extract comments from each step and aggregate them
      for (const step of request.steps) {
        if (step.comments && step.comments.length > 0) {
          const stepComments = step.comments.map(comment => ({
            ...comment,
            stepName: step.name,
            desk: step.desk,
            isFromRequester: comment.authorId === request.requesterId,
            isFromAssignee: comment.authorId === step.assignedToUserId || comment.authorId === step.claimedByUserId,
            visibility: comment.visibility as ServicePortalCommentVisibility
          }))

          allComments.push(...stepComments)
        }
      }

      // Sort by creation date (newest first)
      allComments.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

      console.log(`[useRequestComments] Found ${allComments.length} comments for request ${request.id}`)
      setComments(allComments)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch comments'
      console.error('[useRequestComments] Error fetching comments:', err)
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }, [request.id, request.steps, request.requesterId])

  /**
   * Post a new comment to the request
   */
  const postComment = useCallback(
    async (commentRequest: PostCommentRequest): Promise<void> => {
      console.log(`[useRequestComments] Posting comment to request: ${commentRequest.requestId}`, {
        visibility: commentRequest.visibility,
        commentLength: commentRequest.comment.length
      })

      try {
        // For now, we'll use the existing workflow engine to post comments
        // This will need to be updated when we have a dedicated service-portal API

        // Find the most recent active step to post the comment to
        // Note: StepStatus uses uppercase values (IN_PROGRESS, READY, etc.)
        const activeStep =
          request.steps.find(
            step => step.status === 'IN_PROGRESS' || step.status === 'READY' || step.status === 'RUNNING'
          ) || request.steps[request.steps.length - 1] // Fallback to last step

        if (!activeStep) {
          throw new Error('No active step found to post comment to')
        }

        // Use the existing comment posting mechanism from TaskRecord
        // This is a temporary solution until we have proper service-portal API
        const response = await fetch(`/api/requests/${request.id}/comments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${contextProps.accessToken}`
          },
          body: JSON.stringify({
            stepId: activeStep.id,
            userId: commentRequest.userId,
            comment: commentRequest.comment,
            commentVisibility: commentRequest.visibility
          })
        })

        if (!response.ok) {
          throw new Error(`Failed to post comment: ${response.statusText}`)
        }

        const result: CommentResponse = await response.json()

        if (!result.success) {
          throw new Error(result.error || 'Failed to post comment')
        }

        console.log(`[useRequestComments] Comment posted successfully to request ${commentRequest.requestId}`)

        // Refresh comments to show the new one
        await fetchComments()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to post comment'
        console.error('[useRequestComments] Error posting comment:', err)
        throw new Error(errorMessage)
      }
    },
    [request.id, request.steps, contextProps.accessToken, fetchComments]
  )

  /**
   * Refresh comments (alias for fetchComments for better UX)
   */
  const refreshComments = useCallback(async (): Promise<void> => {
    await fetchComments()
  }, [fetchComments])

  // Load comments when request changes
  useEffect(() => {
    fetchComments()
  }, [fetchComments])

  return {
    comments,
    commentContext,
    isLoading,
    error,
    fetchComments,
    postComment,
    refreshComments
  }
}

/**
 * Determine user's role in the context of this request
 */
function determineUserRole(request: SubmittedRequest, userId: string): RequestCommentContext['userRole'] {
  // Check if user is the original requester
  if (request.requesterId === userId) {
    return 'requester'
  }

  // Check if user is assigned to any step
  const isAssigned = request.steps.some(step => step.assignedToUserId === userId || step.claimedByUserId === userId)

  if (isAssigned) {
    return 'assignee'
  }

  // For now, treat all other users as staff
  // In the future, we might want to check actual user roles/permissions
  return 'staff'
}

/**
 * Get default comment visibility based on user's role
 */
function getDefaultVisibility(request: SubmittedRequest, userId: string): ServicePortalCommentVisibility {
  const userRole = determineUserRole(request, userId)

  switch (userRole) {
    case 'requester':
      return 'EXTERNAL' // Requesters can only post public comments
    case 'assignee':
    case 'staff':
      return 'EXTERNAL' // Default to public for better communication
    default:
      return 'EXTERNAL'
  }
}
