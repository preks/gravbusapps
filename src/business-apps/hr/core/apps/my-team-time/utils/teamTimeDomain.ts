import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { employmentRegionHolidaysQuery } from '@/business-apps/hr/core/apps/employee-record/queries/attendanceQueries'
import { GET_TEAM_ABSENCE_DETAILS_FOR_RANGE, GET_TEAM_MEMBER_REGIONS } from '../queries/queries'
import type {
  AbsenceNetEntry,
  MonthOvertimeRow,
  PeriodSummary,
  TeamAbsenceToday,
  TeamAttendanceEntry,
  TeamMember
} from '../types/types'
import { getPlannedMinutesForDate, parseDurationToMinutes, toLocalDateKey } from './timeUtils'

export const WORK_ABSENCE_GROUP = 'AbsenceGroup:v1:WORK'
export const HEALTH_ABSENCE_GROUP = 'AbsenceGroup:v1:HEALTH'
export const VACATION_ABSENCE_GROUP = 'AbsenceGroup:v1:RECR'

type GraphqlClient = {
  request<T>(query: string, variables?: Record<string, unknown>): Promise<T>
}

interface HolidayCatalogEntry {
  alternativeCode?: string
  code?: string
  additionalValue3?: string
  translations?: Array<{ value?: string }>
  value?: string
}

interface TeamMemberRegionRow {
  id: string
  workingCondition?: Array<{
    activeFrom?: string | null
    activeTo?: string | null
    region?: {
      id?: string
    }
  }>
}

interface TeamAbsenceDetailsResult {
  EmployeeAbsence?: Array<{
    id: string
    employeeId: string
    startDate: string
    endDate: string
    status: string
    typeRef?: string
    effectiveDays?: number
    workingDays?: number
    calendarDays?: number
    type?: {
      value?: string
      parentEntryId?: string
      translations?: Array<{ value?: string }>
    }
    employee?: {
      firstName?: string
      lastName?: string
      pictureThumbnail?: string
    }
  }>
}

interface TeamMemberRegionsResult {
  Employee?: TeamMemberRegionRow[]
}

interface HolidaysResult {
  holidays?: HolidayCatalogEntry[]
}

export interface TeamDetailedAbsence {
  id: string
  employeeId: string
  employeeName: string
  pictureThumbnail?: string
  startDate: string
  endDate: string
  status: string
  typeRef: string
  typeLabel: string
  parentEntryId?: string
  effectiveDays: number
  workingDays: number
  calendarDays: number
}

export interface TeamHolidayData {
  datesByEmployeeId: Map<string, Set<string>>
  namesByEmployeeId: Map<string, Record<string, string>>
}

const toDateKey = (value: Date | string): string => {
  if (value instanceof Date) {
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`
  }

  const normalized = String(value).trim()
  // Accept both plain date and timestamp inputs (e.g. 2026-04-07 or 2026-04-07T00:00:00).
  const datePrefix = /^(\d{4})-(\d{2})-(\d{2})/.exec(normalized)
  if (datePrefix) {
    return `${datePrefix[1]}-${datePrefix[2]}-${datePrefix[3]}`
  }

  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  return `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`
}

const toLocalDate = (value: string): Date => new Date(`${value}T00:00:00`)

const toRangeBoundaryTimestamp = (dateKey: string, boundary: 'start' | 'end'): string => {
  return boundary === 'start' ? `${dateKey}T00:00:00.000` : `${dateKey}T23:59:59.999`
}

const isDateWithinRange = (dateKey: string, from: string, to: string): boolean => dateKey >= from && dateKey <= to

export const getActiveLocale = (): string => getCurrentActiveUserLocale() || 'en-US'

const getActiveWorkingCondition = <T extends { activeFrom?: string | null; activeTo?: string | null }>(
  workingConditions: T[] | undefined,
  targetDate = new Date()
): T | undefined => {
  if (!workingConditions?.length) {
    return undefined
  }

  if (workingConditions.length === 1) {
    return workingConditions[0]
  }

  const targetDateKey = toDateKey(targetDate)

  return workingConditions.find(condition => {
    const activeFromKey = condition.activeFrom ? toDateKey(condition.activeFrom) : ''
    const activeToKey = condition.activeTo ? toDateKey(condition.activeTo) : ''

    if (!activeFromKey) {
      return false
    }

    const startsOnOrBeforeTarget = activeFromKey <= targetDateKey
    const endsOnOrAfterTarget = !activeToKey || activeToKey >= targetDateKey

    return startsOnOrBeforeTarget && endsOnOrAfterTarget
  })
}

export const expandDateRange = (startDate: string, endDate: string, from: string, to: string): string[] => {
  const dates: string[] = []
  const start = toLocalDate(startDate)
  const end = toLocalDate(endDate)

  for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
    const dateKey = toDateKey(cursor)
    if (isDateWithinRange(dateKey, from, to)) {
      dates.push(dateKey)
    }
  }

  return dates
}

export const isWorkAbsence = (absence?: Pick<TeamDetailedAbsence, 'parentEntryId' | 'typeRef'> | null): boolean => {
  if (!absence) return false

  if (absence.parentEntryId === WORK_ABSENCE_GROUP) {
    return true
  }

  const upperRef = (absence.typeRef || '').toUpperCase()
  return upperRef.includes('REMOTE') || upperRef.includes('BUSINESS_TRIP')
}

export const isSickAbsence = (absence?: Pick<TeamDetailedAbsence, 'parentEntryId' | 'typeRef'> | null): boolean => {
  if (!absence) return false

  if (absence.parentEntryId === HEALTH_ABSENCE_GROUP) {
    return true
  }

  const upperRef = (absence.typeRef || '').toUpperCase()
  return upperRef.includes('SICK') || upperRef.includes('ILLNESS')
}

export const isVacationAbsence = (absence?: Pick<TeamDetailedAbsence, 'parentEntryId' | 'typeRef'> | null): boolean => {
  if (!absence) return false

  if (absence.parentEntryId === VACATION_ABSENCE_GROUP) {
    return true
  }

  const upperRef = (absence.typeRef || '').toUpperCase()
  return upperRef.includes('VACATION') || upperRef.includes('HOLIDAY') || upperRef.includes('RECREATION')
}

export const getApprovedAbsencesForDate = (
  absences: TeamDetailedAbsence[],
  employeeId: string,
  dateKey: string
): TeamDetailedAbsence[] =>
  absences.filter(
    absence =>
      absence.employeeId === employeeId &&
      absence.status === 'APPROVED' &&
      isDateWithinRange(dateKey, absence.startDate, absence.endDate)
  )

const getEmployeeDateKey = (employeeId: string, dayDate: string): string => `${employeeId}:${dayDate}`

export const expandDetailedAbsencesToCalendarDays = (
  absences: TeamDetailedAbsence[],
  from: string,
  to: string
): TeamAbsenceToday[] =>
  absences.flatMap(absence =>
    expandDateRange(absence.startDate, absence.endDate, from, to).map(dayDate => ({
      employeeId: absence.employeeId,
      typeRef: absence.typeRef,
      status: absence.status,
      dayDate,
      employeeAbsenceId: absence.id,
      typeLabel: absence.typeLabel,
      parentEntryId: absence.parentEntryId,
      startDate: absence.startDate,
      endDate: absence.endDate,
      employeeName: absence.employeeName,
      pictureThumbnail: absence.pictureThumbnail
    }))
  )

export const buildApprovedNonWorkTimeOffByEmployeeDate = (
  expandedAbsences: TeamAbsenceToday[],
  absenceNetRows: AbsenceNetEntry[]
): Map<string, number> => {
  const nonWorkAbsenceDayKeys = new Set(
    expandedAbsences
      .filter(absence => absence.status === 'APPROVED' && !isWorkAbsence(absence))
      .map(absence => getEmployeeDateKey(absence.employeeId, absence.dayDate))
  )

  const dailyTimeOffFraction = new Map<string, number>()
  absenceNetRows.forEach(row => {
    const dayKey = getEmployeeDateKey(row.employeeId, row.dayDate)
    if (!nonWorkAbsenceDayKeys.has(dayKey)) {
      return
    }

    const value = Number(row.netSignedEps ?? row.netConsumed) || 0
    if (value <= 0) {
      return
    }

    dailyTimeOffFraction.set(dayKey, Math.min(1, (dailyTimeOffFraction.get(dayKey) ?? 0) + value))
  })

  nonWorkAbsenceDayKeys.forEach(dayKey => {
    if (!dailyTimeOffFraction.has(dayKey)) {
      dailyTimeOffFraction.set(dayKey, 1)
    }
  })

  return dailyTimeOffFraction
}

export const getTimeOffFractionForEmployeeDate = (
  dailyTimeOffFraction: Map<string, number>,
  employeeId: string,
  dayDate: string
): number => Math.min(1, dailyTimeOffFraction.get(getEmployeeDateKey(employeeId, dayDate)) ?? 0)

export const fetchTeamDetailedAbsences = async (
  graphqlClient: GraphqlClient,
  employeeIds: string[],
  from: string,
  to: string,
  locale = getActiveLocale()
): Promise<TeamDetailedAbsence[]> => {
  if (employeeIds.length === 0) {
    return []
  }

  const result = await graphqlClient.request<TeamAbsenceDetailsResult>(GET_TEAM_ABSENCE_DETAILS_FOR_RANGE, {
    employeeIds,
    from: toRangeBoundaryTimestamp(from, 'start'),
    to: toRangeBoundaryTimestamp(to, 'end'),
    activeUserLocale: locale
  })

  return (result.EmployeeAbsence ?? []).map(absence => ({
    id: absence.id,
    employeeId: absence.employeeId,
    employeeName: `${absence.employee?.firstName ?? ''} ${absence.employee?.lastName ?? ''}`.trim(),
    pictureThumbnail: absence.employee?.pictureThumbnail,
    startDate: toDateKey(absence.startDate),
    endDate: toDateKey(absence.endDate),
    status: absence.status,
    typeRef: absence.typeRef ?? '',
    typeLabel: absence.type?.translations?.[0]?.value || absence.type?.value || absence.typeRef || '',
    parentEntryId: absence.type?.parentEntryId,
    effectiveDays: Number(absence.effectiveDays ?? 0),
    workingDays: Number(absence.workingDays ?? 0),
    calendarDays: Number(absence.calendarDays ?? 0)
  }))
}

export const fetchTeamHolidayData = async (
  graphqlClient: GraphqlClient,
  employeeIds: string[],
  from: string,
  to: string,
  locale = getActiveLocale()
): Promise<TeamHolidayData> => {
  const datesByEmployeeId = new Map<string, Set<string>>()
  const namesByEmployeeId = new Map<string, Record<string, string>>()

  if (employeeIds.length === 0) {
    return { datesByEmployeeId, namesByEmployeeId }
  }

  const teamResult = await graphqlClient.request<TeamMemberRegionsResult>(GET_TEAM_MEMBER_REGIONS, {
    employeeIds,
    activeUserLocale: locale
  })

  const employeeRows = teamResult.Employee ?? []
  const employeeIdsByRegion = new Map<string, string[]>()

  employeeRows.forEach(employee => {
    const regionId = getActiveWorkingCondition(employee.workingCondition)?.region?.id
    if (!regionId) {
      return
    }

    const ids = employeeIdsByRegion.get(regionId) ?? []
    ids.push(employee.id)
    employeeIdsByRegion.set(regionId, ids)
  })

  const regionEntries = Array.from(employeeIdsByRegion.entries())
  await Promise.all(
    regionEntries.map(async ([regionIdRaw, regionEmployeeIds]) => {
      // Keep holiday resolution consistent with My Time history:
      // map RO sub-regions to the consolidated ROU holiday catalog.
      let regionId = regionIdRaw
      try {
        const regionCode = String(regionIdRaw).split(':').pop() || ''
        if (regionCode.startsWith('RO') && regionCode !== 'ROU') {
          regionId = 'EmploymentRegion:v1:ROU'
        }
      } catch {
        regionId = regionIdRaw
      }

      const holidaysResult = await graphqlClient.request<HolidaysResult>(employmentRegionHolidaysQuery, {
        activeUserLocale: locale,
        regionId
      })

      const holidayDates = new Set<string>()
      const namesByDate: Record<string, string> = {}

      ;(holidaysResult.holidays ?? []).forEach(holiday => {
        const code = String(holiday.alternativeCode ?? holiday.code ?? '')
        const match = /^(\d{4})(\d{2})(\d{2})$/.exec(code)
        if (!match) {
          return
        }

        const dateKey = `${match[1]}-${match[2]}-${match[3]}`
        if (!isDateWithinRange(dateKey, from, to)) {
          return
        }

        holidayDates.add(dateKey)
        namesByDate[dateKey] = holiday.translations?.[0]?.value || holiday.value || 'Holiday'
      })

      regionEmployeeIds.forEach(employeeId => {
        datesByEmployeeId.set(employeeId, new Set(holidayDates))
        namesByEmployeeId.set(employeeId, { ...namesByDate })
      })
    })
  )

  return { datesByEmployeeId, namesByEmployeeId }
}

export const buildAbsenceNetByEmployeeAndDay = (absenceNet: AbsenceNetEntry[]): Map<string, Map<string, number>> => {
  const map = new Map<string, Map<string, number>>()
  for (const row of absenceNet) {
    const value = Number(row.netSignedEps ?? row.netConsumed) || 0
    if (value <= 0) continue
    if (!map.has(row.employeeId)) map.set(row.employeeId, new Map())
    const dayMap = map.get(row.employeeId)!
    dayMap.set(row.dayDate, (dayMap.get(row.dayDate) ?? 0) + value)
  }
  return map
}

export interface ComputeMemberPeriodSummariesParams {
  members: TeamMember[]
  from: Date
  to: Date
  attendance: TeamAttendanceEntry[]
  absences: TeamAbsenceToday[]
  netByEmployeeAndDay: Map<string, Map<string, number>>
  holidayDatesByEmployeeId: Map<string, Set<string>>
}

export const computeMemberPeriodSummaries = ({
  members,
  from,
  to,
  attendance,
  absences,
  netByEmployeeAndDay,
  holidayDatesByEmployeeId
}: ComputeMemberPeriodSummariesParams): Record<string, PeriodSummary> => {
  const result: Record<string, PeriodSummary> = {}

  for (const member of members) {
    const memberAttendance = attendance.filter(a => a.employeeId === member.id)
    const memberNetByDay = netByEmployeeAndDay.get(member.id) ?? new Map<string, number>()
    const holidayDates = holidayDatesByEmployeeId.get(member.id) ?? new Set<string>()

    let targetMinutes = 0
    let daysOff = 0
    const d = new Date(from)
    while (d <= to) {
      const dateKey = toLocalDateKey(d)
      const planned = getPlannedMinutesForDate(dateKey, member.workingHours)
      if (planned > 0) {
        if (holidayDates.has(dateKey)) {
          d.setDate(d.getDate() + 1)
          continue
        }

        const dayAbsences = absences.filter(
          absence => absence.employeeId === member.id && absence.dayDate === dateKey && absence.status === 'APPROVED'
        )
        const hasNonWorkAbsence = dayAbsences.some(absence => !isWorkAbsence(absence))

        if (hasNonWorkAbsence) {
          const netFraction = Math.min(memberNetByDay.get(dateKey) ?? 1, 1)
          daysOff += netFraction
          targetMinutes += planned * (1 - netFraction)
        } else {
          targetMinutes += planned
        }
      }
      d.setDate(d.getDate() + 1)
    }

    const actualMinutes = memberAttendance.reduce((sum, e) => sum + parseDurationToMinutes(e.effectiveTime), 0)
    const diffMinutes = actualMinutes - targetMinutes

    result[member.id] = {
      targetMinutes: Math.round(targetMinutes),
      actualMinutes,
      daysOff: Math.round(daysOff * 10) / 10,
      diffMinutes: Math.round(diffMinutes)
    }
  }

  return result
}

export const buildMonthOvertimeRows = (
  members: TeamMember[],
  periodSummaries: Record<string, PeriodSummary>
): MonthOvertimeRow[] =>
  members
    .map(member => {
      const summary = periodSummaries[member.id]
      const overtimeMinutes = summary && summary.diffMinutes > 0 ? summary.diffMinutes : 0
      return overtimeMinutes > 0 ? { employee: member, overtimeMinutes } : null
    })
    .filter((row): row is MonthOvertimeRow => row !== null)
    .sort((left, right) => right.overtimeMinutes - left.overtimeMinutes)
