import { useState, useEffect, useCallback, useMemo } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { GET_TEAM_ABSENCE_NET_FOR_RANGE } from '../queries/queries'
import { TeamMember, TeamAbsenceToday, AbsenceNetEntry } from '../types/types'
import { toComparableDateKey, toLocalDateKey } from '../utils/timeUtils'
import {
  buildApprovedNonWorkTimeOffByEmployeeDate,
  expandDetailedAbsencesToCalendarDays,
  fetchTeamDetailedAbsences,
  fetchTeamHolidayData,
  getActiveLocale
} from '../utils/teamTimeDomain'

const filterMembersByHireDateOnOrBefore = (list: TeamMember[], referenceDate: Date): TeamMember[] => {
  const referenceKey = toLocalDateKey(referenceDate)
  return list.filter(member => {
    const hireDateKey = toComparableDateKey(member.hireDate)
    if (!hireDateKey) return true
    return hireDateKey <= referenceKey
  })
}

const getCalendarRange = (month: Date): { from: string; to: string } => {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0)
  const dow = monthStart.getDay()
  const calStart = new Date(monthStart)
  calStart.setDate(monthStart.getDate() - ((dow + 6) % 7))
  const calEnd = new Date(monthEnd)
  const endDow = monthEnd.getDay()
  if (endDow !== 0) calEnd.setDate(monthEnd.getDate() + (7 - endDow))
  return { from: toLocalDateKey(calStart), to: toLocalDateKey(calEnd) }
}

export interface UseDashboardForecastReturn {
  forecastAbsences: TeamAbsenceToday[]
  forecastHolidayDatesByEmployeeId: Map<string, Set<string>>
  forecastHolidayNamesByEmployeeId: Map<string, Record<string, string>>
  forecastTimeOffByEmployeeDate: Map<string, number>
  forecastLoading: boolean
  forecastMonth: Date
  forecastMonthLabel: string
  forecastMembers: TeamMember[]
  forecastMemberIds: string[]
  prevForecastMonth: () => void
  nextForecastMonth: () => void
}

export const useDashboardForecast = (
  accessToken: string | undefined,
  allMembers: TeamMember[]
): UseDashboardForecastReturn => {
  const graphqlClient = useGraphQLClient(accessToken)

  const [forecastAbsences, setForecastAbsences] = useState<TeamAbsenceToday[]>([])
  const [forecastHolidayDatesByEmployeeId, setForecastHolidayDatesByEmployeeId] = useState<Map<string, Set<string>>>(
    new Map()
  )
  const [forecastHolidayNamesByEmployeeId, setForecastHolidayNamesByEmployeeId] = useState<
    Map<string, Record<string, string>>
  >(new Map())
  const [forecastTimeOffByEmployeeDate, setForecastTimeOffByEmployeeDate] = useState<Map<string, number>>(new Map())
  const [forecastLoading, setForecastLoading] = useState(false)

  const [forecastMonth, setForecastMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })

  const forecastMonthEnd = useMemo(
    () => new Date(forecastMonth.getFullYear(), forecastMonth.getMonth() + 1, 0),
    [forecastMonth]
  )
  const forecastMembers = useMemo(
    () => filterMembersByHireDateOnOrBefore(allMembers, forecastMonthEnd),
    [allMembers, forecastMonthEnd]
  )
  const forecastMemberIds = useMemo(() => forecastMembers.map(member => member.id), [forecastMembers])

  const forecastMonthLabel = forecastMonth.toLocaleDateString(undefined, { year: 'numeric', month: 'long' })

  const prevForecastMonth = useCallback(() => {
    setForecastMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))
  }, [])
  const nextForecastMonth = useCallback(() => {
    setForecastMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))
  }, [])

  const fetchForecast = useCallback(async () => {
    if (!graphqlClient || forecastMemberIds.length === 0) {
      setForecastAbsences([])
      setForecastHolidayDatesByEmployeeId(new Map())
      setForecastHolidayNamesByEmployeeId(new Map())
      setForecastTimeOffByEmployeeDate(new Map())
      return
    }
    setForecastLoading(true)
    const { from, to } = getCalendarRange(forecastMonth)
    const locale = getActiveLocale()
    try {
      const [detailedAbsences, holidayData, absenceNetResult] = await Promise.all([
        fetchTeamDetailedAbsences(graphqlClient, forecastMemberIds, from, to, locale),
        fetchTeamHolidayData(graphqlClient, forecastMemberIds, from, to, locale),
        graphqlClient.request<any>(GET_TEAM_ABSENCE_NET_FOR_RANGE, {
          employeeIds: forecastMemberIds,
          from,
          to
        })
      ])

      const expandedForecastAbsences = expandDetailedAbsencesToCalendarDays(detailedAbsences, from, to)
      setForecastAbsences(expandedForecastAbsences)
      setForecastHolidayDatesByEmployeeId(holidayData.datesByEmployeeId)
      setForecastHolidayNamesByEmployeeId(holidayData.namesByEmployeeId)
      const absenceNetRows: AbsenceNetEntry[] = absenceNetResult?.DailyAbsenceNetView ?? []
      const dailyTimeOffFraction = buildApprovedNonWorkTimeOffByEmployeeDate(expandedForecastAbsences, absenceNetRows)
      setForecastTimeOffByEmployeeDate(dailyTimeOffFraction)
    } catch {
      setForecastTimeOffByEmployeeDate(new Map())
    } finally {
      setForecastLoading(false)
    }
  }, [graphqlClient, forecastMemberIds, forecastMonth])

  useEffect(() => {
    if (accessToken) fetchForecast()
  }, [accessToken, forecastMemberIds, fetchForecast])

  return {
    forecastAbsences,
    forecastHolidayDatesByEmployeeId,
    forecastHolidayNamesByEmployeeId,
    forecastTimeOffByEmployeeDate,
    forecastLoading,
    forecastMonth,
    forecastMonthLabel,
    forecastMembers,
    forecastMemberIds,
    prevForecastMonth,
    nextForecastMonth
  }
}
