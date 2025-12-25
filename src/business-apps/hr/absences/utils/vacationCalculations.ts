/**
 * Vacation Calculation Utilities
 * Shared utility functions for vacation-related calculations
 */

interface Entitlement {
  available: number
  total: number
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
 * Calculate working days between two dates
 * Simple implementation - counts all days excluding weekends
 */
export const calculateWorkingDays = (startDate: string, endDate: string): number => {
  const start = new Date(startDate)
  const end = new Date(endDate)
  let workingDays = 0

  const currentDate = new Date(start)
  while (currentDate <= end) {
    const dayOfWeek = currentDate.getDay()
    // Count days that are not Saturday (6) or Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
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
