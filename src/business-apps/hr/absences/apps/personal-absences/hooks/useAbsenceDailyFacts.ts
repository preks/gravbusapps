import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_ABSENCE_DAILY_FACTS_BY_TYPE, GET_ABSENCE_DAILY_FACTS_BY_STATUS } from '../queries/graphql'

export interface GroupDatum {
  code: string
  label: string
  color?: string
  value: number
}

export function useDailyFactsByType(
  accessToken?: string,
  employeeId?: string,
  from?: string,
  to?: string,
  mapType?: (code: string) => { label?: string; color?: string },
  statuses?: string[]
) {
  const client = useGraphQLClient(accessToken)
  const [data, setData] = useState<GroupDatum[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client || !employeeId) return
    const fromDate = from || dayjs().startOf('month').format('YYYY-MM-DD')
    const toDate = to || dayjs().endOf('month').format('YYYY-MM-DD')

    setLoading(true)
    setError(null)

    client
      .request<any>(GET_ABSENCE_DAILY_FACTS_BY_TYPE, {
        employeeId,
        from: fromDate,
        to: toDate,
        statuses: statuses?.length ? statuses : undefined
      })
      .then(res => {
        const rows: Array<{ typeRef: string; dayFraction?: number; signedDayFraction?: number }> =
          res?.DailyAbsenceFactView || res?.daily_absence_fact_view || []

        const grouped: Record<string, number> = {}
        rows.forEach(r => {
          const key = r.typeRef || 'UNKNOWN'
          const v = Number((r as any).signedDayFraction ?? r.dayFraction) || 0
          grouped[key] = (grouped[key] || 0) + v
        })

        const mapped: GroupDatum[] = Object.entries(grouped).map(([code, value]) => {
          const mapped = mapType ? mapType(code) : undefined
          return {
            code,
            label: mapped?.label || code,
            color: mapped?.color,
            value
          }
        })
        setData(mapped)
      })
      .catch(err => setError(err as Error))
      .finally(() => setLoading(false))
  }, [client, employeeId, from, to, mapType, Array.isArray(statuses) ? statuses.join(',') : ''])

  return useMemo(() => ({ data, loading, error }), [data, loading, error])
}

export function useDailyFactsByStatus(accessToken?: string, employeeId?: string, from?: string, to?: string) {
  const client = useGraphQLClient(accessToken)
  const [data, setData] = useState<GroupDatum[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client || !employeeId) return
    const fromDate = from || dayjs().startOf('month').format('YYYY-MM-DD')
    const toDate = to || dayjs().endOf('month').format('YYYY-MM-DD')

    setLoading(true)
    setError(null)

    client
      .request<any>(GET_ABSENCE_DAILY_FACTS_BY_STATUS, {
        employeeId,
        from: fromDate,
        to: toDate
      })
      .then(res => {
        const rows: Array<{ status: string; dayFraction?: number; signedDayFraction?: number }> =
          res?.DailyAbsenceFactView || res?.daily_absence_fact_view || []

        const grouped: Record<string, number> = {}
        rows.forEach(r => {
          const key = r.status || 'UNKNOWN'
          const v = Number((r as any).signedDayFraction ?? r.dayFraction) || 0
          grouped[key] = (grouped[key] || 0) + v
        })

        const mapped: GroupDatum[] = Object.entries(grouped).map(([code, value]) => ({
          code,
          label: code,
          value
        }))
        setData(mapped)
      })
      .catch(err => setError(err as Error))
      .finally(() => setLoading(false))
  }, [client, employeeId, from, to])

  return useMemo(() => ({ data, loading, error }), [data, loading, error])
}
