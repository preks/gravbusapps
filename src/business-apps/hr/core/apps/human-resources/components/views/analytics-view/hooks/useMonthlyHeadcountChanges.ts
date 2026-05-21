import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useQueryExecutionClient, Services } from '@/common/network/dataset'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useHrAnalyticsFilters } from '../context/HrAnalyticsFiltersContext'
import { fetchHeadcountMonthlyKpis } from './fetchHeadcountMonthlyKpis'

export interface MonthlyHeadcountChange {
  month: string // e.g. '2024-06'
  newHires: number
  departures: number
  netChange: number
}

type TimeseriesRow = {
  dateCategory?: string
  date_category?: string
  value?: number
  hires?: number
  exits?: number
  net_change?: number
  netChange?: number
  [key: string]: unknown
}

function buildMonthlyHeadcountFromRows(rows: TimeseriesRow[], year: number): MonthlyHeadcountChange[] {
  const months: MonthlyHeadcountChange[] = Array.from({ length: 12 }).map((_, m) => ({
    month: dayjs(`${year}-01-01`).add(m, 'month').format('YYYY-MM'),
    newHires: 0,
    departures: 0,
    netChange: 0
  }))

  const byMonth = new Map<string, MonthlyHeadcountChange>()
  months.forEach(m => byMonth.set(m.month, m))

  for (const row of rows) {
    const dateStr = row.dateCategory ?? row.date_category
    if (!dateStr) continue
    const ym = dayjs(dateStr).format('YYYY-MM')
    const target = byMonth.get(ym)
    if (!target) continue
    const hires = Number(row.hires ?? 0)
    const exits = Number(row.exits ?? 0)
    const netChange = Number(row.net_change ?? row.netChange ?? hires - exits)
    if (Number.isFinite(hires)) target.newHires = hires
    if (Number.isFinite(exits)) target.departures = exits
    if (Number.isFinite(netChange)) target.netChange = netChange
  }

  for (const m of months) {
    if (!m.netChange && (m.newHires || m.departures)) {
      m.netChange = m.newHires - m.departures
    }
  }

  return months
}

export const useMonthlyHeadcountChanges = (props: BusinessAppContextProps, year: number) => {
  const { selectedCompanyIds } = useHrAnalyticsFilters()
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
        const structureId = getCurrentActiveStructureId()
        const companyIdsParam = selectedCompanyIds.length > 0 ? selectedCompanyIds.join(',') : ''
        const filterParams: Record<string, string> = {}
        if (structureId) filterParams.structureId = structureId
        if (companyIdsParam) filterParams.companyIds = companyIdsParam
        const queryParams: Record<string, string> = { ...dateParams, ...filterParams }
        const cacheKey = `${props.accessToken}|headcountMonthlyKpis|${queryParams.startDate}|${queryParams.endDate}|${queryParams.structureId ?? ''}|${queryParams.companyIds ?? ''}`
        const monthlyKpisRes = await fetchHeadcountMonthlyKpis(datasetClient, cacheKey, queryParams)

        const rows = (monthlyKpisRes?.data ?? []) as TimeseriesRow[]
        const months = buildMonthlyHeadcountFromRows(rows, year)

        setData(months)
        setError(null)
      } catch (e) {
        setError(e)
      } finally {
        setLoading(false)
      }
    })()
  }, [props.accessToken, datasetClient, dateParams, year, selectedCompanyIds])

  return { data, loading, error }
}
