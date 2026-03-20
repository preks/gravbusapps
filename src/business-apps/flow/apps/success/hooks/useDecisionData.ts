import { useCallback, useEffect, useState } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

export type DecisionTimeframe = 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd'

export interface DecisionLogEntry {
  id?: string
  flowId: string
  templateId: string
  originalTemplate?: Record<string, unknown> | null
  stepReference: string
  decisionTitle?: string
  decisionMode: string
  decidedBy: string
  decisionInput: Record<string, unknown>
  decisionOutput: Record<string, unknown>
  selectedBranch: string
  selectedBranchLabel?: string
  defaultBranchId?: string
  defaultBranchLabel?: string
  decisionReasoning?: string
  decisionInstructions?: string
  humanReviewInstructions?: string
  confidence?: number | null
  escalated: boolean
  escalationReason?: string
  promptId?: string
  promptName?: string
  promptVersion?: number | null
  policyDocumentId?: string
  policyDocumentTitle?: string
  policyDocumentVersion?: string
  promptExecutionId?: string
  aiSuggestedBranch?: string
  branchAgreement?: boolean | null
  decisionLinks?: Array<{
    name: string
    url: string
    type?: string
  }>
  logicRoutes?: Array<{
    branchId: string
    branchLabel?: string
    condition?: string
    isDefault?: boolean
    isSelected?: boolean
  }>
  workflowVariableLabels?: Record<string, string>
  logicRouteType?: string
  logicMatchedCondition?: string
  logicFallbackReason?: string
  correlationId?: string
  durationMs: number
  isTest?: boolean
  createdAt?: string
  flowName?: string
  flowStatus?: string
  flowUpdatedAt?: string
}

export interface DecisionLogSummary {
  totalDecisions: number
  escalatedCount: number
  aiCount: number
  userCount: number
  logicCount: number
  uniqueFlowInstances: number
}

export interface DecisionFlowOption {
  flowName: string
  decisionCount: number
}

export interface DecisionLogsData {
  decisions: DecisionLogEntry[]
  summary: DecisionLogSummary
  flowOptions: DecisionFlowOption[]
  pagination: {
    total: number
    limit: number
    offset: number
    hasMore: boolean
  }
}

export interface DecisionOptimizationData {
  summary: {
    totalDecisions: number
    aiDirectCount: number
    aiEscalatedCount: number
    userDirectCount: number
    logicDirectCount: number
    humanOverrideCount: number
    promptExecutionCount: number
    promptLinkedCount: number
    policyLinkedCount: number
    branchAgreementRate: number
  }
  stepPerformance: Array<{
    decisionTitle: string
    stepReference: string
    decisionMode: string
    promptName?: string
    promptVersion?: number | null
    policyDocumentTitle?: string
    policyDocumentVersion?: string
    totalDecisions: number
    escalatedCount: number
    escalationRate: number
    humanOverrideCount: number
    humanOverrideRate: number
    branchAgreementRate: number
    avgDurationMs: number
  }>
  promptVersions: Array<{
    stepReference: string
    promptId?: string
    promptName?: string
    promptVersion?: number | null
    totalDecisions: number
    escalatedCount: number
    escalationRate: number
    branchAgreementRate: number
  }>
  policyVersions: Array<{
    stepReference: string
    policyDocumentId?: string
    policyDocumentTitle?: string
    policyDocumentVersion?: string
    totalDecisions: number
    escalatedCount: number
    escalationRate: number
    branchAgreementRate: number
  }>
  fallbackCauses: Array<{
    reason: string
    totalOccurrences: number
  }>
  aiEscalationReasons: Array<{
    decisionTitle: string
    stepReference: string
    promptName?: string
    promptVersion?: number | null
    reason: string
    createdAt?: string
  }>
}

export const useDecisionLogs = (filters: {
  accessToken: string
  timeframe?: DecisionTimeframe
  flowName?: string
  templateId?: string
  limit?: number
  offset?: number
}) => {
  const [data, setData] = useState<DecisionLogsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchDecisionLogs = useCallback(async () => {
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
      queryParams.set('limit', String(filters.limit || 100))
      queryParams.set('offset', String(filters.offset || 0))
      if (filters.flowName?.trim()) queryParams.set('flowName', filters.flowName.trim())
      if (filters.templateId?.trim()) queryParams.set('templateId', filters.templateId.trim())

      const response = await fetch(`${API_BASE}/decisions/logs?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${filters.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch decision logs: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const payload = result?.status === 'success' ? result.data : result
      const decisions = Array.isArray(payload?.entries) ? payload.entries : []
      setData({
        decisions,
        summary: {
          totalDecisions: Number(payload?.summary?.totalDecisions || 0),
          escalatedCount: Number(payload?.summary?.escalatedCount || 0),
          aiCount: Number(payload?.summary?.aiCount || 0),
          userCount: Number(payload?.summary?.userCount || 0),
          logicCount: Number(payload?.summary?.logicCount || 0),
          uniqueFlowInstances: Number(payload?.summary?.uniqueFlowInstances || 0)
        },
        flowOptions: Array.isArray(payload?.flowOptions) ? payload.flowOptions : [],
        pagination: {
          total: Number(payload?.pagination?.total || decisions.length),
          limit: Number(payload?.pagination?.limit || filters.limit || 100),
          offset: Number(payload?.pagination?.offset || filters.offset || 0),
          hasMore: Boolean(payload?.pagination?.hasMore)
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch decision logs'))
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [
    API_BASE,
    filters.accessToken,
    filters.flowName,
    filters.limit,
    filters.offset,
    filters.templateId,
    filters.timeframe
  ])

  useEffect(() => {
    fetchDecisionLogs()
  }, [fetchDecisionLogs])

  return {
    data,
    isLoading,
    error,
    refetch: fetchDecisionLogs
  }
}

export const useDecisionOptimizationAnalytics = (filters: {
  accessToken: string
  timeframe?: DecisionTimeframe
  flowName?: string
  templateId?: string
}) => {
  const [data, setData] = useState<DecisionOptimizationData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const API_BASE = getFlowEngineApiBaseUrl()

  const fetchDecisionOptimization = useCallback(async () => {
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
      if (filters.flowName?.trim()) queryParams.set('flowName', filters.flowName.trim())
      if (filters.templateId?.trim()) queryParams.set('templateId', filters.templateId.trim())

      const response = await fetch(`${API_BASE}/decisions/analytics?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${filters.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch decision optimization analytics: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      const payload = result?.status === 'success' ? result.data : result
      setData({
        summary: {
          totalDecisions: Number(payload?.summary?.totalDecisions || 0),
          aiDirectCount: Number(payload?.summary?.aiDirectCount || 0),
          aiEscalatedCount: Number(payload?.summary?.aiEscalatedCount || 0),
          userDirectCount: Number(payload?.summary?.userDirectCount || 0),
          logicDirectCount: Number(payload?.summary?.logicDirectCount || 0),
          humanOverrideCount: Number(payload?.summary?.humanOverrideCount || 0),
          promptExecutionCount: Number(payload?.summary?.promptExecutionCount || 0),
          promptLinkedCount: Number(payload?.summary?.promptLinkedCount || 0),
          policyLinkedCount: Number(payload?.summary?.policyLinkedCount || 0),
          branchAgreementRate: Number(payload?.summary?.branchAgreementRate || 0)
        },
        stepPerformance: Array.isArray(payload?.stepPerformance) ? payload.stepPerformance : [],
        promptVersions: Array.isArray(payload?.promptVersions) ? payload.promptVersions : [],
        policyVersions: Array.isArray(payload?.policyVersions) ? payload.policyVersions : [],
        fallbackCauses: Array.isArray(payload?.fallbackCauses)
          ? payload.fallbackCauses
          : Array.isArray(payload?.escalationReasons)
            ? payload.escalationReasons
            : [],
        aiEscalationReasons: Array.isArray(payload?.aiEscalationReasons) ? payload.aiEscalationReasons : []
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch decision optimization analytics'))
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [API_BASE, filters.accessToken, filters.flowName, filters.templateId, filters.timeframe])

  useEffect(() => {
    fetchDecisionOptimization()
  }, [fetchDecisionOptimization])

  return {
    data,
    isLoading,
    error,
    refetch: fetchDecisionOptimization
  }
}
