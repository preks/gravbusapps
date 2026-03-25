import { useCallback, useEffect, useState } from 'react'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import type { SuccessTimeframe } from '../utils/timeframe'

export interface GuardianVelocityInsightsData {
  overview: {
    kpis: {
      throughputPerDay: number
      wipActive: number
      cycleTimeMedianMinutes: number
      cycleTimeP90Minutes: number
      slaAdherencePercent: number
      atRiskCount: number
      slaBreaches: number
    }
    deltas?: Partial<Record<string, number>>
  }
  timeseries: Array<{
    bucketStart: string
    throughputCompleted: number
    wipActive: number
    cycleTimeMedianMinutes: number
    cycleTimeP90Minutes: number
    slaBreaches: number
  }>
  bottlenecks: Array<{
    key: string
    templateId?: string
    templateName?: string
    stepName: string
    orgUnit?: string
    avgTimeInStepMinutes: number
    avgQueueMinutes?: number
    affectedCount: number
    impactScore: number
  }>
  slaRisk: Array<{
    flowId: string
    templateId?: string
    templateName?: string
    stepName?: string
    orgUnit?: string
    riskScore: number
    reasons: Array<{ code: string; message: string }>
    etaToBreachMinutes?: number
    lastActivityTime?: string
  }>
}

export const useGuardianVelocityInsights = (filters: {
  accessToken: string
  timeframe?: SuccessTimeframe
  templateId?: string
}) => {
  const API_BASE = getFlowEngineApiBaseUrl()
  const [data, setData] = useState<GuardianVelocityInsightsData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchInsights = useCallback(async () => {
    if (!filters.accessToken) {
      setData(null)
      setError(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const queryParams = new URLSearchParams()
      queryParams.set('timeframe', filters.timeframe || 'mtd')
      if (filters.templateId && filters.templateId !== 'ALL') queryParams.set('templateId', filters.templateId)

      const response = await fetch(`${API_BASE}/analytics/guardian/velocity?${queryParams.toString()}`, {
        headers: {
          Authorization: `Bearer ${filters.accessToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch velocity insights: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      if (result?.status === 'success' && result.data) {
        setData(result.data)
      } else {
        throw new Error(result?.message || 'Invalid velocity insights response')
      }
    } catch (nextError) {
      setData(null)
      setError(nextError instanceof Error ? nextError : new Error('Failed to fetch velocity insights'))
    } finally {
      setIsLoading(false)
    }
  }, [API_BASE, filters.accessToken, filters.templateId, filters.timeframe])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  return {
    data,
    isLoading,
    error,
    refetch: fetchInsights
  }
}
