import { useState } from 'react';
import type { Comment } from 'packages/services-plus-core';
import { getWorkflowEngine } from '../../../services/workflowEngineProvider';

export interface UseTicketActionsProps {
  accessToken: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

export interface UseTicketActionsReturn {
  claimTicket: (stepId: string) => Promise<void>;
  assignTicket: (stepId: string, userId: string) => Promise<void>;
  advanceTicket: (stepId: string, payload?: any) => Promise<void>;
  addComment: (stepId: string, body: string) => Promise<Comment>;
  isPerformingAction: boolean;
}

/**
 * Hook to handle ticket actions (claim, assign, advance, comment)
 * Integrates with WorkflowEngine action methods
 */
export const useTicketActions = ({
  accessToken,
  onSuccess,
  onError,
}: UseTicketActionsProps): UseTicketActionsReturn => {
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);

  const handleAction = async <T>(
    actionName: string,
    actionFn: () => Promise<T>
  ): Promise<T> => {
    try {
      setIsPerformingAction(true);
      const result = await actionFn();
      onSuccess?.();
      return result;
    } catch (err) {
      console.error(`Error performing ${actionName}:`, err);
      const errorMessage = err instanceof Error ? err.message : `Failed to ${actionName}`;
      onError?.(errorMessage);
      throw err;
    } finally {
      setIsPerformingAction(false);
    }
  };

  const claimTicket = async (stepId: string): Promise<void> => {
    return handleAction('claim ticket', async () => {
      const workflowEngine = getWorkflowEngine();
      await workflowEngine.claim(stepId);
    });
  };

  const assignTicket = async (stepId: string, userId: string): Promise<void> => {
    return handleAction('assign ticket', async () => {
      const workflowEngine = getWorkflowEngine();
      await workflowEngine.assign(stepId, userId);
    });
  };

  const advanceTicket = async (stepId: string, payload?: any): Promise<void> => {
    return handleAction('advance ticket', async () => {
      const workflowEngine = getWorkflowEngine();
      await workflowEngine.advance(stepId, payload);
    });
  };

  const addComment = async (stepId: string, body: string): Promise<Comment> => {
    return handleAction('add comment', async () => {
      const workflowEngine = getWorkflowEngine();
      return await workflowEngine.comment(stepId, body);
    });
  };

  return {
    claimTicket,
    assignTicket,
    advanceTicket,
    addComment,
    isPerformingAction,
  };
};
