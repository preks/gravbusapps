/**
 * useOutboxFlows Hook
 * Fetches workflows initiated by the user
 */

import { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { env } from '@/common/env/EnvUtils'
import { Flow, FlowStatus } from '../types'

const FLOW_ENGINE_API = env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine'

export const useOutboxFlows = (context: BusinessAppContextProps) => {
  const [flows, setFlows] = useState<Flow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Use Keycloak user ID for CFlow (flows are initiated by Keycloak ID, not employee ID)
  const userId = context.userInfo?.id || ''

  /**
   * Fetch initiated workflows
   */
  const fetchInitiatedFlows = useCallback(async (): Promise<Flow[]> => {
    if (!userId) {
      console.log('[EveryBox] No userId available, skipping outbox flows fetch')
      return []
    }

    const startTime = performance.now()
    try {
      console.log(`[EveryBox] 🚀 START Fetching outbox flows for user: ${userId}`)
      const url = `${FLOW_ENGINE_API}/api/flows/user/${userId}/initiated?limit=100&offset=0`
      console.log(`[EveryBox] Outbox Flow Engine URL: ${url}`)

      const fetchStart = performance.now()
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(context.accessToken && { Authorization: `Bearer ${context.accessToken}` })
        }
      })
      const fetchEnd = performance.now()
      console.log(`[EveryBox] ⏱️ Outbox API response time: ${(fetchEnd - fetchStart).toFixed(0)}ms`)

      if (!response.ok) {
        console.error(`[EveryBox] Outbox API error: ${response.status} ${response.statusText}`)
        throw new Error(`Flow engine API error: ${response.status}`)
      }

      const data = await response.json()
      // API response structure: { status: "success", data: { flows: [...], totalCount: N } }
      const rawFlows: any[] = data.data?.flows || []

      const endTime = performance.now()
      console.log(
        `[EveryBox] ✅ DONE Fetched ${rawFlows.length} flows from outbox in ${(endTime - startTime).toFixed(0)}ms`
      )

      return rawFlows.map(flow => transformFlow(flow))
    } catch (err) {
      const endTime = performance.now()
      console.error(`[EveryBox] ❌ Error fetching initiated flows after ${(endTime - startTime).toFixed(0)}ms:`, err)
      throw err
    }
  }, [userId, context.accessToken])

  /**
   * Load all flows
   */
  const loadFlows = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const initiatedFlows = await fetchInitiatedFlows()
      setFlows(initiatedFlows)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load flows'
      setError(errorMessage)
      console.error('Error loading outbox flows:', err)
    } finally {
      setIsLoading(false)
    }
  }, [fetchInitiatedFlows])

  /**
   * Initial load
   */
  useEffect(() => {
    if (context.accessToken && userId) {
      loadFlows()
    }
  }, [context.accessToken, userId, loadFlows])

  return {
    flows,
    isLoading,
    error,
    refetch: loadFlows
  }
}

/**
 * Transform raw flow to unified format
 */
const transformFlow = (rawFlow: any): Flow => {
  const status = mapFlowStatus(rawFlow.status)

  return {
    id: (rawFlow as any).flowId || rawFlow.workflowId,
    templateName: (rawFlow as any).flowName || rawFlow.templateName || rawFlow.name || 'Unnamed Flow',
    templateId: rawFlow.templateId,
    status,
    initiatedBy: (rawFlow as any).initiatedBy || rawFlow.initiator || '',
    startedAt: (rawFlow as any).startTime || rawFlow.createdAt,
    completedAt: (rawFlow as any).endTime || rawFlow.completedAt,
    currentStep: (rawFlow as any).currentStep || 0,
    totalSteps: (rawFlow as any).stepStatus?.total || 0,
    steps: [],
    progressPercentage: (rawFlow as any).progressPercentage,
    metadata: {
      rawFlow
    }
  }
}

/**
 * Map flow status to unified status
 */
const mapFlowStatus = (status: string): FlowStatus => {
  switch (status.toUpperCase()) {
    case 'RUNNING':
    case 'IN_PROGRESS':
      return 'RUNNING'
    case 'COMPLETED':
      return 'COMPLETED'
    case 'FAILED':
    case 'TIMED_OUT':
      return 'FAILED'
    case 'TERMINATED':
    case 'CANCELED':
      return 'TERMINATED'
    default:
      return 'RUNNING'
  }
}
