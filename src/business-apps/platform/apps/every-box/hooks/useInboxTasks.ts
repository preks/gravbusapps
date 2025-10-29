/**
 * useInboxTasks Hook
 * Fetches tasks from both CFlow and Kogito using the unified API
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { fetchAllUserTasks } from '@/business-apps/core/every/apps/every-api';
import { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types';

interface UseInboxTasksResult {
  tasks: UnifiedTask[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useInboxTasks = (context: BusinessAppContextProps): UseInboxTasksResult => {
  const [tasks, setTasks] = useState<UnifiedTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = context.userInfo?.employeeDetails?.employeeId || '';

  // Track whether we've made the initial fetch
  const hasInitialFetchRef = useRef(false);

  /**
   * Load all tasks from unified API
   */
  const loadTasks = useCallback(async () => {
    if (!userId) {
      console.log('[EveryBox] No userId available, skipping inbox tasks fetch');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log(`[EveryBox] Fetching unified tasks for user: ${userId}`);
      
      // Use the unified API to fetch tasks from both sources
      const response = await fetchAllUserTasks(userId, context.accessToken || '', {
        assignedOnly: true, // Only fetch tasks assigned to this user
        limit: 100,
        sortBy: 'createdAt',
        sortOrder: 'desc'
      });

      console.log(`[EveryBox] Fetched ${response.tasks.length} total tasks`);
      console.log('[EveryBox] Sample task:', response.tasks[0]);
      
      // Log source breakdown
      const kogitoCount = response.tasks.filter(t => t.source === 'kogito').length;
      const cflowCount = response.tasks.filter(t => t.source === 'cflow').length;
      console.log(`[EveryBox] Kogito tasks: ${kogitoCount}, CFlow tasks: ${cflowCount}`);

      setTasks(response.tasks);

      // Log any warnings or errors
      if (response.warnings && response.warnings.length > 0) {
        console.warn('[EveryBox] Warnings:', response.warnings);
      }
      if (response.errors && response.errors.length > 0) {
        console.error('[EveryBox] Errors:', response.errors);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load tasks';
      setError(errorMessage);
      console.error('[EveryBox] Error loading inbox tasks:', err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, context.accessToken]);

  /**
   * Initial fetch on mount
   */
  useEffect(() => {
    if (!hasInitialFetchRef.current && userId) {
      hasInitialFetchRef.current = true;
      loadTasks();
    }
  }, [userId, loadTasks]);

  return {
    tasks,
    isLoading,
    error,
    refetch: loadTasks
  };
};
