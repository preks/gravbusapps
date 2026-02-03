/**
 * Hook for using the Orchestrator API client
 *
 * Provides a memoized client instance and helper methods for
 * analyzing prompts and executing build plans.
 */

import { useCallback, useMemo, useState } from 'react'
import { OrchestratorClient } from '@/common/network/ai/orchestrator/OrchestratorClient'
import type { AnalyzeRequest, AnalyzeResponse, BuildPlan, BuildJobStatus } from '../types/orchestrator'

export interface UseOrchestratorClientOptions {
  accessToken: string
}

export interface UseOrchestratorClientResult {
  // State
  isAnalyzing: boolean
  analyzeError: string | null
  currentPlan: BuildPlan | null

  // Methods
  analyze: (prompt: string, context?: Record<string, unknown>) => Promise<AnalyzeResponse>
  reanalyze: (answers: Record<string, string>) => Promise<AnalyzeResponse>
  getJobStatus: (jobId: string) => Promise<BuildJobStatus>
  cancelBuild: (jobId: string) => Promise<void>
  clearPlan: () => void
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
      if (currentPlan?.job_id === jobId) {
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
    setLastPrompt('')
    setLastContext(undefined)
  }, [])

  return {
    isAnalyzing,
    analyzeError,
    currentPlan,
    analyze,
    reanalyze,
    getJobStatus,
    cancelBuild,
    clearPlan,
    client
  }
}

export default useOrchestratorClient
