import { useState, useEffect } from 'react';
import type { StepInstance } from 'packages/services-plus-core';
import { getWorkflowEngine } from '../../../services/workflowEngineProvider';

export interface UseTicketDetailProps {
  ticketId: string;
  accessToken: string;
}

export interface UseTicketDetailReturn {
  ticket: StepInstance | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Hook to fetch detailed information for a specific ticket
 * Integrates with WorkflowEngine to get step details
 */
export const useTicketDetail = ({
  ticketId,
  accessToken,
}: UseTicketDetailProps): UseTicketDetailReturn => {
  const [ticket, setTicket] = useState<StepInstance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicketDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get WorkflowEngine instance (MockWorkflowEngineAdapter for now)
      const workflowEngine = getWorkflowEngine();
      
      // Find the ticket by searching all desk tickets
      // In a real implementation, there would be a direct getStep method
      let foundTicket: StepInstance | null = null;
      
      // Search across all desk types to find the ticket
      const deskTypes = ['HR', 'IT', 'Facilities', 'Finance', 'Procurement', 'Legal', 
                        'Security', 'AccessIdentity', 'Workplace', 'Fleet', 'Data', 'L&D', 'Admin'] as const;
      
      for (const desk of deskTypes) {
        const tickets = await workflowEngine.getDeskTickets(desk);
        const ticket = tickets.find(t => t.id === ticketId);
        if (ticket) {
          foundTicket = ticket;
          break;
        }
      }

      if (!foundTicket) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      setTicket(foundTicket);
    } catch (err) {
      console.error('Error fetching ticket detail:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch ticket details');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (accessToken && ticketId) {
      fetchTicketDetail();
    }
  }, [ticketId, accessToken]);

  return {
    ticket,
    isLoading,
    error,
    refetch: fetchTicketDetail,
  };
};
