/**
 * useTaskActions Hook
 * Handles task operations (complete, reassign, reject, etc.)
 */

import { useState, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';
import { TaskActionPayload } from '../types';

const FLOW_ENGINE_API = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine';

export const useTaskActions = (context: BusinessAppContextProps) => {
  const [isPerforming, setIsPerforming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const userId = context.userInfo?.employeeDetails?.employeeId || '';

  /**
   * Complete a task
   */
  const completeTask = useCallback(
    async (taskId: string, formData?: Record<string, any>): Promise<boolean> => {
      setIsPerforming(true);
      setError(null);

      try {
        const response = await fetch(`${FLOW_ENGINE_API}/api/tasks/${taskId}/complete`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(context.accessToken && { Authorization: `Bearer ${context.accessToken}` })
          },
          body: JSON.stringify({
            userId,
            action: 'COMPLETE',
            formData: formData || {}
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to complete task: ${response.status}`);
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to complete task';
        setError(errorMessage);
        console.error('Error completing task:', err);
        return false;
      } finally {
        setIsPerforming(false);
      }
    },
    [userId, context.accessToken]
  );

  /**
   * Reassign a task
   */
  const reassignTask = useCallback(
    async (taskId: string, newUserId: string): Promise<boolean> => {
      setIsPerforming(true);
      setError(null);

      try {
        const response = await fetch(`${FLOW_ENGINE_API}/api/tasks/${taskId}/reassign`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(context.accessToken && { Authorization: `Bearer ${context.accessToken}` })
          },
          body: JSON.stringify({
            currentUserId: userId,
            newUserId
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to reassign task: ${response.status}`);
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reassign task';
        setError(errorMessage);
        console.error('Error reassigning task:', err);
        return false;
      } finally {
        setIsPerforming(false);
      }
    },
    [userId, context.accessToken]
  );

  /**
   * Reject a task
   */
  const rejectTask = useCallback(
    async (taskId: string, comment?: string): Promise<boolean> => {
      setIsPerforming(true);
      setError(null);

      try {
        const response = await fetch(`${FLOW_ENGINE_API}/api/tasks/${taskId}/reject`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(context.accessToken && { Authorization: `Bearer ${context.accessToken}` })
          },
          body: JSON.stringify({
            userId,
            rejectionComment: comment || '',
            comment: comment || ''
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to reject task: ${response.status}`);
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reject task';
        setError(errorMessage);
        console.error('Error rejecting task:', err);
        return false;
      } finally {
        setIsPerforming(false);
      }
    },
    [userId, context.accessToken]
  );

  /**
   * Add a comment to a task
   */
  const addComment = useCallback(
    async (taskId: string, comment: string): Promise<boolean> => {
      setIsPerforming(true);
      setError(null);

      try {
        const response = await fetch(`${FLOW_ENGINE_API}/api/tasks/${taskId}/comment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(context.accessToken && { Authorization: `Bearer ${context.accessToken}` })
          },
          body: JSON.stringify({
            userId,
            comment,
            visibility: 'INTERNAL_TASK'
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to add comment: ${response.status}`);
        }

        return true;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to add comment';
        setError(errorMessage);
        console.error('Error adding comment:', err);
        return false;
      } finally {
        setIsPerforming(false);
      }
    },
    [userId, context.accessToken]
  );

  return {
    completeTask,
    reassignTask,
    rejectTask,
    addComment,
    isPerforming,
    error
  };
};

