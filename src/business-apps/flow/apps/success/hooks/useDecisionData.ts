import { useCallback, useEffect, useState } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'

export type DecisionTimeframe = 'last24h' | 'wtd' | 'mtd' | 'qtd' | 'ytd'

export interface DecisionLogEntry {
  id?: string
  flowId: string
  templateId: string
  stepReference: string
  decisionMode: string
  decidedBy: string
  decisionInput: Record<string, unknown>
  decisionOutput: Record<string, unknown>
  selectedBranch: string
  escalated: boolean
  escalationReason?: string
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

export const useDecisionLogs = (filters: {
  accessToken: string
  timeframe?: DecisionTimeframe
  flowName?: string
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
      const decisions = Array.isArray(result?.entries) ? result.entries : []
      setData({
        decisions,
        summary: {
          totalDecisions: Number(result?.summary?.totalDecisions || 0),
          escalatedCount: Number(result?.summary?.escalatedCount || 0),
          aiCount: Number(result?.summary?.aiCount || 0),
          userCount: Number(result?.summary?.userCount || 0),
          logicCount: Number(result?.summary?.logicCount || 0),
          uniqueFlowInstances: Number(result?.summary?.uniqueFlowInstances || 0)
        },
        flowOptions: Array.isArray(result?.flowOptions) ? result.flowOptions : [],
        pagination: {
          total: Number(result?.pagination?.total || decisions.length),
          limit: Number(result?.pagination?.limit || filters.limit || 100),
          offset: Number(result?.pagination?.offset || filters.offset || 0),
          hasMore: Boolean(result?.pagination?.hasMore)
        }
      })
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch decision logs'))
      setData(null)
    } finally {
      setIsLoading(false)
    }
  }, [API_BASE, filters.accessToken, filters.flowName, filters.limit, filters.offset, filters.timeframe])

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
