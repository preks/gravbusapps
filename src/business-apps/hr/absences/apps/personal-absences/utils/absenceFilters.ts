import dayjs from 'dayjs'

/**
 * Filters absences to only those that are APPROVED and in the current year.
 * Accepts any[] type for compatibility.
 */
export function filterAbsencesForEntitlements(absences: any[]): any[] {
  const currentYear = dayjs().year()
  return absences.filter(
    a => (a.status || '').toUpperCase() === 'APPROVED' && dayjs(a.startDate).year() === currentYear
  )
}
