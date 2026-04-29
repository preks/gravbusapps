/**
 * Aggregation helpers for the Insights view of the Time & Absence Hub.
 *
 * All functions are pure and operate on the data shape returned by
 * `useOrgAttendanceData` so they can be safely memoized at the call site.
 */

import { AbsenceCalendarDay, AttendanceRow, FilteredEmployee } from '../queries/OrgAttendanceQueries'

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

const minutesToHours = (minutes: number): number => Math.round((minutes / 60) * 10) / 10

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
  const month = date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' })
  return `${month} ${date.getUTCDate()}`
}

const isMissingLog = (row: AttendanceRow): boolean => (row.plannedTime ?? 0) > 0 && !row.startTime && !row.endTime

export const aggregateAttendanceByWeek = (rows: AttendanceRow[]): WeeklyAttendanceBucket[] => {
  if (rows.length === 0) {
    return []
  }
  const buckets = new Map<string, WeeklyAttendanceBucket>()
  rows.forEach(row => {
    if (!row.attendanceDate) {
      return
    }
    const weekStart = startOfIsoWeekUtc(isoDate(row.attendanceDate))
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
    existing.workedHours += minutesToHours(row.effectiveTime ?? 0)
    existing.plannedHours += minutesToHours(row.plannedTime ?? 0)
    const diffMinutes = row.differenceTime ?? 0
    if (diffMinutes > 0) {
      existing.overtimeHours += minutesToHours(diffMinutes)
    } else if (diffMinutes < 0) {
      existing.deficitHours += minutesToHours(Math.abs(diffMinutes))
    }
    if (isMissingLog(row)) {
      existing.missingLogs += 1
    }
    if (row.manualOverride) {
      existing.manualCorrections += 1
    }
    buckets.set(key, existing)
  })
  return Array.from(buckets.values()).sort((a, b) => a.weekKey.localeCompare(b.weekKey))
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
  rows: AttendanceRow[],
  employees: FilteredEmployee[],
  dimension: EmployeeDimension
): DimensionBreakdown[] => {
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

  rows.forEach(row => {
    const employee = employeeIndex.get(row.employeeId)
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

    existing.workedHours += minutesToHours(row.effectiveTime ?? 0)
    existing.plannedHours += minutesToHours(row.plannedTime ?? 0)
    const diffMinutes = row.differenceTime ?? 0
    if (diffMinutes > 0) {
      existing.overtimeHours += minutesToHours(diffMinutes)
    } else if (diffMinutes < 0) {
      existing.deficitHours += minutesToHours(Math.abs(diffMinutes))
    }
    if (isMissingLog(row)) {
      existing.missingLogs += 1
    }
    if (row.manualOverride) {
      existing.manualCorrections += 1
    }
    buckets.set(key, existing)
  })

  return Array.from(buckets.values())
    .map(entry => ({
      ...entry,
      achievementPct: entry.plannedHours > 0 ? Math.round((entry.workedHours / entry.plannedHours) * 1000) / 10 : 0
    }))
    .sort((a, b) => b.workedHours - a.workedHours)
}

export const computeDailyPresence = (rows: AttendanceRow[], populationSize: number): DailyPresenceBucket[] => {
  if (rows.length === 0 || populationSize === 0) {
    return []
  }
  const presentByDay = new Map<string, Set<string>>()
  rows.forEach(row => {
    if (!row.attendanceDate) {
      return
    }
    const set = presentByDay.get(row.attendanceDate) ?? new Set<string>()
    if ((row.effectiveTime ?? 0) > 0 || row.startTime) {
      set.add(row.employeeId)
    }
    presentByDay.set(row.attendanceDate, set)
  })
  return Array.from(presentByDay.entries())
    .map(([dayKey, employeesSet]) => ({
      dayKey,
      dayLabel: formatWeekLabel(isoDate(dayKey)),
      presentEmployees: employeesSet.size,
      populationSize,
      presenceRate: Math.round((employeesSet.size / populationSize) * 1000) / 10
    }))
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
  absences.forEach(absence => {
    const employee = employeeIndex.get(absence.employeeId)
    if (!employee) {
      return
    }
    const { key } = resolveDimension(employee, dimension)
    result.set(key, (result.get(key) ?? 0) + 1)
  })
  return result
}
