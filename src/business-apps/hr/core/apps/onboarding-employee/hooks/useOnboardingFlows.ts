import { useCallback, useEffect, useMemo, useState } from 'react'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { FLOW_ENGINE_API_BASE, ONBOARDING_APP_TAG } from '../constants'

export interface OnboardingFlowItem {
  flowId: string
  workflowId?: string
  flowName: string
  templateId?: string
  templateName?: string
  status: string
  startTime?: string
  endTime?: string
  updateTime?: string
  progressPercentage?: number
  initiatedBy?: string
}

function normalizeFlowsResponse(raw: unknown): OnboardingFlowItem[] {
  const data = raw && typeof raw === 'object' && 'data' in raw ? (raw as { data?: { flows?: unknown[] } }).data : raw
  const flows =
    data && typeof data === 'object' && 'flows' in data && Array.isArray((data as { flows: unknown[] }).flows)
      ? (data as { flows: unknown[] }).flows
      : []
  return flows.map((f: any) => ({
    flowId: f.flowId || f.id || '',
    workflowId: f.workflowId || f.flowId,
    flowName: f.flowName || f.workflowName || 'Unknown',
    templateId: f.templateId,
    templateName: f.templateName || f.templateId,
    status: f.status || 'UNKNOWN',
    startTime: f.startTime,
    endTime: f.endTime,
    updateTime: f.updateTime,
    progressPercentage: f.progressPercentage,
    initiatedBy: f.initiatedBy
  }))
}

export type FlowStatusFilter = 'active' | 'completed'

const ACTIVE_STATUSES = ['RUNNING', 'IN_PROGRESS', 'SCHEDULED', 'PAUSED']
const COMPLETED_STATUS = 'COMPLETED'

export interface UseOnboardingFlowsResult {
  flows: OnboardingFlowItem[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
  statusFilter: FlowStatusFilter
  setStatusFilter: (f: FlowStatusFilter) => void
}

export function useOnboardingFlows(accessToken: string, userId: string | undefined): UseOnboardingFlowsResult {
  const client = useRestClient(FLOW_ENGINE_API_BASE)
  const headers = useMemo(() => ({ Authorization: `Bearer ${accessToken}` }), [accessToken])
  const [allFlows, setAllFlows] = useState<OnboardingFlowItem[]>([])
  const [loading, setLoading] = useState(!!userId)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<FlowStatusFilter>('active')

  const refetch = useCallback(async () => {
    if (!userId || !accessToken) return
    setLoading(true)
    setError(null)
    try {
      const res = await client.get<unknown>(`/flows/user/${userId}/initiated`, {
        headers,
        params: {
          'tag.app': ONBOARDING_APP_TAG,
          limit: 100,
          offset: 0
        }
      })
      setAllFlows(normalizeFlowsResponse(res ?? {}))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load flows')
      setAllFlows([])
    } finally {
      setLoading(false)
    }
  }, [accessToken, userId, client, headers])

  useEffect(() => {
    refetch()
  }, [refetch])

  const flows = useMemo(() => {
    if (statusFilter === 'active') {
      return allFlows.filter(f => ACTIVE_STATUSES.includes(f.status))
    }
    return allFlows.filter(f => f.status === COMPLETED_STATUS)
  }, [allFlows, statusFilter])

  return { flows, loading, error, refetch, statusFilter, setStatusFilter }
}
