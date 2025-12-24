import type { KogitoProcessInstance } from '@/common/network/kogito-process/KogitoProcessClient'
import { hasEntityField } from './usePendingProcessCheck.types'

/**
 * Check if a request should be aborted
 * @param signal - AbortSignal from AbortController
 * @param requestId - Current request ID
 * @param currentRequestId - Latest request ID from ref
 * @returns true if request should be aborted
 */
export const shouldAbortRequest = (
  signal: AbortSignal | undefined,
  requestId: number,
  currentRequestId: number
): boolean => {
  return signal?.aborted === true || requestId !== currentRequestId
}

/**
 * Filter processes to find real submissions (not orphans) for a specific employee
 * @param processes - All process instances
 * @param employeeId - Employee UUID
 * @param entityField - Entity field to check
 * @returns Filtered array of real submissions
 */
export const filterRealSubmissions = <TEntityField extends string>(
  processes: KogitoProcessInstance[],
  employeeId: string,
  entityField: TEntityField
): KogitoProcessInstance[] => {
  return processes.filter(process => {
    const isForEmployee = process.employeeId === employeeId

    // Type-safe property access using type guard
    if (!hasEntityField(process, entityField)) {
      return false
    }

    const hasEntityData = process[entityField] !== null && process[entityField] !== undefined

    return isForEmployee && hasEntityData
  })
}

/**
 * Log a warning if multiple pending processes exist for the same employee
 * @param submissions - Array of real submissions
 * @param employeeId - Employee UUID
 * @param processPath - Process path
 */
export const warnMultipleSubmissions = (
  submissions: KogitoProcessInstance[],
  employeeId: string,
  processPath: string
): void => {
  if (submissions.length > 1) {
    console.warn(`[usePendingProcessCheck] Multiple pending processes found for employee ${employeeId}`, {
      employeeId,
      processPath,
      count: submissions.length,
      processIds: submissions.map(p => p.id),
      submissions
    })
  }
}

/**
 * Check if an error is an AbortError
 * @param err - Error object
 * @returns true if error is an AbortError
 */
export const isAbortError = (err: unknown): boolean => {
  return err instanceof Error && err.name === 'AbortError'
}

/**
 * Get error message from unknown error
 * @param err - Error object
 * @returns Error message string
 */
export const getErrorMessage = (err: unknown): string => {
  return err instanceof Error ? err.message : 'Unknown error checking pending processes'
}
