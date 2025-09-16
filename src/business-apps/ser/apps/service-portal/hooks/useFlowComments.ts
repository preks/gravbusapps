import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { 
  FlowComment,
  FlowCommentsResponse,
  ServicePortalComment,
  ServicePortalCommentVisibility
} from '../types/comments';

/**
 * Hook for fetching comments from /api/flows/{flowId}/comments endpoint
 */
export const useFlowComments = (
  flowId: string,
  contextProps: BusinessAppContextProps
) => {
  const [comments, setComments] = useState<ServicePortalComment[]>([]);
  const [totalComments, setTotalComments] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Convert FlowComment to ServicePortalComment format
   */
  const convertFlowComment = (flowComment: FlowComment, requesterId?: string): ServicePortalComment => {
    return {
      id: `${flowComment.stepIndex}-${flowComment.commentedAt}`, // Generate unique ID
      stepId: flowComment.stepIndex.toString(),
      authorId: flowComment.commentedBy,
      createdAt: flowComment.commentedAt,
      body: flowComment.comment,
      visibility: flowComment.visibility,
      action: flowComment.action,
      stepName: flowComment.stepTitle,
      stepIndex: flowComment.stepIndex,
      isFromRequester: flowComment.commentedBy === requesterId,
      isFromAssignee: false // We don't have assignment info in this response
    };
  };

  /**
   * Fetch comments for the flow
   */
  const fetchComments = useCallback(async (requesterId?: string): Promise<void> => {
    if (!flowId) return;

    setIsLoading(true);
    setError(null);

    try {
      
      const response = await fetch(`http://localhost:3000/api/flows/${flowId}/comments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${contextProps.accessToken}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch comments: ${response.statusText}`);
      }

      const data: FlowCommentsResponse = await response.json();
      
      // Convert flow comments to service portal format
      const convertedComments = data.comments.map(comment => 
        convertFlowComment(comment, requesterId)
      );

      setComments(convertedComments);
      setTotalComments(data.totalComments);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch comments';
      console.error('[useFlowComments] Error fetching comments:', err);
      setError(errorMessage);
      setComments([]);
      setTotalComments(0);
    } finally {
      setIsLoading(false);
    }
  }, [flowId, contextProps.accessToken]);

  /**
   * Post a new comment to the flow
   */
  const postComment = useCallback(async (
    comment: string, 
    visibility: ServicePortalCommentVisibility,
    stepIndex?: number
  ): Promise<void> => {

    try {
      const response = await fetch(`http://localhost:3000/api/flows/${flowId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${contextProps.accessToken}`
        },
        body: JSON.stringify({
          comment,
          visibility,
          stepIndex,
          userId: contextProps.userInfo?.id || 'anonymous'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to post comment: ${response.statusText}`);
      }

      
      // Refresh comments to show the new one
      await fetchComments();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to post comment';
      console.error('[useFlowComments] Error posting comment:', err);
      throw new Error(errorMessage);
    }
  }, [flowId, contextProps.accessToken, contextProps.userInfo?.id, fetchComments]);

  /**
   * Refresh comments (alias for fetchComments)
   */
  const refreshComments = useCallback(async (requesterId?: string): Promise<void> => {
    await fetchComments(requesterId);
  }, [fetchComments]);

  // Auto-fetch comments when hook is initialized
  useEffect(() => {
    if (flowId) {
      fetchComments();
    }
  }, [flowId, fetchComments]);

  return {
    comments,
    totalComments,
    isLoading,
    error,
    fetchComments,
    postComment,
    refreshComments
  };
};
