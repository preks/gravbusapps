/**
 * Aggregation helpers for the Insights view of the Time & Absence Hub.
 *
 * All functions are pure and operate on the data shape returned by
 * `useOrgAttendanceData` so they can be safely memoized at the call site.
 */

import {
  AbsenceCalendarDay,
  AbsenceNetDay,
  AttendanceRow,
  FilteredEmployee,
  PublicHolidayDay
} from '../queries/OrgAttendanceQueries'
import {
  getActiveWeeklyWorkingHours,
  type NormalizedWeeklyWorkingHours
} from '@/business-apps/hr/core/utils/workingHoursUtils'
import { eachDateInRange } from '../components/views/attendance/attendanceMetrics'
import { toMinutes, type AttendanceDateRange } from '../components/views/attendance/attendanceUtils'

export interface WeeklyAttendanceBucket {
  weekKey: string
  weekLabel: string
  workedHours: number
  plannedHours: number
  overtimeHours: number
  deficitHours: number
  missingLogs: number
  manualCorrections: number
}

export interface DimensionBreakdown {
  key: string
  label: string
  workedHours: number
  plannedHours: number
  overtimeHours: number
  deficitHours: number
  missingLogs: number
  manualCorrections: number
  headcount: number
  achievementPct: number
}

export interface DailyPresenceBucket {
  dayKey: string
  dayLabel: string
  presentEmployees: number
  populationSize: number
  presenceRate: number
}

const isoDate = (raw: string): Date => new Date(`${raw}T00:00:00Z`)

const startOfIsoWeekUtc = (date: Date): Date => {
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday
}

const formatWeekKey = (date: Date): string => date.toISOString().slice(0, 10)

const formatWeekLabel = (date: Date): string => {
  const year = date.getUTCFullYear()
  const firstThursday = new Date(Date.UTC(year, 0, 4))
  const firstWeekStart = startOfIsoWeekUtc(firstThursday)
  const diffDays = Math.floor((date.getTime() - firstWeekStart.getTime()) / 86400000)
  const week = Math.floor(diffDays / 7) + 1
  return `CW ${String(week).padStart(2, '0')}`
}

const formatDayLabel = (date: Date): string => {
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${month} ${date.getUTCDate()}`
}

export interface InsightsAggregationInput {
  attendance: AttendanceRow[]
  employees: FilteredEmployee[]
  dateRange: AttendanceDateRange | null
  holidays?: PublicHolidayDay[]
  absenceNet?: AbsenceNetDay[]
}

interface EmployeeDayMetrics {
  employee: FilteredEmployee
  dayKey: string
  workedMinutes: number
  plannedMinutes: number
  manualCorrections: number
  missingLog: boolean
  present: boolean
}

const round1 = (value: number): number => Math.round(value * 10) / 10

const todayDateKey = (): string => new Date().toISOString().slice(0, 10)

const isCompletedDay = (dateIso: string, today = todayDateKey()): boolean => dateIso < today

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

  return Math.max(0, Math.round((hoursByDay[day] ?? 0) * 60))
}

const buildAttendanceByEmployeeAndDay = (rows: AttendanceRow[]): Map<string, Map<string, AttendanceRow[]>> => {
  const result = new Map<string, Map<string, AttendanceRow[]>>()
  rows.forEach(row => {
    if (!row.employeeId || !row.attendanceDate) {
      return
    }
    const employeeMap = result.get(row.employeeId) ?? new Map<string, AttendanceRow[]>()
    const dayRows = employeeMap.get(row.attendanceDate) ?? []
    dayRows.push(row)
    employeeMap.set(row.attendanceDate, dayRows)
    result.set(row.employeeId, employeeMap)
  })
  return result
}

const buildHolidayDatesByEmployee = (holidays: PublicHolidayDay[] = []): Map<string, Set<string>> => {
  const result = new Map<string, Set<string>>()
  holidays.forEach(holiday => {
    const dates = result.get(holiday.employeeId) ?? new Set<string>()
    dates.add(holiday.date)
    result.set(holiday.employeeId, dates)
  })
  return result
}

const buildAbsenceFractionByEmployeeAndDay = (absenceNet: AbsenceNetDay[] = []): Map<string, Map<string, number>> => {
  const result = new Map<string, Map<string, number>>()
  absenceNet.forEach(row => {
    const employeeMap = result.get(row.employeeId) ?? new Map<string, number>()
    employeeMap.set(row.dayDate, Math.min(Math.max(Number(row.netConsumed ?? 1), 0), 1))
    result.set(row.employeeId, employeeMap)
  })
  return result
}

const buildEmployeeDayMetrics = ({
  attendance,
  employees,
  dateRange,
  holidays = [],
  absenceNet = []
}: InsightsAggregationInput): EmployeeDayMetrics[] => {
  if (!dateRange || employees.length === 0) {
    return []
  }

  const today = todayDateKey()
  const dates = eachDateInRange(dateRange).filter(dayKey => isCompletedDay(dayKey, today))
  const attendanceByEmployeeAndDay = buildAttendanceByEmployeeAndDay(attendance)
  const holidaysByEmployee = buildHolidayDatesByEmployee(holidays)
  const absenceFractionByEmployeeAndDay = buildAbsenceFractionByEmployeeAndDay(absenceNet)

  return employees.flatMap(employee => {
    const attendanceByDay = attendanceByEmployeeAndDay.get(employee.id) ?? new Map<string, AttendanceRow[]>()
    const holidayDates = holidaysByEmployee.get(employee.id) ?? new Set<string>()
    const absenceFractionByDay = absenceFractionByEmployeeAndDay.get(employee.id) ?? new Map<string, number>()

    return dates.map(dayKey => {
      const dayAttendance = attendanceByDay.get(dayKey) ?? []
      const workingHours = getActiveWeeklyWorkingHours(employee.workingHours, dayKey)
      const plannedForDay = holidayDates.has(dayKey) ? 0 : getPlannedMinutesForDate(dayKey, workingHours)
      const absenceFraction = absenceFractionByDay.get(dayKey) ?? 0
      const plannedMinutes = Math.round(plannedForDay * (1 - absenceFraction))
      const workedMinutes = dayAttendance.reduce((acc, row) => acc + toMinutes(row.effectiveTime), 0)
      const hasLoggedTime = dayAttendance.some(row => row.startTime || row.endTime || toMinutes(row.effectiveTime) > 0)

      return {
        employee,
        dayKey,
        workedMinutes,
        plannedMinutes,
        manualCorrections: dayAttendance.filter(row => Boolean(row.manualOverride)).length,
        missingLog: plannedMinutes > 0 && !hasLoggedTime,
        present: hasLoggedTime
      }
    })
  })
}

export const aggregateAttendanceByWeek = (input: InsightsAggregationInput): WeeklyAttendanceBucket[] => {
  const dayMetrics = buildEmployeeDayMetrics(input)
  if (dayMetrics.length === 0) {
    return []
  }

  const buckets = new Map<string, WeeklyAttendanceBucket>()
  dayMetrics.forEach(day => {
    const weekStart = startOfIsoWeekUtc(isoDate(day.dayKey))
    const key = formatWeekKey(weekStart)
    const existing =
      buckets.get(key) ??
      ({
        weekKey: key,
        weekLabel: formatWeekLabel(weekStart),
        workedHours: 0,
        plannedHours: 0,
        overtimeHours: 0,
        deficitHours: 0,
        missingLogs: 0,
        manualCorrections: 0
      } satisfies WeeklyAttendanceBucket)
    existing.workedHours += day.workedMinutes / 60
    existing.plannedHours += day.plannedMinutes / 60
    const diffMinutes = day.workedMinutes - day.plannedMinutes
    if (diffMinutes > 0) {
      existing.overtimeHours += diffMinutes / 60
    } else if (diffMinutes < 0) {
      existing.deficitHours += Math.abs(diffMinutes) / 60
    }
    if (day.missingLog) {
      existing.missingLogs += 1
    }
    existing.manualCorrections += day.manualCorrections
    buckets.set(key, existing)
  })

  return Array.from(buckets.values())
    .map(bucket => ({
      ...bucket,
      workedHours: round1(bucket.workedHours),
      plannedHours: round1(bucket.plannedHours),
      overtimeHours: round1(bucket.overtimeHours),
      deficitHours: round1(bucket.deficitHours)
    }))
    .sort((a, b) => a.weekKey.localeCompare(b.weekKey))
}

export type EmployeeDimension = 'department' | 'location' | 'legalEntity'

const resolveDimension = (employee: FilteredEmployee, dimension: EmployeeDimension): { key: string; label: string } => {
  if (dimension === 'department') {
    const dept = employee.employeePosition?.organizationalUnit
    return { key: dept?.id ?? '__none__', label: dept?.name ?? 'No department' }
  }
  if (dimension === 'location') {
    const loc = employee.employeePosition?.siteLocation
    return { key: loc?.id ?? '__none__', label: loc?.name ?? 'No location' }
  }
  const company = employee.employeePosition?.company
  return { key: company?.id ?? '__none__', label: company?.name ?? 'No entity' }
}

export const aggregateByDimension = (
  input: InsightsAggregationInput,
  dimension: EmployeeDimension
): DimensionBreakdown[] => {
  const { employees } = input
  const dayMetrics = buildEmployeeDayMetrics(input)
  const employeeIndex = new Map<string, FilteredEmployee>()
  employees.forEach(employee => employeeIndex.set(employee.id, employee))

  const employeesByDimension = new Map<string, Set<string>>()
  employees.forEach(employee => {
    const { key } = resolveDimension(employee, dimension)
    const set = employeesByDimension.get(key) ?? new Set<string>()
    set.add(employee.id)
    employeesByDimension.set(key, set)
  })

  const buckets = new Map<string, DimensionBreakdown>()

  dayMetrics.forEach(day => {
    const employee = employeeIndex.get(day.employee.id)
    if (!employee) {
      return
    }
    const { key, label } = resolveDimension(employee, dimension)
    const existing =
      buckets.get(key) ??
      ({
        key,
        label,
        workedHours: 0,
        plannedHours: 0,
        overtimeHours: 0,
        deficitHours: 0,
        missingLogs: 0,
        manualCorrections: 0,
        headcount: employeesByDimension.get(key)?.size ?? 0,
        achievementPct: 0
      } satisfies DimensionBreakdown)

    existing.workedHours += day.workedMinutes / 60
    existing.plannedHours += day.plannedMinutes / 60
    const diffMinutes = day.workedMinutes - day.plannedMinutes
    if (diffMinutes > 0) {
      existing.overtimeHours += diffMinutes / 60
    } else if (diffMinutes < 0) {
      existing.deficitHours += Math.abs(diffMinutes) / 60
    }
    if (day.missingLog) {
      existing.missingLogs += 1
    }
    existing.manualCorrections += day.manualCorrections
    buckets.set(key, existing)
  })

  return Array.from(buckets.values())
    .map(entry => ({
      ...entry,
      workedHours: round1(entry.workedHours),
      plannedHours: round1(entry.plannedHours),
      overtimeHours: round1(entry.overtimeHours),
      deficitHours: round1(entry.deficitHours),
      achievementPct: entry.plannedHours > 0 ? Math.round((entry.workedHours / entry.plannedHours) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.workedHours - a.workedHours)
}

export const computeDailyPresence = (input: InsightsAggregationInput): DailyPresenceBucket[] => {
  const dayMetrics = buildEmployeeDayMetrics(input)
  if (!input.dateRange || input.employees.length === 0 || dayMetrics.length === 0) {
    return []
  }

  const presentByDay = new Map<string, Set<string>>()
  dayMetrics.forEach(day => {
    const set = presentByDay.get(day.dayKey) ?? new Set<string>()
    if (day.present) {
      set.add(day.employee.id)
    }
    presentByDay.set(day.dayKey, set)
  })

  const today = todayDateKey()

  return eachDateInRange(input.dateRange)
    .filter(dayKey => isCompletedDay(dayKey, today))
    .map(dayKey => {
      const employeesSet = presentByDay.get(dayKey) ?? new Set<string>()
      return {
        dayKey,
        dayLabel: formatDayLabel(isoDate(dayKey)),
        presentEmployees: employeesSet.size,
        populationSize: input.employees.length,
        presenceRate: Math.round((employeesSet.size / input.employees.length) * 1000) / 10
      }
    })
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey))
}

export const countAbsenceDaysByDimension = (
  absences: AbsenceCalendarDay[],
  employees: FilteredEmployee[],
  dimension: EmployeeDimension
): Map<string, number> => {
  const employeeIndex = new Map<string, FilteredEmployee>()
  employees.forEach(employee => employeeIndex.set(employee.id, employee))
  const result = new Map<string, number>()
  const today = todayDateKey()
  absences.forEach(absence => {
    if (!isCompletedDay(absence.dayDate, today)) {
      return
    }

    const employee = employeeIndex.get(absence.employeeId)
    if (!employee) {
      return
    }
    const { key } = resolveDimension(employee, dimension)
    result.set(key, (result.get(key) ?? 0) + 1)
  })
  return result
}
