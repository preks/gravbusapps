/**
 * Utility functions for usePendingProcessCheck hook
 *
 * NEW BACKEND: Simplified - no need for complex filtering!
 * Backend now returns status field and supports employeeId query parameter.
 */

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
