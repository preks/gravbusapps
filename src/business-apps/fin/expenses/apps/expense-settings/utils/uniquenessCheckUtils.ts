import { findOverlappingPeriods, type DatePeriod } from './dateOverlapUtils'

export interface UniquenessCheckOptions<T extends DatePeriod> {
  ruleId: string
  excludeId?: string
  newPeriod: DatePeriod
  existingPeriods: T[]
  componentName: string
  entityName?: string
  additionalFilter?: (period: T) => boolean
}

export interface UniquenessCheckResult {
  isDuplicate: boolean
  overlappingEntries?: DatePeriod[]
  existingName?: string
}

/**
 * Generic function to check for overlapping periods in a list of existing periods
 * This is used by all uniqueness check functions across different tabs
 *
 * @param options - Configuration options for the uniqueness check
 * @returns Result indicating if duplicates were found
 */
export const checkPeriodUniqueness = <T extends DatePeriod & { name?: string; code?: string }>(
  options: UniquenessCheckOptions<T>
): UniquenessCheckResult => {
  const { newPeriod, existingPeriods, additionalFilter } = options

  // Apply additional filter if provided (e.g., filter by relatedId)
  const filteredPeriods = additionalFilter ? existingPeriods.filter(additionalFilter) : existingPeriods

  // Find overlapping periods
  const overlappingPeriods = findOverlappingPeriods(newPeriod, filteredPeriods)

  if (overlappingPeriods.length > 0) {
    // Return the first duplicate's name for pre-filling (if available)
    const firstDuplicate = overlappingPeriods[0]
    return {
      isDuplicate: true,
      overlappingEntries: overlappingPeriods,
      existingName: firstDuplicate.name
    }
  }

  return { isDuplicate: false }
}
