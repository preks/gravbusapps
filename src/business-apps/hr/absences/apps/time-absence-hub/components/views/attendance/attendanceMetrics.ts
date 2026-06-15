import type {
  AbsenceCalendarDay,
  AbsenceNetDay,
  AttendanceRow,
  FilteredEmployee,
  PublicHolidayDay
} from '../../../queries/OrgAttendanceQueries'
import {
  getActiveWeeklyWorkingHours,
  type NormalizedWeeklyWorkingHours
} from '@/business-apps/hr/core/utils/workingHoursUtils'
import { toMinutes, type AttendanceDateRange } from './attendanceUtils'

const WORK_ABSENCE_GROUP_ID = 'AbsenceGroup:v1:WORK'

const todayDateKey = (): string => new Date().toISOString().slice(0, 10)

export interface AttendanceAbsenceTypeOption {
  id: string
  name: string
  parentEntryId?: string
}

export interface AttendanceAbsenceBreakdownItem {
  key: string
  label: string
  count: number
}

export interface AttendanceEmployeeMetrics {
  totalEffectiveMinutes: number
  totalPlannedMinutes: number
  totalDifferenceMinutes: number
  absenceBreakdown: AttendanceAbsenceBreakdownItem[]
  manualOverrideCount: number
  missingLogCount: number
}

const toDateKey = (date: Date): string => date.toISOString().slice(0, 10)

const isCompletedDay = (dateIso: string, today = todayDateKey()): boolean => dateIso < today

export const eachDateInRange = (dateRange: AttendanceDateRange): string[] => {
  const dates: string[] = []
  const current = new Date(`${dateRange.dateFrom}T00:00:00.000Z`)
  const end = new Date(`${dateRange.dateTo}T00:00:00.000Z`)

  while (current <= end) {
    dates.push(toDateKey(current))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}

const getPlannedMinutesForDate = (dateIso: string, workingHours?: NormalizedWeeklyWorkingHours): number => {
  if (!workingHours) {
    return 0
  }

  const day = new Date(`${dateIso}T00:00:00.000Z`).getUTCDay()
  const hoursByDay = [
    workingHours.sundayHours,
    workingHours.mondayHours,
    workingHours.tuesdayHours,
    workingHours.wednesdayHours,
    workingHours.thursdayHours,
    workingHours.fridayHours,
    workingHours.saturdayHours
  ]
  const hours = hoursByDay[day] ?? 0

  return Math.max(0, Math.round(hours * 60))
}

export const buildAbsenceTypeMap = (
  absenceTypes: AttendanceAbsenceTypeOption[] = []
): Map<string, AttendanceAbsenceTypeOption> => new Map(absenceTypes.map(type => [type.id, type]))

const isNonWorkAbsence = (
  absence: AbsenceCalendarDay,
  absenceTypeById: Map<string, AttendanceAbsenceTypeOption>
): boolean => absenceTypeById.get(absence.typeRef)?.parentEntryId !== WORK_ABSENCE_GROUP_ID

const isApprovedNonWorkAbsence = (
  absence: AbsenceCalendarDay,
  absenceTypeById: Map<string, AttendanceAbsenceTypeOption>
): boolean => absence.status === 'APPROVED' && isNonWorkAbsence(absence, absenceTypeById)

const groupLabelFromParent = (parentEntryId?: string, fallback?: string): string => {
  const code = parentEntryId?.split(':').pop()?.toLowerCase() ?? ''

  if (code.includes('vac')) {
    return 'Vac'
  }
  if (code.includes('sick') || code.includes('health') || code.includes('ill')) {
    return 'Sick'
  }
  if (code) {
    return code.charAt(0).toUpperCase() + code.slice(1).toLowerCase()
  }

  return fallback ?? 'Abs'
}

const buildNetByEmployeeAndDay = (absenceNet: AbsenceNetDay[]): Map<string, Map<string, number>> => {
  const result = new Map<string, Map<string, number>>()

  absenceNet.forEach(row => {
    const employeeMap = result.get(row.employeeId) ?? new Map<string, number>()
    employeeMap.set(row.dayDate, Math.min(Number(row.netConsumed ?? 1), 1))
    result.set(row.employeeId, employeeMap)
  })

  return result
}

const buildAbsenceBreakdown = (
  employeeAbsences: AbsenceCalendarDay[],
  absenceTypeById: Map<string, AttendanceAbsenceTypeOption>
): AttendanceAbsenceBreakdownItem[] => {
  const daysByGroup = new Map<string, Set<string>>()
  const labelByGroup = new Map<string, string>()

  employeeAbsences.forEach(absence => {
    if (!isApprovedNonWorkAbsence(absence, absenceTypeById)) {
      return
    }

    const absenceType = absenceTypeById.get(absence.typeRef)
    const key = absenceType?.parentEntryId ?? absence.typeRef
    const label = groupLabelFromParent(absenceType?.parentEntryId, absenceType?.name)
    const days = daysByGroup.get(key) ?? new Set<string>()
    days.add(absence.dayDate)
    daysByGroup.set(key, days)
    labelByGroup.set(key, label)
  })

  return Array.from(daysByGroup.entries())
    .map(([key, days]) => ({
      key,
      label: labelByGroup.get(key) ?? 'Abs',
      count: days.size
    }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

export const computeAttendanceEmployeeMetrics = ({
  employee,
  attendance,
  absences,
  holidays,
  absenceNet,
  dateRange,
  absenceTypes
}: {
  employee: FilteredEmployee
  attendance: AttendanceRow[]
  absences: AbsenceCalendarDay[]
  holidays: PublicHolidayDay[]
  absenceNet: AbsenceNetDay[]
  dateRange: AttendanceDateRange | null
  absenceTypes: AttendanceAbsenceTypeOption[]
}): AttendanceEmployeeMetrics => {
  const today = todayDateKey()
  const employeeAttendance = attendance.filter(
    row => row.employeeId === employee.id && isCompletedDay(row.attendanceDate, today)
  )
  const employeeAbsences = absences.filter(row => row.employeeId === employee.id)
  const employeeHolidays = new Set(holidays.filter(row => row.employeeId === employee.id).map(row => row.date))
  const absenceTypeById = buildAbsenceTypeMap(absenceTypes)
  const netByDay = buildNetByEmployeeAndDay(absenceNet).get(employee.id) ?? new Map<string, number>()
  const attendanceByDay = new Map<string, AttendanceRow[]>()

  employeeAttendance.forEach(row => {
    const rows = attendanceByDay.get(row.attendanceDate) ?? []
    rows.push(row)
    attendanceByDay.set(row.attendanceDate, rows)
  })

  let totalPlannedMinutes = 0
  let missingLogCount = 0

  if (dateRange) {
    eachDateInRange(dateRange).forEach(date => {
      if (!isCompletedDay(date, today)) {
        return
      }

      const workingHours = getActiveWeeklyWorkingHours(employee.workingHours, date)
      const plannedForDay = getPlannedMinutesForDate(date, workingHours)
      if (plannedForDay === 0 || employeeHolidays.has(date)) {
        return
      }

      const dayAbsences = employeeAbsences.filter(absence => absence.dayDate === date)
      const hasNonWorkAbsence = dayAbsences.some(absence => isApprovedNonWorkAbsence(absence, absenceTypeById))
      const absenceFraction = hasNonWorkAbsence ? (netByDay.get(date) ?? 1) : 0
      const targetMinutes = Math.round(plannedForDay * (1 - absenceFraction))

      totalPlannedMinutes += targetMinutes

      const dayAttendance = attendanceByDay.get(date) ?? []
      const hasLoggedTime = dayAttendance.some(row => row.startTime || row.endTime || toMinutes(row.effectiveTime) > 0)
      if (targetMinutes > 0 && !hasLoggedTime) {
        missingLogCount += 1
      }
    })
  }

  const totalEffectiveMinutes = employeeAttendance.reduce((acc, row) => acc + toMinutes(row.effectiveTime), 0)

  return {
    totalEffectiveMinutes,
    totalPlannedMinutes,
    totalDifferenceMinutes: totalEffectiveMinutes - totalPlannedMinutes,
    absenceBreakdown: buildAbsenceBreakdown(employeeAbsences, absenceTypeById),
    manualOverrideCount: employeeAttendance.filter(row => Boolean(row.manualOverride)).length,
    missingLogCount
  }
}

export const formatAbsenceBreakdown = (items: AttendanceAbsenceBreakdownItem[]): string =>
  items.map(item => `${item.count} ${item.label}`).join(', ')
