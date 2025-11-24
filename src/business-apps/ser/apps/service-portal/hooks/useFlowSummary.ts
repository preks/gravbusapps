import { useState, useEffect, useCallback } from 'react'
import { WorkflowEngine } from '../../../types'

export interface FlowSummaryData {
  workflowId: string
  workflowName: string
  status: string
  initiator: string
  createdAt: string
  completedAt?: string
  progress?: number | { currentStep?: number; totalSteps?: number; completedSteps?: number; percentage?: number }
  summaryData: Array<{
    label: string
    value: any
    type?: string
    format?: string
    visibility?: string
  }>
}

export interface UseFlowSummaryOptions {
  flowId: string
  userId: string
  workflowEngine: WorkflowEngine
  enabled?: boolean
}

export const useFlowSummary = ({ flowId, userId, workflowEngine, enabled = true }: UseFlowSummaryOptions) => {
  const [summaryData, setSummaryData] = useState<FlowSummaryData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchSummary = useCallback(async () => {
    // Enhanced validation logging
    console.log('[useFlowSummary] 🔍 Fetch summary called:', {
      enabled,
      flowId,
      userId,
      hasWorkflowEngine: !!workflowEngine,
      hasGetFlowSummaryMethod: !!workflowEngine?.getFlowSummary
    })

    if (!enabled) {
      console.log('[useFlowSummary] ⏸️ Skipped: Not enabled (flow may not be completed yet)')
      return
    }

    if (!flowId) {
      console.warn('[useFlowSummary] ⚠️ Skipped: Missing flowId')
      return
    }

    if (!userId) {
      console.warn('[useFlowSummary] ⚠️ Skipped: Missing userId')
      return
    }

    // Check if workflow engine supports getFlowSummary
    if (!workflowEngine.getFlowSummary) {
      console.warn('[useFlowSummary] ⚠️ Workflow engine does not support getFlowSummary method')
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      console.log('[useFlowSummary] 🚀 Fetching flow summary:', { flowId, userId })

      const summary = await workflowEngine.getFlowSummary(flowId, userId)

      console.log('[useFlowSummary] ✅ Flow summary fetched successfully:', {
        workflowId: summary.workflowId,
        workflowName: summary.workflowName,
        status: summary.status,
        summaryFieldsCount: summary.summaryData?.length || 0,
        hasSummaryData: !!(summary.summaryData && summary.summaryData.length > 0)
      })

      setSummaryData(summary)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch flow summary'
      console.error('[useFlowSummary] ❌ Error fetching flow summary:', err)
      setError(errorMessage)
      setSummaryData(null)
    } finally {
      setIsLoading(false)
    }
  }, [flowId, userId, workflowEngine, enabled])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  return {
    summaryData,
    isLoading,
    error,
    refetch: fetchSummary
  }
}
