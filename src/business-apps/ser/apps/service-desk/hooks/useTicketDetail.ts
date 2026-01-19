import { useState, useEffect } from 'react';
import type { StepInstance } from '../../../types';
import { createConductorWorkflowEngine } from '../../../services';

export interface UseTicketDetailProps {
  ticketId: string;
  accessToken: string;
  userInfo?: any;
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
  userInfo,
}: UseTicketDetailProps): UseTicketDetailReturn => {
  const [ticket, setTicket] = useState<StepInstance | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTicketDetail = async () => {
    try {
      setIsLoading(true);
      setError(null);

      console.log(`[useTicketDetail] Fetching details for ticket: ${ticketId}`, {
        hasAccessToken: !!accessToken,
        hasUserInfo: !!userInfo,
      });

      // Use real workflow engine - requires authentication
      if (!accessToken || !userInfo) {
        throw new Error('Authentication required - no access token or user info provided');
      }
      
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo });

      console.log(`🎯 [useTicketDetail] *** CALLING getTicketDetail for: ${ticketId} ***`);
      console.log(`🎯 [useTicketDetail] Using ${workflowEngine.constructor.name} for ticket details`);
      
      // Get ticket details directly using the dedicated endpoint
      console.log(`🎯 [useTicketDetail] About to call workflowEngine.getTicketDetail(${ticketId})`);
      const ticketDetail = await workflowEngine.getTicketDetail(ticketId);
      console.log(`🎯 [useTicketDetail] Got ticket detail:`, ticketDetail);
      
      if (!ticketDetail) {
        throw new Error(`Ticket not found: ${ticketId}`);
      }

      setTicket(ticketDetail);
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
