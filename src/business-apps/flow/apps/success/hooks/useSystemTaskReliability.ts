import { useCallback, useEffect, useState } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import type { DecisionTimeframe } from './useDecisionData'

export interface SystemTaskReliabilityData {
  summary: {
    totalTasks: number
    completedTasks: number
    failedTasks: number
    timedOutTasks: number
    canceledTasks: number
    successRate: number
    failureRate: number
    timeoutRate: number
    avgDurationMs: number
    p95DurationMs: number
  }
  automationInsights: {
    humanTasks: number
    aiTasks: number
    functionTasks: number
    totalAutomationTasks: number
    totalTrackedTasks: number
    humanRatio: number
    aiRatio: number
    functionRatio: number
    automationRatio: number
    aiShareOfAutomation: number
    functionShareOfAutomation: number
  }
  byTaskType: Array<{
    taskType: string
    totalTasks: number
    completedTasks: number
    failedTasks: number
    timedOutTasks: number
    successRate: number
    failureRate: number
    timeoutRate: number
    avgDurationMs: number
    p95DurationMs: number
  }>
  hotspots: Array<{
    templateId: string
    stepReference: string
    stepTitle: string
    taskType: string
    totalTasks: number
    failedTasks: number
    timedOutTasks: number
    successRate: number
    failureRate: number
    timeoutRate: number
    avgDurationMs: number
    p95DurationMs: number
  }>
  timeSeries: Array<{
    period: string
    totalTasks: number
    completedTasks: number
    failedTasks: number
    timedOutTasks: number
    successRate: number
  }>
  topErrors: Array<{
    taskType: string
    stepReference: string
    stepTitle: string
    errorMessage: string
    totalOccurrences: number
    lastSeenAt?: string | null
  }>
}

export const useSystemTaskReliability = (filters: {
  accessToken: string
  timeframe?: DecisionTimeframe
  templateId?: string
  taskType?: string
  stepReference?: string
}) => {
  const [data, setData] = useState<SystemTaskReliabilityData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchReliability = useCallback(async () => {
    if (!filters.accessToken) {
      setData(null)
      setIsLoading(false)
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      queryParams.set('timeframe', filters.timeframe || 'mtd')
      if (filters.templateId?.trim()) queryParams.set('templateId', filters.templateId.trim())
      if (filters.taskType?.trim()) queryParams.set('taskType', filters.taskType.trim())
      if (filters.stepReference?.trim()) queryParams.set('stepReference', filters.stepReference.trim())

      const response = await fetch(`${API_BASE}/analytics/system-tasks?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${filters.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch system task reliability: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const payload = result?.status === 'success' ? result.data : result
      setData({
        summary: {
          totalTasks: Number(payload?.summary?.totalTasks || 0),
          completedTasks: Number(payload?.summary?.completedTasks || 0),
          failedTasks: Number(payload?.summary?.failedTasks || 0),
          timedOutTasks: Number(payload?.summary?.timedOutTasks || 0),
          canceledTasks: Number(payload?.summary?.canceledTasks || 0),
          successRate: Number(payload?.summary?.successRate || 0),
          failureRate: Number(payload?.summary?.failureRate || 0),
          timeoutRate: Number(payload?.summary?.timeoutRate || 0),
          avgDurationMs: Number(payload?.summary?.avgDurationMs || 0),
          p95DurationMs: Number(payload?.summary?.p95DurationMs || 0)
        },
        automationInsights: {
          humanTasks: Number(payload?.automationInsights?.humanTasks || 0),
          aiTasks: Number(payload?.automationInsights?.aiTasks || 0),
          functionTasks: Number(payload?.automationInsights?.functionTasks || 0),
          totalAutomationTasks: Number(payload?.automationInsights?.totalAutomationTasks || 0),
          totalTrackedTasks: Number(payload?.automationInsights?.totalTrackedTasks || 0),
          humanRatio: Number(payload?.automationInsights?.humanRatio || 0),
          aiRatio: Number(payload?.automationInsights?.aiRatio || 0),
          functionRatio: Number(payload?.automationInsights?.functionRatio || 0),
          automationRatio: Number(payload?.automationInsights?.automationRatio || 0),
          aiShareOfAutomation: Number(payload?.automationInsights?.aiShareOfAutomation || 0),
          functionShareOfAutomation: Number(payload?.automationInsights?.functionShareOfAutomation || 0)
        },
        byTaskType: Array.isArray(payload?.byTaskType) ? payload.byTaskType : [],
        hotspots: Array.isArray(payload?.hotspots) ? payload.hotspots : [],
        timeSeries: Array.isArray(payload?.timeSeries) ? payload.timeSeries : [],
        topErrors: Array.isArray(payload?.topErrors) ? payload.topErrors : []
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch system task reliability'))
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [API_BASE, filters.accessToken, filters.stepReference, filters.taskType, filters.templateId, filters.timeframe])

  useEffect(() => {
    fetchReliability()
  }, [fetchReliability])

  return {
    data,
    isLoading,
    error,
    refetch: fetchReliability
  }
}
