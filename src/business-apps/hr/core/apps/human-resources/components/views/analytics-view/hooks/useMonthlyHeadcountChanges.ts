import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useQueryExecutionClient, QueryType, Services } from '@/common/network/dataset'

export interface MonthlyHeadcountChange {
  month: string // e.g. '2024-06'
  newHires: number
  departures: number
  netChange: number
}

export const useMonthlyHeadcountChanges = (props: BusinessAppContextProps, year: number) => {
  const [data, setData] = useState<MonthlyHeadcountChange[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<any>(null)
  const datasetClient = useQueryExecutionClient(props.accessToken, Services.EMPLOYEE)

  const dateParams = useMemo(() => {
    const startDate = dayjs(`${year}-01-01`).startOf('year').format('YYYY-MM-DD')
    // For forecasting charts we want a full-year horizon; future months will naturally be 0.
    const endDate = dayjs(`${year}-12-31`).endOf('year').format('YYYY-MM-DD')
    return { startDate, endDate }
  }, [year])

  useEffect(() => {
    if (!props.accessToken) return

    setLoading(true)
    ;(async () => {
      try {
        // Reuse the same data sources as Workforce Analytics → Monthly Hires & Departures
        const [hiresRes, exitsRes, netChangeRes] = await Promise.all([
          datasetClient.executeQuery('hiresPerMonth', QueryType.TIMESERIES, dateParams),
          datasetClient.executeQuery('exitsPerMonth', QueryType.TIMESERIES, dateParams),
          datasetClient.executeQuery('netHeadcountChange', QueryType.TIMESERIES, dateParams)
        ])

        type TimeseriesRow = {
          dateCategory?: string
          date_category?: string
          value?: number
          [key: string]: any
        }

        const months: MonthlyHeadcountChange[] = Array.from({ length: 12 }).map((_, m) => ({
          month: dayjs(`${year}-01-01`).add(m, 'month').format('YYYY-MM'),
          newHires: 0,
          departures: 0,
          netChange: 0
        }))

        const byMonth = new Map<string, MonthlyHeadcountChange>()
        months.forEach(m => byMonth.set(m.month, m))

        const apply = (rows: TimeseriesRow[], key: 'newHires' | 'departures' | 'netChange') => {
          for (const r of rows) {
            const dateStr = r.dateCategory ?? r.date_category
            if (!dateStr) continue
            const ym = dayjs(dateStr).format('YYYY-MM')
            const target = byMonth.get(ym)
            if (!target) continue
            const v = Number(r.value ?? 0)
            if (!Number.isFinite(v)) continue
            target[key] = v
          }
        }

        apply((hiresRes?.data ?? []) as TimeseriesRow[], 'newHires')
        apply((exitsRes?.data ?? []) as TimeseriesRow[], 'departures')
        apply((netChangeRes?.data ?? []) as TimeseriesRow[], 'netChange')

        // Fallback: if netChange query returns nothing, compute it
        for (const m of months) {
          if (!m.netChange && (m.newHires || m.departures)) {
            m.netChange = m.newHires - m.departures
          }
        }

        setData(months)
        setError(null)
      } catch (e) {
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [props.accessToken, datasetClient, dateParams, year])

  return { data, loading, error }
}
