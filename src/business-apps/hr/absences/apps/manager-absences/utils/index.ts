import { format } from 'date-fns'
import { EmployeeAbsence, EnhancedAbsence } from '../types'
import { getEmployeeName } from './absenceUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  getAbsenceStatusConfig,
  getAbsenceStatusBadgeVariant as getCentralizedStatusBadgeVariant,
  getAbsenceStatusLabel
} from '../../../utils/absenceStatusUtils'

// Date utility functions
export const formatDateRange = (startDate: Date | string, endDate: Date | string): string => {
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  if (start.getTime() === end.getTime()) {
    return format(start, 'MMM d, yyyy')
  }
  return `${format(start, 'MMM d')} - ${format(end, 'MMM d, yyyy')}`
}

export const getMonthName = (date: string | Date): string => {
  const monthKeys = [
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
  const monthNames = [
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
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const monthIndex = dateObj.getMonth()
  return getTranslationFromI18nKeyAndLabel(monthKeys[monthIndex], monthNames[monthIndex])
}

export const isToday = (date: string | Date): boolean => {
  const today = new Date()
  const checkDate = typeof date === 'string' ? new Date(date) : date
  return today.toDateString() === checkDate.toDateString()
}

export const isWithinDateRange = (date: string | Date, startDate: string | Date, endDate: string | Date): boolean => {
  const checkDate = typeof date === 'string' ? new Date(date) : date
  const start = typeof startDate === 'string' ? new Date(startDate) : startDate
  const end = typeof endDate === 'string' ? new Date(endDate) : endDate

  return checkDate >= start && checkDate <= end
}

// Employee name formatting moved to absenceUtils.ts

export const getEmployeeInitials = (employee: EmployeeAbsence['employee']): string => {
  const firstName = employee.firstName || ''
  const lastName = employee.lastName || ''
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
}

// Absence type formatting
export const getAbsenceTypeName = (type: EmployeeAbsence['type'], locale = 'en'): string => {
  const translation = type.translations?.find(t => t.localeCode === locale)
  return translation?.value || type.value || type.objectValue || 'Unknown Type'
}

export const getAbsenceGroupName = (type: EmployeeAbsence['type'], absenceGroups: Record<string, string>): string => {
  return absenceGroups[type.parentEntryId] || type.groupName || 'Unknown Group'
}

// Get original group name for color lookup (before translation)
export const getOriginalAbsenceGroupName = (
  type: EmployeeAbsence['type'],
  absenceGroups: Record<string, string>,
  originalAbsenceGroups: Record<string, string>
): string => {
  // First try to get from original groups map (English names)
  if (originalAbsenceGroups[type.parentEntryId]) {
    return originalAbsenceGroups[type.parentEntryId]
  }

  // Fallback to the translated name if original not available
  return absenceGroups[type.parentEntryId] || type.groupName || 'Unknown Group'
}

// Status formatting and badge variants - now using centralized utilities
export const getAbsenceStatusBadgeVariant = (status: string | null | undefined): string => {
  return getCentralizedStatusBadgeVariant(status ?? undefined) ?? 'default'
}

export const formatAbsenceStatus = (status: string | null | undefined): string => {
  return getAbsenceStatusLabel(status ?? undefined)
}

// Duration formatting
export const formatDuration = (calendarDays: number, effectiveDays: number): string => {
  if (calendarDays === effectiveDays) {
    return `${effectiveDays} day${effectiveDays !== 1 ? 's' : ''}`
  }
  return `${effectiveDays} working day${effectiveDays !== 1 ? 's' : ''} (${calendarDays} calendar day${calendarDays !== 1 ? 's' : ''})`
}

// Chart data transformation
export const transformAbsencesForChart = (absences: EmployeeAbsence[], absenceGroups: Record<string, string>) => {
  const grouped: { [month: string]: { [type: string]: number } } = {}

  absences.forEach(absence => {
    const month = getMonthName(absence.startDate)
    const type = getAbsenceGroupName(absence.type, absenceGroups)

    if (!grouped[month]) grouped[month] = {}
    if (!grouped[month][type]) grouped[month][type] = 0
    grouped[month][type] += 1
  })

  return grouped
}

export const transformAbsencesForPieChart = (absences: EmployeeAbsence[], absenceGroups: Record<string, string>) => {
  const pieDataMap: { [group: string]: number } = {}

  absences.forEach(absence => {
    const group = getAbsenceGroupName(absence.type, absenceGroups)
    if (!pieDataMap[group]) pieDataMap[group] = 0
    pieDataMap[group] += absence.effectiveDays
  })

  return Object.keys(pieDataMap).map(group => ({
    name: group,
    value: pieDataMap[group]
  }))
}

// Data enhancement functions
export const enhanceAbsence = (
  absence: EmployeeAbsence,
  absenceGroups: Record<string, string>,
  originalAbsenceGroups?: Record<string, string>
): EnhancedAbsence => {
  return {
    ...absence,
    employeeName: getEmployeeName({ employee: absence.employee }),
    typeName: getAbsenceTypeName(absence.type),
    groupName: getAbsenceGroupName(absence.type, absenceGroups),
    originalGroupName: originalAbsenceGroups
      ? getOriginalAbsenceGroupName(absence.type, absenceGroups, originalAbsenceGroups)
      : getAbsenceGroupName(absence.type, absenceGroups),
    dateRange: formatDateRange(absence.startDate, absence.endDate),
    duration: formatDuration(absence.calendarDays, absence.effectiveDays),
    statusBadgeVariant: getAbsenceStatusBadgeVariant(absence.status),
    translatedStatus: getAbsenceStatusLabel(absence.status)
  }
}

// Search and filter utilities
export const filterAbsencesBySearch = (absences: EmployeeAbsence[], searchTerm: string): EmployeeAbsence[] => {
  if (!searchTerm.trim()) return absences

  const term = searchTerm.toLowerCase()
  return absences.filter(
    absence =>
      (absence.employee.firstName || '').toLowerCase().includes(term) ||
      (absence.employee.lastName || '').toLowerCase().includes(term) ||
      (absence.type.value || '').toLowerCase().includes(term) ||
      (absence.type.objectValue || '').toLowerCase().includes(term) ||
      (absence.status || '').toLowerCase().includes(term) ||
      (absence.employee.employeePosition?.organizationalUnit?.name || '').toLowerCase().includes(term) ||
      (absence.createdAt || '').toLowerCase().includes(term)
  )
}

export const filterAbsencesByStatus = (absences: EmployeeAbsence[], statuses: string[]): EmployeeAbsence[] => {
  if (!statuses.length) return absences
  return absences.filter(absence => statuses.includes((absence.status || '').toLowerCase()))
}

export const filterAbsencesByType = (absences: EmployeeAbsence[], typeIds: string[]): EmployeeAbsence[] => {
  if (!typeIds.length) return absences
  return absences.filter(absence => typeIds.includes(absence.type.id))
}

export const filterAbsencesByGroup = (absences: EmployeeAbsence[], groupIds: string[]): EmployeeAbsence[] => {
  if (!groupIds.length) return absences
  return absences.filter(absence => groupIds.includes(absence.type.parentEntryId))
}

// Profile picture utilities
export const getProfilePictureUrl = (picture?: string | null): string | null => {
  if (!picture) return null
  try {
    const parsed = JSON.parse(picture)
    return parsed.path || null
  } catch {
    return null
  }
}

// Sorting utilities
export const sortAbsencesByField = (
  absences: EmployeeAbsence[],
  field: string,
  order: 'asc' | 'desc' = 'desc'
): EmployeeAbsence[] => {
  return [...absences].sort((a, b) => {
    let aValue: any
    let bValue: any

    switch (field) {
      case 'employeeName':
        aValue = getEmployeeName({ employee: a.employee })
        bValue = getEmployeeName({ employee: b.employee })
        break
      case 'startDate':
        aValue = new Date(a.startDate)
        bValue = new Date(b.startDate)
        break
      case 'endDate':
        aValue = new Date(a.endDate)
        bValue = new Date(b.endDate)
        break
      case 'createdAt':
        aValue = new Date(a.createdAt)
        bValue = new Date(b.createdAt)
        break
      case 'type':
        aValue = getAbsenceTypeName(a.type)
        bValue = getAbsenceTypeName(b.type)
        break
      case 'status':
        aValue = a.status
        bValue = b.status
        break
      case 'effectiveDays':
        aValue = a.effectiveDays
        bValue = b.effectiveDays
        break
      default:
        return 0
    }

    if (aValue < bValue) return order === 'asc' ? -1 : 1
    if (aValue > bValue) return order === 'asc' ? 1 : -1
    return 0
  })
}

// Status display configuration for absence statuses - now using centralized utilities
export type { AbsenceStatusConfig as AbsenceStatusDisplayConfig } from '../../../utils/absenceStatusUtils'

export const getAbsenceStatusDisplay = (status: string) => {
  const config = getAbsenceStatusConfig(status)
  return {
    label: config.label,
    type: config.type
  }
}
