import { useState, useEffect } from 'react';
import type { StepInstance } from '../../../types';
import { createConductorWorkflowEngine } from '../../../services';

export interface UseCompletedTicketsProps {
  accessToken: string;
  userInfo?: any;
  limit?: number;
  offset?: number;
}

export interface UseCompletedTicketsReturn {
  tickets: StepInstance[] | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  hasMore: boolean;
}

/**
 * Hook to fetch completed tickets for the current user
 * Uses /api/tasks/user/{userId}/completed endpoint
 */
export const useCompletedTickets = ({
  accessToken,
  userInfo,
  limit = 20,
  offset = 0,
}: UseCompletedTicketsProps): UseCompletedTicketsReturn => {
  const [tickets, setTickets] = useState<StepInstance[] | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCompletedTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`[useCompletedTickets] Fetching completed tickets`, {
        hasAccessToken: !!accessToken,
        hasUserInfo: !!userInfo,
        limit,
        offset,
      });

      // Use real workflow engine - requires authentication
      if (!accessToken || !userInfo) {
        throw new Error('Authentication required - no access token or user info provided');
      }
      
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });
      console.log(`[useCompletedTickets] Using ${workflowEngine.constructor.name} for completed tickets`);
      
      // Fetch completed tickets using the engine
      const result = await workflowEngine.getCompletedTickets({ limit, offset });

      console.log(`[useCompletedTickets] Retrieved ${result.tickets.length} completed tickets (${result.totalCount} total)`, result.tickets);
      setTickets(result.tickets);
      setTotalCount(result.totalCount);
    } catch (err) {
      console.error(`[useCompletedTickets] Error fetching completed tickets:`, err);
      setError(err instanceof Error ? err.message : 'Failed to fetch completed tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && userInfo) {
      fetchCompletedTickets();
    }
  }, [accessToken, userInfo, limit, offset]);

  const hasMore = totalCount > (offset + limit);

  return {
    tickets,
    totalCount,
    isLoading,
    error,
    refetch: fetchCompletedTickets,
    hasMore,
  };
};
