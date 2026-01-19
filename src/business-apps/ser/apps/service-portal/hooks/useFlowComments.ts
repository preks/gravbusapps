import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import type { WorkflowEngine, FlowComment } from '../../types';
import { 
  FlowCommentsResponse,
  ServicePortalComment,
  ServicePortalCommentVisibility
} from '../types/comments';

/**
 * Hook for fetching comments using WorkflowEngine adapter
 */
export const useFlowComments = (
  flowId: string,
  contextProps: BusinessAppContextProps,
  workflowEngine: WorkflowEngine
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
   * Fetch comments for the flow using WorkflowEngine adapter
   */
  const fetchComments = useCallback(async (requesterId?: string): Promise<void> => {
    if (!flowId || !workflowEngine) return;

    setIsLoading(true);
    setError(null);

    try {
      // Use WorkflowEngine adapter to get flow comments
      const flowComments = await workflowEngine.getFlowComments(flowId);
      
      // Convert flow comments to service portal format
      const convertedComments = flowComments.map((comment: FlowComment) => 
        convertFlowComment(comment, requesterId)
      );

      setComments(convertedComments);
      setTotalComments(flowComments.length);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch comments';
      console.error('[useFlowComments] Error fetching comments:', err);
      setError(errorMessage);
      setComments([]);
      setTotalComments(0);
    } finally {
      setIsLoading(false);
    }
  }, [flowId, workflowEngine]);

  /**
   * Post a new comment to the flow using WorkflowEngine adapter
   */
  const postComment = useCallback(async (
    comment: string, 
    visibility: ServicePortalCommentVisibility,
    stepIndex?: number
  ): Promise<void> => {
    if (!workflowEngine) {
      throw new Error('WorkflowEngine not available');
    }

    try {
      // Use WorkflowEngine adapter to post flow comment
      // Check if the adapter has a postFlowComment method, otherwise fall back to comment method
      if ('postFlowComment' in workflowEngine && typeof workflowEngine.postFlowComment === 'function') {
        await (workflowEngine as any).postFlowComment(flowId, contextProps.userInfo?.id || 'anonymous', comment, visibility, stepIndex);
      } else {
        // Fallback to generic comment method (treating flowId as stepId)
        await workflowEngine.comment(flowId, contextProps.userInfo?.id || 'anonymous', comment, visibility);
      }
      
      // Refresh comments to show the new one
      await fetchComments();
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to post comment';
      console.error('[useFlowComments] Error posting comment:', err);
      throw new Error(errorMessage);
    }
  }, [flowId, workflowEngine, contextProps.userInfo?.id, fetchComments]);

  /**
   * Refresh comments (alias for fetchComments)
   */
  const refreshComments = useCallback(async (requesterId?: string): Promise<void> => {
    await fetchComments(requesterId);
  }, [fetchComments]);

  // Auto-fetch comments when hook is initialized
  useEffect(() => {
    if (flowId && workflowEngine) {
      fetchComments();
    }
  }, [flowId, workflowEngine, fetchComments]);

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
