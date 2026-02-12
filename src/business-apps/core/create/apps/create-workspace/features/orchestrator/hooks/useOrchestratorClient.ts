/**
 * Hook for using the Orchestrator API client
 *
 * Provides a memoized client instance and helper methods for
 * analyzing prompts and executing build plans.
 */

import { useCallback, useMemo, useState } from 'react'
import { OrchestratorClient } from '@/common/network/ai/orchestrator/OrchestratorClient'
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  BuildPlan,
  BuildJobStatus,
  UpdatePlanRequest,
  RefinePlanRequest,
  BuildStatus
} from '../types'

export interface UseOrchestratorClientOptions {
  accessToken: string
}

export interface UseOrchestratorClientResult {
  // State
  isAnalyzing: boolean
  analyzeError: string | null
  currentPlan: BuildPlan | null
  isRefining: boolean
  refineError: string | null
  refinementSummary: string | null

  // Methods
  analyze: (prompt: string, context?: Record<string, unknown>) => Promise<AnalyzeResponse>
  reanalyze: (answers: Record<string, string>) => Promise<AnalyzeResponse>
  refinePlan: (jobId: string, feedback: string) => Promise<AnalyzeResponse>
  updatePlan: (jobId: string, request: UpdatePlanRequest) => Promise<BuildPlan>
  getJobStatus: (jobId: string) => Promise<BuildJobStatus>
  cancelBuild: (jobId: string) => Promise<void>
  clearPlan: () => void
  clearRefinementSummary: () => void
  updateComponentProperties: (
    componentId: string,
    updates: Partial<{
      status: BuildStatus
      resourceUrl: string
      azureUrl: string
      publishedFileCount: number
      errorMessage: string
      createdId: string
    }>
  ) => void
  client: OrchestratorClient
}

/**
 * Hook for interacting with the AI Orchestrator API
 */
export function useOrchestratorClient({ accessToken }: UseOrchestratorClientOptions): UseOrchestratorClientResult {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzeError, setAnalyzeError] = useState<string | null>(null)
  const [currentPlan, setCurrentPlan] = useState<BuildPlan | null>(null)
  const [lastPrompt, setLastPrompt] = useState<string>('')
  const [lastContext, setLastContext] = useState<Record<string, unknown> | undefined>()
  const [isRefining, setIsRefining] = useState(false)
  const [refineError, setRefineError] = useState<string | null>(null)
  const [refinementSummary, setRefinementSummary] = useState<string | null>(null)

  // Create memoized client
  const client = useMemo(() => new OrchestratorClient(accessToken), [accessToken])

  /**
   * Analyze a prompt and generate a build plan
   */
  const analyze = useCallback(
    async (prompt: string, context?: Record<string, unknown>): Promise<AnalyzeResponse> => {
      setIsAnalyzing(true)
      setAnalyzeError(null)
      setLastPrompt(prompt)
      setLastContext(context)

      try {
        const request: AnalyzeRequest = { prompt, context }
        const response = await client.analyze(request)

        if (response.success && response.plan) {
          setCurrentPlan(response.plan)
        } else {
          setAnalyzeError(response.error || 'Analysis failed')
        }

        return response
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Analysis failed'
        setAnalyzeError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsAnalyzing(false)
      }
    },
    [client]
  )

  /**
   * Re-analyze with answers to clarifying questions
   */
  const reanalyze = useCallback(
    async (answers: Record<string, string>): Promise<AnalyzeResponse> => {
      if (!lastPrompt) {
        return { success: false, error: 'No previous prompt to re-analyze' }
      }

      setIsAnalyzing(true)
      setAnalyzeError(null)

      try {
        const request: AnalyzeRequest = {
          prompt: lastPrompt,
          context: lastContext,
          answers
        }
        const response = await client.analyze(request)

        if (response.success && response.plan) {
          setCurrentPlan(response.plan)
        } else {
          setAnalyzeError(response.error || 'Re-analysis failed')
        }

        return response
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Re-analysis failed'
        setAnalyzeError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsAnalyzing(false)
      }
    },
    [client, lastPrompt, lastContext]
  )

  /**
   * Refine a build plan with natural language feedback
   */
  const refinePlan = useCallback(
    async (jobId: string, feedback: string): Promise<AnalyzeResponse> => {
      setIsRefining(true)
      setRefineError(null)
      setRefinementSummary(null)

      try {
        const request: RefinePlanRequest = { feedback }
        const response = await client.refinePlan(jobId, request)

        if (response.success && response.plan) {
          setCurrentPlan(response.plan)
          setRefinementSummary(response.refinementSummary ?? null)
        } else {
          setRefineError(response.error || 'Refinement failed')
        }

        return response
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Refinement failed'
        setRefineError(errorMessage)
        return { success: false, error: errorMessage }
      } finally {
        setIsRefining(false)
      }
    },
    [client]
  )

  /**
   * Update a build plan
   */
  const updatePlan = useCallback(
    async (jobId: string, request: UpdatePlanRequest): Promise<BuildPlan> => {
      const updatedPlan = await client.updatePlan(jobId, request)

      // Update local state with the updated plan
      if (currentPlan?.jobId === jobId) {
        setCurrentPlan(updatedPlan)
      }

      return updatedPlan
    },
    [client, currentPlan]
  )

  /**
   * Get the status of a build job
   */
  const getJobStatus = useCallback(
    async (jobId: string): Promise<BuildJobStatus> => {
      return client.getJobStatus(jobId)
    },
    [client]
  )

  /**
   * Cancel a build job
   */
  const cancelBuild = useCallback(
    async (jobId: string): Promise<void> => {
      await client.cancelBuild(jobId)
      if (currentPlan?.jobId === jobId) {
        setCurrentPlan(null)
      }
    },
    [client, currentPlan]
  )

  /**
   * Clear the current plan
   */
  const clearPlan = useCallback(() => {
    setCurrentPlan(null)
    setAnalyzeError(null)
    setRefineError(null)
    setRefinementSummary(null)
    setLastPrompt('')
    setLastContext(undefined)
  }, [])

  /**
   * Clear refinement summary
   */
  const clearRefinementSummary = useCallback(() => {
    setRefinementSummary(null)
  }, [])

  /**
   * Update component properties (for publish results, etc.)
   */
  const updateComponentProperties = useCallback(
    (
      componentId: string,
      updates: Partial<{
        status: BuildStatus
        resourceUrl: string
        azureUrl: string
        publishedFileCount: number
        errorMessage: string
        createdId: string
      }>
    ) => {
      setCurrentPlan(prevPlan => {
        if (!prevPlan) {
          return prevPlan
        }

        const updatedPlan = {
          ...prevPlan,
          components: prevPlan.components.map(c => {
            if (c.id === componentId) {
              return { ...c, ...updates }
            }
            return c
          })
        }

        return updatedPlan
      })
    },
    []
  )

  return {
    isAnalyzing,
    analyzeError,
    currentPlan,
    isRefining,
    refineError,
    refinementSummary,
    analyze,
    reanalyze,
    refinePlan,
    updatePlan,
    getJobStatus,
    cancelBuild,
    clearPlan,
    clearRefinementSummary,
    updateComponentProperties,
    client
  }
}

export default useOrchestratorClient
