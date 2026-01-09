import dayjs from 'dayjs'
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
  const { newPeriod, existingPeriods, componentName, additionalFilter } = options

  // Apply additional filter if provided (e.g., filter by relatedId)
  const filteredPeriods = additionalFilter ? existingPeriods.filter(additionalFilter) : existingPeriods

  // Find overlapping periods
  const overlappingPeriods = findOverlappingPeriods(newPeriod, filteredPeriods)

  if (overlappingPeriods.length > 0) {
    console.log(`[${componentName}] DUPLICATE FOUND:`, {
      newPeriod: {
        from: dayjs(newPeriod.activeFrom).format('YYYY-MM-DD'),
        to: newPeriod.activeTo ? dayjs(newPeriod.activeTo).format('YYYY-MM-DD') : 'infinite'
      },
      overlappingEntries: overlappingPeriods.map(p => ({
        id: (p as any).id,
        code: p.code,
        name: p.name,
        from: dayjs(p.activeFrom).format('YYYY-MM-DD'),
        to: p.activeTo ? dayjs(p.activeTo).format('YYYY-MM-DD') : 'infinite'
      })),
      isDuplicate: true
    })

    // Return the first duplicate's name for pre-filling (if available)
    const firstDuplicate = overlappingPeriods[0]
    return {
      isDuplicate: true,
      overlappingEntries: overlappingPeriods,
      existingName: firstDuplicate.name
    }
  }

  console.log(`[${componentName}] No overlapping duplicates found - period is unique`)
  return { isDuplicate: false }
}

/**
 * Logs the overlap check details for debugging
 */
export const logOverlapCheck = (
  componentName: string,
  newPeriod: DatePeriod,
  overlappingPeriods: DatePeriod[]
): void => {
  console.log(`[${componentName}] Overlap check:`, {
    newPeriod: {
      from: dayjs(newPeriod.activeFrom).format('YYYY-MM-DD'),
      to: newPeriod.activeTo ? dayjs(newPeriod.activeTo).format('YYYY-MM-DD') : 'infinite'
    },
    overlappingPeriods: overlappingPeriods.map(p => ({
      id: (p as any).id,
      code: (p as any).code,
      from: dayjs(p.activeFrom).format('YYYY-MM-DD'),
      to: p.activeTo ? dayjs(p.activeTo).format('YYYY-MM-DD') : 'infinite'
    }))
  })
}

/**
 * Logs GraphQL query variables for debugging
 */
export const logGraphQLQuery = (componentName: string, variables: Record<string, any>): void => {
  console.log(`[${componentName}] GraphQL query variables:`, variables)
}

/**
 * Logs GraphQL response for debugging
 */
export const logGraphQLResponse = <T>(
  componentName: string,
  entityName: string,
  result: { [key: string]: T[] }
): void => {
  const data = result[entityName] || []
  console.log(`[${componentName}] GraphQL response:`, {
    result,
    foundCount: data.length,
    allMatchingEntries: data
  })
}

/**
 * Logs the start of a uniqueness check
 */
export const logUniquenessCheckStart = (
  componentName: string,
  checkName: string,
  params: Record<string, any>
): void => {
  console.log(`[${componentName}] ${checkName} called:`, params)
}
