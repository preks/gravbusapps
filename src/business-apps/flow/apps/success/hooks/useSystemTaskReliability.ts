import { useCallback, useEffect, useState } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import type { DecisionTimeframe } from './useDecisionData'

const AI_TASK_TYPES = new Set(['AGENT', 'AI_AGENT', 'TASK_EXPERT', 'AI_TASK_EXPERT'])
const FUNCTION_TASK_TYPES = new Set(['FUNCTION', 'CUSTOM_DATA_MUTATION'])
const AUTOMATION_BUCKET_TASK_TYPES = new Set([...AI_TASK_TYPES, ...FUNCTION_TASK_TYPES])

const normalizeTaskType = (taskType?: string | null): string =>
  String(taskType || '')
    .trim()
    .toUpperCase()

const buildAutomationInsights = (
  byTaskType: Array<{ taskType: string; totalTasks: number }>,
  humanTasks: number
): SystemTaskReliabilityData['automationInsights'] => {
  const aiTasks = byTaskType
    .filter(item => AI_TASK_TYPES.has(normalizeTaskType(item.taskType)))
    .reduce((sum, item) => sum + item.totalTasks, 0)
  const functionTasks = byTaskType
    .filter(item => FUNCTION_TASK_TYPES.has(normalizeTaskType(item.taskType)))
    .reduce((sum, item) => sum + item.totalTasks, 0)
  const totalAutomationTasks = aiTasks + functionTasks
  const totalTrackedTasks = totalAutomationTasks + humanTasks
  const toRatioPercent = (numerator: number, denominator: number) =>
    denominator > 0 ? Math.round((numerator / denominator) * 10000) / 100 : 0

  return {
    humanTasks,
    aiTasks,
    functionTasks,
    totalAutomationTasks,
    totalTrackedTasks,
    humanRatio: toRatioPercent(humanTasks, totalTrackedTasks),
    aiRatio: toRatioPercent(aiTasks, totalTrackedTasks),
    functionRatio: toRatioPercent(functionTasks, totalTrackedTasks),
    automationRatio: toRatioPercent(totalAutomationTasks, totalTrackedTasks),
    aiShareOfAutomation: toRatioPercent(aiTasks, totalAutomationTasks),
    functionShareOfAutomation: toRatioPercent(functionTasks, totalAutomationTasks)
  }
}

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
      const byTaskType = (Array.isArray(payload?.byTaskType) ? payload.byTaskType : []).filter(item =>
        AUTOMATION_BUCKET_TASK_TYPES.has(normalizeTaskType(item?.taskType))
      )
      const hotspots = (Array.isArray(payload?.hotspots) ? payload.hotspots : []).filter(item =>
        AUTOMATION_BUCKET_TASK_TYPES.has(normalizeTaskType(item?.taskType))
      )
      const topErrors = (Array.isArray(payload?.topErrors) ? payload.topErrors : []).filter(item =>
        AUTOMATION_BUCKET_TASK_TYPES.has(normalizeTaskType(item?.taskType))
      )
      const humanTasks = Number(payload?.automationInsights?.humanTasks || 0)
      const normalizedTaskTypes = byTaskType.map(item => ({
        ...item,
        taskType: String(item?.taskType || ''),
        totalTasks: Number(item?.totalTasks || 0)
      }))
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
        automationInsights: buildAutomationInsights(normalizedTaskTypes, humanTasks),
        byTaskType: byTaskType,
        hotspots: hotspots,
        timeSeries: Array.isArray(payload?.timeSeries) ? payload.timeSeries : [],
        topErrors: topErrors
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
