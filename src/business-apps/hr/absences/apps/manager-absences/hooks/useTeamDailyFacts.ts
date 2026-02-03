import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import {
  GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE,
  GET_TEAM_ABSENCE_DAILY_FACTS_BY_STATUS
} from '../queries/DailyFactsQueries'

export interface GroupDatum {
  code: string
  label: string
  color?: string
  value: number
}

export function useTeamDailyFactsByType(
  accessToken: string | undefined,
  employeeIds: string[] | undefined,
  from?: string,
  to?: string,
  mapType?: (code: string) => { label?: string; color?: string },
  statuses?: string[]
) {
  const client = useGraphqlClient(accessToken)
  const [data, setData] = useState<GroupDatum[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client || !employeeIds || employeeIds.length === 0) return
    const fromDate = from || dayjs().startOf('year').format('YYYY-MM-DD')
    const toDate = to || dayjs().endOf('year').format('YYYY-MM-DD')

    setLoading(true)
    setError(null)

    client
      .request<any>(GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE, {
        employeeIds,
        from: fromDate,
        to: toDate,
        statuses: statuses && statuses.length ? statuses : undefined
      })
      .then(res => {
        const rows: Array<{ typeRef: string; dayFraction: number }> = res?.DailyAbsenceFactView || []
        const grouped: Record<string, number> = {}
        rows.forEach(r => {
          const key = r.typeRef || 'UNKNOWN'
          grouped[key] = (grouped[key] || 0) + (Number(r.dayFraction) || 0)
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
  }, [
    client,
    Array.isArray(employeeIds) ? employeeIds.join(',') : '',
    from,
    to,
    mapType,
    Array.isArray(statuses) ? statuses.join(',') : ''
  ])

  return useMemo(() => ({ data, loading, error }), [data, loading, error])
}

export function useTeamDailyFactsByStatus(
  accessToken: string | undefined,
  employeeIds: string[] | undefined,
  from?: string,
  to?: string
) {
  const client = useGraphqlClient(accessToken)
  const [data, setData] = useState<GroupDatum[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client || !employeeIds || employeeIds.length === 0) return
    const fromDate = from || dayjs().startOf('year').format('YYYY-MM-DD')
    const toDate = to || dayjs().endOf('year').format('YYYY-MM-DD')

    setLoading(true)
    setError(null)

    client
      .request<any>(GET_TEAM_ABSENCE_DAILY_FACTS_BY_STATUS, {
        employeeIds,
        from: fromDate,
        to: toDate
      })
      .then(res => {
        const rows: Array<{ status: string; dayFraction: number }> = res?.DailyAbsenceFactView || []
        const grouped: Record<string, number> = {}
        rows.forEach(r => {
          const key = r.status || 'UNKNOWN'
          grouped[key] = (grouped[key] || 0) + (Number(r.dayFraction) || 0)
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
  }, [client, Array.isArray(employeeIds) ? employeeIds.join(',') : '', from, to])

  return useMemo(() => ({ data, loading, error }), [data, loading, error])
}
