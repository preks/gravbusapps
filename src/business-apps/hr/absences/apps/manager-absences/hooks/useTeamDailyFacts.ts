import { useEffect, useMemo, useState } from 'react'
import dayjs from 'dayjs'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE,
  GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE_FACT,
  GET_TEAM_ABSENCE_REQUESTS_BY_TYPE,
  GET_TEAM_ABSENCE_DAILY_FACTS_BY_STATUS
} from '../queries/DailyFactsQueries'

export interface GroupDatum {
  code: string
  label: string
  color?: string
  value: number
  parentEntryId?: string
}

interface MonthlyGroupData {
  barChartData: Array<{ month: string; [key: string]: string | number }>
  groupColors: { [key: string]: string }
  totalAbsenceDays: number
}

export type TeamDailyFactsSource = 'net' | 'fact' | 'request'

const MONTH_I18N_KEYS = [
  'lowcoder:absence_report.employee_table.january',
  'lowcoder:absence_report.employee_table.february',
  'lowcoder:absence_report.employee_table.march',
  'lowcoder:absence_report.employee_table.april',
  'lowcoder:absence_report.employee_table.may',
  'lowcoder:absence_report.employee_table.june',
  'lowcoder:absence_report.employee_table.july',
  'lowcoder:absence_report.employee_table.august',
  'lowcoder:absence_report.employee_table.september',
  'lowcoder:absence_report.employee_table.october',
  'lowcoder:absence_report.employee_table.november',
  'lowcoder:absence_report.employee_table.december'
]

const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

const getMonthLabels = (): string[] =>
  MONTH_I18N_KEYS.map((key, index) => getTranslationFromI18nKeyAndLabel(key, MONTH_LABELS[index]))

const DATE_PREFIX_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/

const getMonthIndexFromDateValue = (value?: string): number | null => {
  if (!value) {
    return null
  }

  const normalized = String(value).trim()
  const match = DATE_PREFIX_PATTERN.exec(normalized)
  if (match) {
    const month = Number(match[2])
    if (!Number.isNaN(month) && month >= 1 && month <= 12) {
      return month - 1
    }
  }

  const parsed = dayjs(normalized)
  if (!parsed.isValid()) {
    return null
  }

  return parsed.month()
}

export function useTeamDailyFactsByType(
  accessToken: string | undefined,
  employeeIds: string[] | undefined,
  from?: string,
  to?: string,
  mapType?: (code: string) => { label?: string; color?: string; parentEntryId?: string },
  statuses?: string[],
  source: TeamDailyFactsSource = 'net'
) {
  const client = useGraphQLClient(accessToken)
  const [data, setData] = useState<GroupDatum[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client || !employeeIds || employeeIds.length === 0) return
    const fromDate = from || dayjs().startOf('year').format('YYYY-MM-DD')
    const toDate = to || dayjs().endOf('year').format('YYYY-MM-DD')

    setLoading(true)
    setError(null)

    const query =
      source === 'fact'
        ? GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE_FACT
        : source === 'request'
          ? GET_TEAM_ABSENCE_REQUESTS_BY_TYPE
          : GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE
    const variables =
      source === 'fact'
        ? {
            employeeIds,
            from: fromDate,
            to: toDate,
            statuses: statuses?.length ? statuses : ['APPROVED']
          }
        : source === 'request'
          ? {
              employeeIds,
              from: `${fromDate} 00:00:00+00`,
              to: `${toDate} 23:59:59+00`,
              statuses: statuses?.length ? statuses : ['APPROVED']
            }
          : {
              employeeIds,
              from: fromDate,
              to: toDate
            }

    client
      .request<any>(query, variables)
      .then(res => {
        const rows: Array<{
          typeRef: string
          startDate?: string
          endDate?: string
          createdAt?: string
          type?: {
            isDeleted?: boolean
          }
          effectiveDays?: number
          workingDays?: number
          calendarDays?: number
          netSignedEps?: number
          netConsumed?: number
          signedDayFraction?: number
          dayFraction?: number
        }> =
          source === 'fact'
            ? res?.DailyAbsenceFactView || res?.daily_absence_fact_view || []
            : source === 'request'
              ? res?.EmployeeAbsence || res?.employee_absence || []
              : res?.DailyAbsenceNetView || res?.daily_absence_net_view || []
        const grouped: Record<string, number> = {}
        rows.forEach(r => {
          if (source === 'request' && r.type?.isDeleted) {
            return
          }
          const key = r.typeRef || 'UNKNOWN'
          const rawValue =
            source === 'fact'
              ? Number((r as any).signedDayFraction ?? (r as any).dayFraction) || 0
              : source === 'request'
                ? Number((r as any).effectiveDays ?? (r as any).workingDays ?? (r as any).calendarDays) || 0
                : Number(r.netSignedEps ?? r.netConsumed) || 0
          const value = source === 'net' ? Math.max(0, rawValue) : rawValue
          grouped[key] = (grouped[key] || 0) + value
        })

        const mapped: GroupDatum[] = Object.entries(grouped)
          .map(([code, rawValue]) => [code, Number(rawValue) || 0] as const)
          .filter(([, value]) => value > 0)
          .map(([code, value]) => {
            const mapped = mapType ? mapType(code) : undefined
            return {
              code,
              label: mapped?.label || code,
              color: mapped?.color,
              value,
              parentEntryId: mapped?.parentEntryId
            }
          })
          .sort((left, right) => right.value - left.value)
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
    Array.isArray(statuses) ? statuses.join(',') : '',
    source
  ])

  return useMemo(() => ({ data, loading, error }), [data, loading, error])
}

export function useTeamDailyFactsByStatus(
  accessToken: string | undefined,
  employeeIds: string[] | undefined,
  from?: string,
  to?: string
) {
  const client = useGraphQLClient(accessToken)
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
        const rows: Array<{ status: string; dayFraction?: number; signedDayFraction?: number }> =
          res?.DailyAbsenceFactView || res?.daily_absence_fact_view || []
        const grouped: Record<string, number> = {}
        rows.forEach(r => {
          const key = r.status || 'UNKNOWN'
          const value = Number((r as any).signedDayFraction ?? r.dayFraction) || 0
          grouped[key] = (grouped[key] || 0) + value
        })

        const mapped: GroupDatum[] = Object.entries(grouped).map(([code, rawValue]) => ({
          code,
          label: code,
          value: Math.abs(Number(rawValue) || 0)
        }))
        setData(mapped)
      })
      .catch(err => setError(err as Error))
      .finally(() => setLoading(false))
  }, [client, Array.isArray(employeeIds) ? employeeIds.join(',') : '', from, to])

  return useMemo(() => ({ data, loading, error }), [data, loading, error])
}

export function useTeamDailyFactsByTypeMonthly(
  accessToken: string | undefined,
  employeeIds: string[] | undefined,
  from?: string,
  to?: string,
  mapType?: (code: string) => { label?: string; color?: string; parentEntryId?: string },
  statuses?: string[],
  source: TeamDailyFactsSource = 'net'
) {
  const client = useGraphQLClient(accessToken)
  const [data, setData] = useState<MonthlyGroupData>({
    barChartData: [],
    groupColors: {},
    totalAbsenceDays: 0
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    if (!client || !employeeIds || employeeIds.length === 0) return
    const fromDate = from || dayjs().startOf('year').format('YYYY-MM-DD')
    const toDate = to || dayjs().endOf('year').format('YYYY-MM-DD')

    setLoading(true)
    setError(null)

    const query =
      source === 'fact'
        ? GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE_FACT
        : source === 'request'
          ? GET_TEAM_ABSENCE_REQUESTS_BY_TYPE
          : GET_TEAM_ABSENCE_DAILY_FACTS_BY_TYPE
    const variables =
      source === 'fact'
        ? {
            employeeIds,
            from: fromDate,
            to: toDate,
            statuses: statuses?.length ? statuses : ['APPROVED']
          }
        : source === 'request'
          ? {
              employeeIds,
              from: `${fromDate} 00:00:00+00`,
              to: `${toDate} 23:59:59+00`,
              statuses: statuses?.length ? statuses : ['APPROVED']
            }
          : {
              employeeIds,
              from: fromDate,
              to: toDate
            }

    client
      .request<any>(query, variables)
      .then(res => {
        const rows: Array<{
          typeRef: string
          dayDate?: string
          startDate?: string
          endDate?: string
          createdAt?: string
          type?: {
            isDeleted?: boolean
          }
          effectiveDays?: number
          workingDays?: number
          calendarDays?: number
          netSignedEps?: number
          netConsumed?: number
          signedDayFraction?: number
          dayFraction?: number
        }> =
          source === 'fact'
            ? res?.DailyAbsenceFactView || res?.daily_absence_fact_view || []
            : source === 'request'
              ? res?.EmployeeAbsence || res?.employee_absence || []
              : res?.DailyAbsenceNetView || res?.daily_absence_net_view || []

        const monthLabels = getMonthLabels()
        const monthTotalsByType: Record<number, Record<string, number>> = {}
        const groupColors: Record<string, string> = {}
        let totalAbsenceDays = 0

        rows.forEach(row => {
          if (source === 'request' && row.type?.isDeleted) {
            return
          }
          const rawValue =
            source === 'fact'
              ? Number((row as any).signedDayFraction ?? (row as any).dayFraction) || 0
              : source === 'request'
                ? Number((row as any).effectiveDays ?? (row as any).workingDays ?? (row as any).calendarDays) || 0
                : Number(row.netSignedEps ?? row.netConsumed) || 0
          const value = source === 'net' ? Math.max(0, rawValue) : rawValue
          if (value === 0) {
            return
          }

          const monthAnchor =
            source === 'request'
              ? (row.startDate as string | undefined) ||
                (row.endDate as string | undefined) ||
                (row.createdAt as string | undefined)
              : row.dayDate
          const monthIndex = getMonthIndexFromDateValue(monthAnchor)
          if (monthIndex === null) {
            return
          }
          const mapped = mapType ? mapType(row.typeRef || 'UNKNOWN') : undefined
          const label = mapped?.label || row.typeRef || 'UNKNOWN'

          totalAbsenceDays += value
          if (!monthTotalsByType[monthIndex]) {
            monthTotalsByType[monthIndex] = {}
          }
          monthTotalsByType[monthIndex][label] = (monthTotalsByType[monthIndex][label] || 0) + value

          if (mapped?.color && !groupColors[label]) {
            groupColors[label] = mapped.color
          }
        })

        const barChartData = monthLabels.map((month, index) => ({
          month,
          ...(monthTotalsByType[index] || {})
        }))

        setData({
          barChartData,
          groupColors,
          totalAbsenceDays: Math.round(totalAbsenceDays * 10) / 10
        })
      })
      .catch(err => setError(err as Error))
      .finally(() => setLoading(false))
  }, [
    client,
    Array.isArray(employeeIds) ? employeeIds.join(',') : '',
    from,
    to,
    mapType,
    Array.isArray(statuses) ? statuses.join(',') : '',
    source
  ])

  return useMemo(() => ({ data, loading, error }), [data, loading, error])
}
