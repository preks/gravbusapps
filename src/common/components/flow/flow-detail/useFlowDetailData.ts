import { useCallback, useEffect, useMemo, useState } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import type { FlowDetailData, FlowDetailState, HistoryEvent, HistorySummary } from './types'
import { buildExecutionState, generateFallbackSteps, transformAuditEntry, transformFlowStep } from './utils'

function getWorkflowStatusMessage(status: string): string {
  if (status === 'RUNNING' || status === 'IN_PROGRESS') return 'On Track'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'FAILED') return 'Failed'
  if (status === 'TIMED_OUT') return 'Timed Out'
  if (status === 'PAUSED') return 'Paused'
  if (status === 'TERMINATED') return 'Terminated'
  return 'Unknown'
}

interface UseFlowDetailDataArgs {
  flowId: string
  accessToken?: string
}

export function useFlowDetailData({ flowId, accessToken }: UseFlowDetailDataArgs): FlowDetailState {
  const [flowData, setFlowData] = useState<FlowDetailData | null>(null)
  const [flowSteps, setFlowSteps] = useState<ReturnType<typeof transformFlowStep>[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())

  const requestHeaders = useMemo(
    () => ({
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      'Content-Type': 'application/json'
    }),
    [accessToken]
  )

  const loadHistoryData = useCallback(async () => {
    if (!flowId) return
    if (!accessToken) {
      setHistoryError('Access token missing')
      return
    }

    setHistoryLoading(true)
    setHistoryError(null)

    try {
      const apiBase = getFlowEngineApiBaseUrl()
      const response = await fetch(`${apiBase}/audit/logs?flowId=${flowId}&limit=100`, {
        headers: requestHeaders
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch audit data: ${response.status}`)
      }

      const auditData = await response.json()
      const auditEntries = Array.isArray(auditData.data?.entries) ? auditData.data.entries : []
      const transformedEvents = auditEntries.map(transformAuditEntry)
      const additionalCommentEvents: HistoryEvent[] = []

      auditEntries.forEach((entry: Record<string, any>, index: number) => {
        if (!entry.details?.comment || entry.action === 'COMMENT') return

        const baseEvent = transformAuditEntry(entry, index)
        additionalCommentEvents.push({
          ...baseEvent,
          type: 'comment',
          eventTitle: `Comment on ${baseEvent.stepTitle}`,
          description: `${baseEvent.userName || 'User'} added: "${entry.details.comment}"`,
          action: 'COMMENT',
          comment: entry.details.comment
        })
      })

      const allEvents = [...transformedEvents, ...additionalCommentEvents].sort(
        (left, right) => new Date(right.timestamp).getTime() - new Date(left.timestamp).getTime()
      )

      const summary: HistorySummary = {
        totalSteps: allEvents.filter(event => event.type === 'step').length,
        completedSteps: allEvents.filter(event => event.action === 'COMPLETE').length,
        totalAssignmentEvents: allEvents.filter(event => event.type === 'assignment').length,
        totalComments: allEvents.filter(event => event.type === 'comment').length,
        participants: [...new Set(allEvents.map(event => event.userId).filter(Boolean) as string[])]
      }

      setHistoryEvents(allEvents)
      setHistorySummary(summary)
    } catch (loadError) {
      setHistoryError(loadError instanceof Error ? loadError.message : 'Failed to load audit data')
    } finally {
      setHistoryLoading(false)
    }
  }, [flowId, requestHeaders])

  const toggleFilter = useCallback((filterType: string) => {
    setActiveFilters(currentFilters => {
      const nextFilters = new Set(currentFilters)
      if (nextFilters.has(filterType)) nextFilters.delete(filterType)
      else nextFilters.add(filterType)
      return nextFilters
    })
  }, [])

  const clearAllFilters = useCallback(() => {
    setActiveFilters(new Set())
  }, [])

  const filteredEvents = useMemo(() => {
    if (activeFilters.size === 0) return historyEvents

    return historyEvents.filter(event => {
      if (activeFilters.has('steps') && (event.type === 'step' || event.action === 'COMPLETE')) return true
      if (activeFilters.has('assignmentEvents') && event.type === 'assignment') return true
      if (activeFilters.has('statusChanges') && event.type === 'status') return true
      if (activeFilters.has('comments') && event.type === 'comment') return true
      if (activeFilters.has('flowEvents') && event.type === 'flow') return true
      return false
    })
  }, [activeFilters, historyEvents])

  useEffect(() => {
    void loadHistoryData()
  }, [loadHistoryData])

  const loadFlowDetailData = useCallback(
    async (background = false) => {
      if (!flowId) {
        setIsLoading(false)
        setError('Flow ID missing')
        return
      }
      if (!accessToken) {
        setIsLoading(false)
        setError('Access token missing')
        return
      }

      try {
        if (background) setIsRefreshing(true)
        else setIsLoading(true)
        setError(null)

        const apiBase = getFlowEngineApiBaseUrl()
        const [progressResponse, stepsResponse] = await Promise.all([
          fetch(`${apiBase}/flows/${flowId}/progress`, { headers: requestHeaders }),
          fetch(`${apiBase}/flows/${flowId}`, { headers: requestHeaders })
        ])

        if (!progressResponse.ok) {
          throw new Error(`Failed to fetch progress: ${progressResponse.status} ${progressResponse.statusText}`)
        }
        if (!stepsResponse.ok) {
          throw new Error(`Failed to fetch flow details: ${stepsResponse.status} ${stepsResponse.statusText}`)
        }

        const [progressData, flowDetailResponse] = await Promise.all([progressResponse.json(), stepsResponse.json()])
        const progress = progressData.data?.flow
        const flowDetails = flowDetailResponse

        if (!progress) {
          throw new Error('No progress data found')
        }

        const normalizedFlowData: FlowDetailData = {
          flowId: progress.rootWorkflowId,
          flowName: progress.rootWorkflowName || 'Unknown Workflow',
          templateId: progress.templateId,
          status: progress.workflowStatus,
          startTime: progress.timeInsights?.workflowStartTime || new Date().toISOString(),
          updateTime: progress.timeInsights?.lastActivityTime || new Date().toISOString(),
          endTime:
            ['COMPLETED', 'TIMED_OUT', 'TERMINATED', 'FAILED'].includes(progress.workflowStatus) &&
            progress.timeInsights
              ? progress.timeInsights.lastActivityTime
              : undefined,
          initiatedBy: typeof flowDetails?.initiatedBy === 'string' ? flowDetails.initiatedBy : undefined,
          initiatedById: typeof flowDetails?.initiatedById === 'string' ? flowDetails.initiatedById : undefined,
          progressPercentage: progress.userTaskProgressPercentage || 0,
          stepStatus: {
            completed: progress.completedSteps || 0,
            total: progress.totalSteps || 0,
            remaining: (progress.totalSteps || 0) - (progress.completedSteps || 0)
          },
          currentStep: (progress.completedSteps || 0) + 1,
          processHealth: progress.processHealth || {
            isOnTrack: progress.workflowStatus === 'RUNNING' || progress.workflowStatus === 'IN_PROGRESS',
            hasFailures: progress.workflowStatus === 'FAILED' || progress.workflowStatus === 'TIMED_OUT',
            isStalled: progress.workflowStatus === 'PAUSED' || progress.workflowStatus === 'TERMINATED',
            statusMessage: getWorkflowStatusMessage(progress.workflowStatus)
          },
          timeInsights: progress.timeInsights || {
            avgStepDurationMinutes: undefined,
            avgTaskCompletionMinutes: undefined,
            estimatedCompletionDate: undefined,
            isOverdue: false,
            minutesRunning: 0,
            minutesSinceLastUpdate: 0,
            workflowStartTime: new Date().toISOString(),
            lastActivityTime: undefined
          },
          durationHours: progress.timeInsights?.avgStepDurationHours
            ? progress.timeInsights.daysRunning * 24
            : undefined,
          durationMinutes: progress.timeInsights?.avgStepDurationHours
            ? progress.timeInsights.daysRunning * 24 * 60
            : undefined
        }

        const nextFlowSteps = Array.isArray(flowDetails?.steps)
          ? flowDetails.steps.map(transformFlowStep)
          : generateFallbackSteps(
              normalizedFlowData.stepStatus.total,
              normalizedFlowData.stepStatus.completed,
              normalizedFlowData.currentStep
            )

        setFlowData(normalizedFlowData)
        setFlowSteps([...nextFlowSteps].sort((left, right) => left.stepIndex - right.stepIndex))
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Failed to load flow details')
      } finally {
        if (background) setIsRefreshing(false)
        else setIsLoading(false)
      }
    },
    [accessToken, flowId, requestHeaders]
  )

  const refreshAllData = useCallback(async () => {
    await Promise.all([loadFlowDetailData(true), loadHistoryData()])
  }, [loadFlowDetailData, loadHistoryData])

  useEffect(() => {
    void loadFlowDetailData()
  }, [loadFlowDetailData])

  const executionState = useMemo(
    () => buildExecutionState(flowSteps, flowData?.status || 'QUEUED', flowData?.currentStep),
    [flowData?.currentStep, flowData?.status, flowSteps]
  )

  return {
    flowData,
    flowSteps,
    executionState,
    isLoading,
    isRefreshing,
    error,
    historyEvents,
    historySummary,
    historyLoading,
    historyError,
    filteredEvents,
    activeFilters,
    loadHistoryData,
    refreshAllData,
    toggleFilter,
    clearAllFilters
  }
}
