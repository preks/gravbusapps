import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { flowbotClient, type EvalsDashboardQueryParams } from '@/common/network/flowbot/FlowbotClient'
import type { BucketGranularity, DashboardResponse } from '../types'

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : [])

const normalizeDashboardResponse = (raw: unknown): DashboardResponse => {
  const obj = (raw ?? {}) as Record<string, unknown>
  const distributions = (obj['distributions'] ?? {}) as Record<string, unknown>
  const quantiles = (v: unknown) => {
    const q = (v ?? {}) as Record<string, unknown>
    const p50Raw = q['p50']
    const p95Raw = q['p95']
    const p99Raw = q['p99']
    return {
      p50: typeof p50Raw === 'number' ? p50Raw : null,
      p95: typeof p95Raw === 'number' ? p95Raw : null,
      p99: typeof p99Raw === 'number' ? p99Raw : null
    }
  }

  const workflowRaw = obj['workflow']
  const includeSplitViewRaw = obj['include_split_view']
  const fromTsRaw = obj['from_ts']
  const toTsRaw = obj['to_ts']

  return {
    workflow: typeof workflowRaw === 'string' ? workflowRaw : null,
    include_split_view: typeof includeSplitViewRaw === 'boolean' ? includeSplitViewRaw : undefined,
    from_ts: typeof fromTsRaw === 'string' ? fromTsRaw : '',
    to_ts: typeof toTsRaw === 'string' ? toTsRaw : '',
    cards: asArray(obj['cards']),
    distributions: {
      total_ms: quantiles(distributions['total_ms']),
      ttft_ms: quantiles(distributions['ttft_ms']),
      total_tokens: quantiles(distributions['total_tokens'])
    },
    timeseries: asArray(obj['timeseries']),
    error_breakdown: asArray(obj['error_breakdown']),
    tool_breakdown: asArray(obj['tool_breakdown']),
    token_breakdown: (obj['token_breakdown'] as any) ?? undefined,
    tool_token_stats: (obj['tool_token_stats'] as any) ?? undefined,
    top_cost_runs: asArray(obj['top_cost_runs']),
    recent_runs: asArray(obj['recent_runs'])
  }
}

const dateFromDateInput = (value: string | undefined): string | undefined => {
  const v = (value || '').trim()
  if (!v) return undefined
  // Expect "YYYY-MM-DD" from <input type="date" />
  return v
}

const addOneDay = (yyyyMmDd?: string): string | undefined => {
  if (!yyyyMmDd) return undefined
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(yyyyMmDd)
  if (!match) return undefined

  const year = Number(match[1])
  const month = Number(match[2]) - 1
  const day = Number(match[3])
  const utcDate = new Date(Date.UTC(year, month, day))
  utcDate.setUTCDate(utcDate.getUTCDate() + 1)
  return utcDate.toISOString().slice(0, 10)
}

export interface DashboardFilters {
  workflow: string
  fromLocal: string
  toLocal: string
  bucket: BucketGranularity
  includeSplitView: boolean
}

export interface UseEvalsDashboardState {
  data: DashboardResponse | null
  isLoading: boolean
  error: string | null
  isEmpty: boolean
}

export function useEvalsDashboard(context: BusinessAppContextProps, filters: DashboardFilters) {
  const [state, setState] = useState<UseEvalsDashboardState>({
    data: null,
    isLoading: false,
    error: null,
    isEmpty: false
  })

  const queryParams = useMemo<EvalsDashboardQueryParams>(() => {
    const from_ts = dateFromDateInput(filters.fromLocal)
    const to_ts = addOneDay(dateFromDateInput(filters.toLocal))
    return {
      workflow: filters.workflow.trim() || undefined,
      from_ts,
      to_ts,
      bucket: filters.bucket,
      include_split_view: filters.includeSplitView ? true : undefined
    }
  }, [filters.bucket, filters.fromLocal, filters.includeSplitView, filters.toLocal, filters.workflow])

  const fetchDashboard = useCallback(async () => {
    if (!context.accessToken) {
      setState({ data: null, isLoading: false, error: 'Access token missing', isEmpty: false })
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, isEmpty: false }))
    try {
      flowbotClient.setAccessToken(context.accessToken)
      const raw = await flowbotClient.getEvalsDashboard<unknown>(queryParams)
      const data = normalizeDashboardResponse(raw)
      setState({ data, isLoading: false, error: null, isEmpty: false })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      // Flowbot uses 404 when no eval runs exist in the selected time range.
      if (typeof msg === 'string' && msg.includes('REST request failed: 404')) {
        setState({ data: null, isLoading: false, error: null, isEmpty: true })
        return
      }
      setState({ data: null, isLoading: false, error: msg, isEmpty: false })
    }
  }, [context.accessToken, queryParams])

  useEffect(() => {
    void fetchDashboard()
  }, [fetchDashboard])

  return { ...state, refetch: fetchDashboard }
}
