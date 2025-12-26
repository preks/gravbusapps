/**
 * Vacation Calculation Utilities
 * Shared utility functions for vacation-related calculations
 */

interface Entitlement {
  available: number
  total: number
}

/**
 * Holiday entry from EmploymentRegionHoliday catalog
 */
export interface HolidayEntry {
  id: string
  value: string
  code: string
  alternativeCode?: string
  additionalValue1?: string
  additionalValue2?: string
  additionalValue3?: string
  objectValue?: any
}

interface Absence {
  startDate: string
  endDate: string
  status: string
  typeRef: string
}

/**
 * Calculate remaining vacation days after approval of current request
 */
export const calculateRemainingAfterApproval = (
  entitlement: Entitlement | null,
  currentRequestDays: number
): number => {
  if (!entitlement) {
    return 0
  }

  return Math.max(0, entitlement.available - currentRequestDays)
}

/**
 * Get consistent color for absence types
 * Yellow = vacation, Red = sick, Blue = other
 */
export const getAbsenceColorByType = (absenceTypeRef: string): string => {
  const typeRefLower = absenceTypeRef.toLowerCase()

  // Sick leave - Red
  if (typeRefLower.includes('a002') || typeRefLower.includes('sick')) {
    return 'gba:bg-red-500'
  }

  // Annual leave/Vacation - Yellow
  if (typeRefLower.includes('a001') || typeRefLower.includes('annual') || typeRefLower.includes('vacation')) {
    return 'gba:bg-yellow-500'
  }

  // Other absences - Blue
  return 'gba:bg-blue-500'
}

/**
 * Filter absences within a specific date range
 */
export const filterAbsencesByDateRange = (absences: Absence[], startDate: string, endDate: string): Absence[] => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  return absences.filter(absence => {
    const absenceStart = new Date(absence.startDate)
    const absenceEnd = new Date(absence.endDate)

    // Check for overlap
    return absenceStart <= end && absenceEnd >= start
  })
}

/**
 * Group absences by month for yearly calendar display
 */
export const groupAbsencesByMonth = (absences: Absence[], year: number): Record<number, Absence[]> => {
  const grouped: Record<number, Absence[]> = {}

  // Initialize all months (0-11)
  for (let month = 0; month < 12; month++) {
    grouped[month] = []
  }

  absences.forEach(absence => {
    const absenceStart = new Date(absence.startDate)
    const absenceEnd = new Date(absence.endDate)

    // Only process absences that overlap with the specified year
    if (absenceStart.getFullYear() > year || absenceEnd.getFullYear() < year) {
      return
    }

    // Add absence to each month it spans
    const startMonth = absenceStart.getFullYear() === year ? absenceStart.getMonth() : 0
    const endMonth = absenceEnd.getFullYear() === year ? absenceEnd.getMonth() : 11

    for (let month = startMonth; month <= endMonth; month++) {
      grouped[month].push(absence)
    }
  })

  return grouped
}

/**
 * Calculate team coverage percentage
 * Returns percentage of team available (not absent)
 */
export const calculateTeamCoveragePercentage = (teamSize: number, absencesCount: number): number => {
  if (teamSize === 0) {
    return 100
  }

  const availableCount = Math.max(0, teamSize - absencesCount)
  return Math.round((availableCount / teamSize) * 100)
}

/**
 * Check if absence overlaps with a date range
 */
export const doesAbsenceOverlap = (
  absenceStart: string,
  absenceEnd: string,
  rangeStart: string,
  rangeEnd: string
): boolean => {
  const absStart = new Date(absenceStart)
  const absEnd = new Date(absenceEnd)
  const rStart = new Date(rangeStart)
  const rEnd = new Date(rangeEnd)

  return absStart <= rEnd && absEnd >= rStart
}

/**
 * Format date range for display
 */
export const formatDateRange = (startDate: string, endDate: string, locale: string = 'en-US'): string => {
  const start = new Date(startDate)
  const end = new Date(endDate)

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }

  const startFormatted = start.toLocaleDateString(locale, options)
  const endFormatted = end.toLocaleDateString(locale, options)

  // If same day, show once
  if (startFormatted === endFormatted) {
    return startFormatted
  }

  return `${startFormatted} - ${endFormatted}`
}

/**
 * Parse holiday code to date
 * Holiday codes are in format: YYYYMMDD (e.g., "20241225" for Dec 25, 2024)
 */
const parseHolidayDate = (code: string): Date | null => {
  if (!code || typeof code !== 'string') {
    return null
  }

  const trimmedCode = code.trim()
  const dateCodeRegex = /^(\d{4})(\d{2})(\d{2})$/
  const parts = dateCodeRegex.exec(trimmedCode)

  if (!parts) {
    return null
  }

  const y = Number.parseInt(parts[1], 10)
  const m = Number.parseInt(parts[2], 10)
  const d = Number.parseInt(parts[3], 10)

  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) {
    return null
  }

  if (d < 1 || d > 31 || m < 1 || m > 12) {
    return null
  }

  const date = new Date(y, m - 1, d)
  if (date.getMonth() !== m - 1 || date.getFullYear() !== y || date.getDate() !== d) {
    return null
  }

  return date
}

/**
 * Normalize date to ISO date string (YYYY-MM-DD) for consistent comparison
 */
const normalizeToISODate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Convert HolidayEntry array to Set of ISO date strings
 * Filters out half-day holidays (additionalValue1 === '05H')
 */
export const convertHolidaysToDateSet = (holidays: HolidayEntry[]): Set<string> => {
  const dateSet = new Set<string>()

  holidays.forEach(holiday => {
    // Skip half-day holidays
    if (holiday.additionalValue1 === '05H') {
      return
    }

    const code = holiday.alternativeCode || holiday.code || ''
    if (!code) {
      return
    }

    const holidayDate = parseHolidayDate(code)
    if (!holidayDate) {
      return
    }

    const isoDate = normalizeToISODate(holidayDate)
    dateSet.add(isoDate)
  })

  return dateSet
}

/**
 * Calculate working days between two dates
 * Excludes weekends (Saturday and Sunday) and public holidays
 *
 * @param startDate - Start date in ISO format (YYYY-MM-DD)
 * @param endDate - End date in ISO format (YYYY-MM-DD)
 * @param holidays - Optional set/array of holiday dates in ISO format (YYYY-MM-DD), or callback function
 * @returns Number of working days (excluding weekends and holidays)
 *
 * @example
 * // Using with HolidayEntry from EmploymentRegionHoliday catalog (recommended)
 * const holidays = await fetchEmploymentRegionHolidays(regionIds)
 * const holidayDateSet = convertHolidaysToDateSet(holidays)
 * const workingDays = calculateWorkingDays('2024-01-01', '2024-01-31', holidayDateSet)
 *
 * @example
 * // Using with array of ISO date strings
 * const holidays = ['2024-01-01', '2024-12-25', '2024-12-26']
 * const workingDays = calculateWorkingDays('2024-01-01', '2024-12-31', holidays)
 *
 * @example
 * // Using with callback function for dynamic lookup
 * const isHoliday = (date: Date) => checkHolidayInDatabase(date)
 * const workingDays = calculateWorkingDays('2024-01-01', '2024-12-31', isHoliday)
 */
export const calculateWorkingDays = (
  startDate: string,
  endDate: string,
  holidays?: Set<string> | string[] | ((date: Date) => boolean)
): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let workingDays = 0

  // Convert array to Set for O(1) lookup, or keep as callback
  let isHoliday: (date: Date) => boolean

  if (typeof holidays === 'function') {
    isHoliday = holidays
  } else if (holidays) {
    const holidaySet = holidays instanceof Set ? holidays : new Set(holidays)
    isHoliday = (date: Date) => holidaySet.has(normalizeToISODate(date))
  } else {
    isHoliday = () => false
  }

  const currentDate = new Date(start)
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay()
    // Count days that are not Saturday (6), Sunday (0), or holidays
    if (dayOfWeek !== 0 && dayOfWeek !== 6 && !isHoliday(currentDate)) {
      workingDays++
    }
    currentDate.setDate(currentDate.getDate() + 1)
  }

  return workingDays
}

/**
 * Get vacation status color based on remaining days percentage
 */
export const getVacationStatusColor = (remaining: number, total: number): string => {
  if (total === 0) {
    return 'gba:text-muted-foreground'
  }

  const percentage = (remaining / total) * 100

  if (percentage < 20) {
    return 'gba:text-destructive'
  }
  if (percentage < 40) {
    return 'gba:text-warning'
  }
  return 'gba:text-success'
}

/**
 * Check if vacation balance is low
 */
export const isLowVacationBalance = (remaining: number, total: number): boolean => {
  if (total === 0) {
    return false
  }

  const percentage = (remaining / total) * 100
  return percentage < 20
}

/**
 * Check if vacation balance is negative
 */
export const isNegativeBalance = (remaining: number): boolean => {
  return remaining < 0
}
