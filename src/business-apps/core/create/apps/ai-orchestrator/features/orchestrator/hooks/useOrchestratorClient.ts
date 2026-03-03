/**
 * Hook for using the Orchestrator API client
 *
 * Provides a memoized client instance and helper methods for
 * analyzing prompts and executing build plans.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  /** Shared session ID from last build (for preview and execute-again) */
  lastSessionId: string | null
  /** Shared repo ID from last build (for preview and execute-again) */
  lastRepoId: string | null
  isPublishing: boolean
  publishError: string | null
  publishSuccess: boolean

  // Methods
  analyze: (prompt: string, context?: Record<string, unknown>) => Promise<AnalyzeResponse>
  reanalyze: (answers: Record<string, string>) => Promise<AnalyzeResponse>
  refinePlan: (jobId: string, feedback: string) => Promise<AnalyzeResponse>
  updatePlan: (jobId: string, request: UpdatePlanRequest) => Promise<BuildPlan>
  getJobStatus: (jobId: string) => Promise<BuildJobStatus>
  /** Refetch plan from backend after build so UI uses persisted components with metadata. Returns loaded plan or null. */
  refreshPlan: (jobId: string) => Promise<BuildPlan | null>
  cancelBuild: (jobId: string) => Promise<void>
  /** Publish the built app screens using the session from the last build */
  publishApp: () => Promise<void>
  clearPlan: () => void
  clearRefinementSummary: () => void
  /** Store session from build_complete event so refine/execute-again can send it */
  setSessionFromBuild: (sessionId: string | undefined, repoId: string | undefined) => void
  updateComponentProperties: (
    componentId: string,
    updates: Partial<{
      status: BuildStatus
      resourceUrl: string
      azureUrl: string
      publishedFileCount: number
      errorMessage: string
      createdId: string
      metadata: Record<string, unknown>
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
  const [lastSessionId, setLastSessionId] = useState<string | null>(null)
  const [lastRepoId, setLastRepoId] = useState<string | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)
  const [publishSuccess, setPublishSuccess] = useState(false)

  // Create memoized client
  const client = useMemo(() => new OrchestratorClient(accessToken), [accessToken])

  // Reset publish state when viewing a different plan (e.g. selecting another session from history)
  useEffect(() => {
    setPublishSuccess(false)
    setPublishError(null)
  }, [currentPlan?.jobId])

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
   * Refetch plan from backend after build so UI uses persisted components with metadata.
   * Returns the loaded plan so callers can decide view state (e.g. show complete when already built).
   */
  const refreshPlan = useCallback(
    async (jobId: string): Promise<BuildPlan | null> => {
      try {
        const plan = await client.getPlan(jobId)
        setCurrentPlan(plan)
        return plan
      } catch {
        // Ignore; in-memory plan from events remains
        return null
      }
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
   * Clear the current plan and stored session (so a new flow does not send stale session)
   */
  const clearPlan = useCallback(() => {
    setCurrentPlan(null)
    setAnalyzeError(null)
    setRefineError(null)
    setRefinementSummary(null)
    setLastPrompt('')
    setLastContext(undefined)
    setLastSessionId(null)
    setLastRepoId(null)
    setPublishSuccess(false)
    setPublishError(null)
  }, [])

  /**
   * Store shared session from build_complete event for preview and execute-again.
   * Clears publish state so the UI shows "Publish" until the user actually publishes.
   */
  const setSessionFromBuild = useCallback((sessionId: string | undefined, repoId: string | undefined) => {
    setLastSessionId(sessionId ?? null)
    setLastRepoId(repoId ?? null)
    setPublishSuccess(false)
    setPublishError(null)
  }, [])

  /**
   * Publish the app using the session from the last build
   */
  const publishApp = useCallback(async (): Promise<void> => {
    if (!lastRepoId || !lastSessionId) {
      setPublishError('No build session available to publish. Please build first.')
      return
    }
    setIsPublishing(true)
    setPublishError(null)
    setPublishSuccess(false)
    try {
      const result = await client.publishApp(lastRepoId, lastSessionId)
      if (result.success) {
        setPublishSuccess(true)
      } else {
        setPublishError(result.message || 'Publish failed')
      }
    } catch (error) {
      setPublishError(error instanceof Error ? error.message : 'Publish failed')
    } finally {
      setIsPublishing(false)
    }
  }, [client, lastRepoId, lastSessionId])

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
        metadata: Record<string, unknown>
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
    lastSessionId,
    lastRepoId,
    isPublishing,
    publishError,
    publishSuccess,
    analyze,
    reanalyze,
    refinePlan,
    updatePlan,
    getJobStatus,
    refreshPlan,
    cancelBuild,
    publishApp,
    clearPlan,
    clearRefinementSummary,
    setSessionFromBuild,
    updateComponentProperties,
    client
  }
}

export default useOrchestratorClient
