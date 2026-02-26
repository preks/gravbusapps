import { useCallback, useEffect, useMemo, useState } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { flowbotClient, type EvalsDashboardQueryParams } from '@/common/network/flowbot/FlowbotClient'
import type { BucketGranularity, DashboardResponse } from '../types'

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
      bucket: filters.bucket
    }
  }, [filters.bucket, filters.fromLocal, filters.toLocal, filters.workflow])

  const fetchDashboard = useCallback(async () => {
    if (!context.accessToken) {
      setState({ data: null, isLoading: false, error: 'Access token missing', isEmpty: false })
      return
    }

    setState(prev => ({ ...prev, isLoading: true, error: null, isEmpty: false }))
    try {
      flowbotClient.setAccessToken(context.accessToken)
      const data = await flowbotClient.getEvalsDashboard<DashboardResponse>(queryParams)
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
