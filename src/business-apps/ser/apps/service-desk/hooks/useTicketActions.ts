import { useState } from 'react';
import type { Comment } from 'packages/services-plus-core';
import { getWorkflowEngine } from '../../../services/workflowEngineProvider';
import { createConductorWorkflowEngine } from '../../../services';
import type { UserInfo } from '@/common/BusinessAppContext';

export interface UseTicketActionsProps {
  accessToken: string;
  userInfo?: UserInfo;
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
  userInfo,
  onSuccess,
  onError,
}: UseTicketActionsProps): UseTicketActionsReturn => {
  const [isPerformingAction, setIsPerformingAction] = useState<boolean>(false);

  // Get the appropriate workflow engine (real or mock)
  const getEngine = () => {
    if (accessToken && userInfo) {
      console.log(`🎯 [useTicketActions] Using ConductorWorkflowEngineAdapter for actions`);
      return createConductorWorkflowEngine(accessToken, userInfo);
    } else {
      console.log(`🎯 [useTicketActions] Using MockWorkflowEngineAdapter for actions`);
      return getWorkflowEngine();
    }
  };

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
      const workflowEngine = getEngine();
      console.log(`🎯 [useTicketActions] *** CLAIMING TICKET: ${stepId} ***`);
      await workflowEngine.claim(stepId);
    });
  };

  const assignTicket = async (stepId: string, userId: string): Promise<void> => {
    return handleAction('assign ticket', async () => {
      const workflowEngine = getEngine();
      console.log(`🎯 [useTicketActions] *** ASSIGNING TICKET: ${stepId} to ${userId} ***`);
      await workflowEngine.assign(stepId, userId);
    });
  };

  const advanceTicket = async (stepId: string, payload?: any): Promise<void> => {
    return handleAction('advance ticket', async () => {
      const workflowEngine = getEngine();
      console.log(`🎯 [useTicketActions] *** ADVANCING TICKET: ${stepId} ***`, payload ? 'with form data' : 'without form data');
      await workflowEngine.advance(stepId, payload);
    });
  };

  const addComment = async (stepId: string, body: string): Promise<Comment> => {
    return handleAction('add comment', async () => {
      const workflowEngine = getEngine();
      console.log(`🎯 [useTicketActions] *** ADDING COMMENT to: ${stepId} ***`);
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
