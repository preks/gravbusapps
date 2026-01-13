import dayjs from 'dayjs'

export interface DatePeriod {
  activeFrom: string
  activeTo?: string | null
}

/**
 * Checks if two date periods overlap
 *
 * Two periods overlap if:
 * - new start <= existing end (or existing end is null/infinite)
 * - AND new end >= existing start (or new end is null/infinite)
 *
 * They don't overlap if:
 * - new end < existing start (if both exist)
 * - OR existing end < new start (if both exist)
 *
 * @param newPeriodFrom - Start date of the new period
 * @param newPeriodTo - End date of the new period (null/undefined means infinite)
 * @param existingPeriodFrom - Start date of the existing period
 * @param existingPeriodTo - End date of the existing period (null/undefined means infinite)
 * @returns true if periods overlap, false otherwise
 */
export const checkDateOverlap = (
  newPeriodFrom: string,
  newPeriodTo: string | null | undefined,
  existingPeriodFrom: string,
  existingPeriodTo: string | null | undefined
): boolean => {
  const newFrom = dayjs(newPeriodFrom).startOf('day')
  const newTo = newPeriodTo ? dayjs(newPeriodTo).endOf('day') : null
  const existingFrom = dayjs(existingPeriodFrom)
  const existingTo = existingPeriodTo ? dayjs(existingPeriodTo) : null

  // Two periods don't overlap if:
  // - new end < existing start (if both exist)
  // - OR existing end < new start (if both exist)
  const periodsDontOverlap =
    (newTo && existingFrom && newTo.isBefore(existingFrom, 'day')) ||
    (existingTo && newFrom && existingTo.isBefore(newFrom, 'day'))

  return !periodsDontOverlap
}

/**
 * Finds all periods that overlap with a given period from a list of existing periods
 *
 * @param newPeriod - The new period to check
 * @param existingPeriods - Array of existing periods to check against
 * @returns Array of periods that overlap with the new period
 */
export const findOverlappingPeriods = <T extends DatePeriod>(newPeriod: DatePeriod, existingPeriods: T[]): T[] => {
  return existingPeriods.filter(existing =>
    checkDateOverlap(newPeriod.activeFrom, newPeriod.activeTo, existing.activeFrom, existing.activeTo)
  )
}
