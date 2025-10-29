/**
 * useOutboxFlows Hook
 * Fetches workflows initiated by the user
 */

import { useState, useEffect, useCallback } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { env } from '@/common/env/EnvUtils';
import { Flow, RawFlow, FlowStatus } from '../types';

const FLOW_ENGINE_API = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine';

export const useOutboxFlows = (context: BusinessAppContextProps) => {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const userId = context.userInfo?.employeeDetails?.employeeId || '';

  /**
   * Fetch initiated workflows
   */
  const fetchInitiatedFlows = useCallback(async (): Promise<Flow[]> => {
    if (!userId) {
      console.log('[EveryBox] No userId available, skipping outbox flows fetch');
      return [];
    }

    try {
      console.log(`[EveryBox] Fetching outbox flows for user: ${userId}`);
      const url = `${FLOW_ENGINE_API}/api/flows/user/${userId}/initiated?limit=100&offset=0`;
      console.log(`[EveryBox] Outbox Flow Engine URL: ${url}`);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(context.accessToken && { Authorization: `Bearer ${context.accessToken}` })
        }
      });

      if (!response.ok) {
        console.error(`[EveryBox] Outbox API error: ${response.status} ${response.statusText}`);
        throw new Error(`Flow engine API error: ${response.status}`);
      }

      const data = await response.json();
      const rawFlows: RawFlow[] = data.flows || [];

      console.log(`[EveryBox] Fetched ${rawFlows.length} flows from outbox`);

      return rawFlows.map(flow => transformFlow(flow));
    } catch (err) {
      console.error('[EveryBox] Error fetching initiated flows:', err);
      throw err;
    }
  }, [userId, context.accessToken]);

  /**
   * Load all flows
   */
  const loadFlows = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const initiatedFlows = await fetchInitiatedFlows();
      setFlows(initiatedFlows);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flows';
      setError(errorMessage);
      console.error('Error loading outbox flows:', err);
    } finally {
      setIsLoading(false);
    }
  }, [fetchInitiatedFlows]);

  /**
   * Initial load
   */
  useEffect(() => {
    if (context.accessToken && userId) {
      loadFlows();
    }
  }, [context.accessToken, userId, loadFlows]);

  return {
    flows,
    isLoading,
    error,
    refetch: loadFlows
  };
};

/**
 * Transform raw flow to unified format
 */
const transformFlow = (rawFlow: RawFlow): Flow => {
  const status = mapFlowStatus(rawFlow.status);

  return {
    id: rawFlow.workflowId,
    templateName: rawFlow.templateName || rawFlow.name || 'Unnamed Flow',
    templateId: rawFlow.templateId,
    status,
    initiatedBy: rawFlow.initiator || '',
    startedAt: rawFlow.createdAt,
    completedAt: rawFlow.completedAt,
    currentStep: 0,
    totalSteps: 0,
    steps: [],
    metadata: {
      rawFlow
    }
  };
};

/**
 * Map flow status to unified status
 */
const mapFlowStatus = (status: string): FlowStatus => {
  switch (status.toUpperCase()) {
    case 'RUNNING':
    case 'IN_PROGRESS':
      return 'RUNNING';
    case 'COMPLETED':
      return 'COMPLETED';
    case 'FAILED':
    case 'TIMED_OUT':
      return 'FAILED';
    case 'TERMINATED':
    case 'CANCELED':
      return 'TERMINATED';
    default:
      return 'RUNNING';
  }
};

