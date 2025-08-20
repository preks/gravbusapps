import { useState, useEffect } from 'react';
import type { StepReceiver, StepInstance } from 'packages/services-plus-core';
import { getWorkflowEngine } from '../../../services/workflowEngineProvider';

export interface UseDeskTicketsProps {
  deskKey: StepReceiver;
  accessToken: string;
}

export interface UseDeskTicketsReturn {
  tickets: StepInstance[] | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch tickets for a specific desk
 * Integrates with WorkflowEngine.getDeskTickets()
 */
export const useDeskTickets = ({
  deskKey,
  accessToken,
}: UseDeskTicketsProps): UseDeskTicketsReturn => {
  const [tickets, setTickets] = useState<StepInstance[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTickets = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get WorkflowEngine instance (MockWorkflowEngineAdapter for now)
      const workflowEngine = getWorkflowEngine();
      
      // Fetch tickets for this desk using the engine
      const deskTickets = await workflowEngine.getDeskTickets(deskKey);

      setTickets(deskTickets);
    } catch (err) {
      console.error('Error fetching desk tickets:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch tickets');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && deskKey) {
      fetchTickets();
    }
  }, [deskKey, accessToken]);

  return {
    tickets,
    isLoading,
    error,
    refetch: fetchTickets,
  };
};
