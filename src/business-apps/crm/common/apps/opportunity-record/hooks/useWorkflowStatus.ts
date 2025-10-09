import { useState, useEffect, useCallback } from 'react'
import { WorkflowStatusService } from '../services/WorkflowStatusService'
import { WorkflowStatus, StageTransitionCondition } from '../types/stageTransition'
import { getStageTransitionConditions } from '../config/stageTransitionConditions'

interface UseWorkflowStatusProps {
  opportunityId: string
  accessToken: string
}

interface UseWorkflowStatusReturn {
  // State
  activeWorkflows: WorkflowStatus[]
  loading: boolean
  error: string | null

  // Actions
  checkStageTransitionConditions: (fromStage: string, toStage: string) => StageTransitionCondition[]
  getStageTransitionWorkflows: (fromStage: string, toStage: string) => Promise<WorkflowStatus[]>
  startStageTransitionWorkflows: (conditions: StageTransitionCondition[], opportunityData: any) => Promise<void>
  refreshWorkflows: () => Promise<void>
  cancelWorkflows: (fromStage: string, toStage: string) => Promise<boolean>
}

export const useWorkflowStatus = ({ opportunityId, accessToken }: UseWorkflowStatusProps): UseWorkflowStatusReturn => {
  const [activeWorkflows, setActiveWorkflows] = useState<WorkflowStatus[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Check if stage transition has conditions
  const checkStageTransitionConditions = useCallback(
    (
      fromStage: string,
      toStage: string,
      pipelineId: string = 'default-pipeline',
      opportunityValue?: number
    ): StageTransitionCondition[] => {
      return getStageTransitionConditions(fromStage, toStage, pipelineId, opportunityValue)
    },
    []
  )

  // Get workflows for a specific stage transition
  const getStageTransitionWorkflows = useCallback(
    async (fromStage: string, toStage: string): Promise<WorkflowStatus[]> => {
      try {
        setLoading(true)
        setError(null)

        const workflows = await WorkflowStatusService.getStageTransitionWorkflows(
          opportunityId,
          fromStage,
          toStage,
          accessToken
        )

        setActiveWorkflows(workflows)
        return workflows
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch workflows'
        setError(errorMessage)
        return []
      } finally {
        setLoading(false)
      }
    },
    [opportunityId, accessToken]
  )

  // Start workflows for stage transition conditions
  const startStageTransitionWorkflows = useCallback(
    async (conditions: StageTransitionCondition[], opportunityData: any): Promise<void> => {
      try {
        setLoading(true)
        setError(null)

        for (const condition of conditions) {
          await WorkflowStatusService.startStageTransitionWorkflow(
            opportunityId,
            condition,
            opportunityData,
            accessToken
          )
        }

        // Refresh workflows after starting
        await refreshWorkflows()
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to start workflows'
        setError(errorMessage)
        throw error
      } finally {
        setLoading(false)
      }
    },
    [opportunityId, accessToken]
  )

  // Refresh all active workflows
  const refreshWorkflows = useCallback(async (): Promise<void> => {
    try {
      setLoading(true)
      setError(null)

      const workflows = await WorkflowStatusService.getActiveWorkflows(opportunityId, accessToken)
      setActiveWorkflows(workflows)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh workflows'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }, [opportunityId, accessToken])

  // Cancel workflows for a stage transition
  const cancelWorkflows = useCallback(
    async (fromStage: string, toStage: string): Promise<boolean> => {
      try {
        setLoading(true)
        setError(null)

        const success = await WorkflowStatusService.cancelStageTransitionWorkflows(
          opportunityId,
          fromStage,
          toStage,
          accessToken
        )

        if (success) {
          // Refresh workflows after cancellation
          await refreshWorkflows()
        }

        return success
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to cancel workflows'
        setError(errorMessage)
        return false
      } finally {
        setLoading(false)
      }
    },
    [opportunityId, accessToken, refreshWorkflows]
  )

  // Load initial workflows on mount
  useEffect(() => {
    if (opportunityId && accessToken) {
      refreshWorkflows()
    }
  }, [opportunityId, accessToken, refreshWorkflows])

  return {
    // State
    activeWorkflows,
    loading,
    error,

    // Actions
    checkStageTransitionConditions,
    getStageTransitionWorkflows,
    startStageTransitionWorkflows,
    refreshWorkflows,
    cancelWorkflows
  }
}
