import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { KogitoProcessClient, type KogitoProcessInstance } from '@/common/network/kogito-process/KogitoProcessClient'
import type { PendingProcessCheckConfig, PendingProcessMetadata } from './usePendingProcessCheck.types'
import { shouldAbortRequest, isAbortError, getErrorMessage } from './usePendingProcessCheckUtils'

export type {
  PendingProcessCheckConfig,
  PendingProcessMetadata,
  KogitoProcessKnownKeys
} from './usePendingProcessCheck.types'
export { EMPLOYEE_PROCESS_CONFIGS } from './pendingProcessConfigs'

/**
 * Hook to check if there's a pending process submission for a specific employee
 *
 * This prevents duplicate submissions by checking if there's already an active
 * Kogito process instance using the NEW BACKEND with status field.
 *
 * 🔥 HOW IT WORKS (NEW SIMPLIFIED APPROACH):
 * - Queries the Kogito process REST endpoint with employeeId filter
 * - Backend returns only that employee's processes
 * - Checks if any process has status = PENDING or PROCESSING
 * - Returns metadata for UI display using consumer-provided display configuration
 *
 * @param config - Configuration object for the pending process check
 *
 * @returns Object with pending process status, metadata, loading state, and error
 *
 * @example
 * ```typescript
 * // Using predefined config with custom display
 * const { hasPendingProcess, pendingProcessMetadata, isLoading } = usePendingProcessCheck({
 *   ...EMPLOYEE_PROCESS_CONFIGS.CHANGE_BANK_ACCOUNT,
 *   employeeId,
 *   accessToken,
 *   displayConfig: {
 *     processType: t('change-bank-account-title'),
 *     statusMessage: t('pending-approval-status')
 *   }
 * })
 *
 * // Using custom config for any process
 * const { hasPendingProcess, pendingProcessMetadata } = usePendingProcessCheck({
 *   processPath: 'customProcess',
 *   employeeId,
 *   accessToken,
 *   displayConfig: {
 *     processType: 'My Custom Process',
 *     statusMessage: 'Pending Review'
 *   }
 * })
 * ```
 */
export const usePendingProcessCheck = (config: PendingProcessCheckConfig) => {
  const { processPath, employeeId, accessToken, enabled = true, displayConfig } = config

  const [hasPendingProcess, setHasPendingProcess] = useState<boolean>(false)
  const [pendingProcess, setPendingProcess] = useState<KogitoProcessInstance | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Track request order to prevent race conditions
  const requestIdRef = useRef(0)

  /**
   * Generate metadata from the pending process for UI display
   */
  const pendingProcessMetadata = useMemo<PendingProcessMetadata | null>(() => {
    if (!pendingProcess || !hasPendingProcess) return null

    return {
      processId: pendingProcess.id,
      processType: displayConfig?.processType,
      statusMessage: displayConfig?.statusMessage
    }
  }, [pendingProcess, hasPendingProcess, displayConfig])

  const checkPendingProcesses = useCallback(
    async (signal?: AbortSignal) => {
      // Increment request ID to track this specific call
      const requestId = ++requestIdRef.current

      // Skip if disabled or missing required params
      if (!enabled || !accessToken || !employeeId || !processPath) {
        setIsLoading(false)
        setHasPendingProcess(false)
        setPendingProcess(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const kogitoClient = new KogitoProcessClient(accessToken)

        // Query process instances for this employee (backend filters by employeeId!)
        const processes = await kogitoClient.getProcessInstances(processPath, {
          employeeId,
          signal
        })

        // Check if request was aborted or a newer request has been made
        if (shouldAbortRequest(signal, requestId, requestIdRef.current)) return

        // Find any process with PENDING or PROCESSING status
        const pendingProcesses = processes.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING')
        const hasPending = pendingProcesses.length > 0

        // Warn if multiple pending processes exist (indicates potential data issue)
        if (pendingProcesses.length > 1) {
          console.warn(`[usePendingProcessCheck] Multiple pending processes found`, {
            employeeId,
            processPath,
            count: pendingProcesses.length,
            processIds: pendingProcesses.map(p => p.id)
          })
        }

        // Check again before setting state
        if (shouldAbortRequest(signal, requestId, requestIdRef.current)) return

        setHasPendingProcess(hasPending)
        setPendingProcess(hasPending ? pendingProcesses[0] : null)
      } catch (err) {
        // Don't update state if request was aborted
        if (isAbortError(err)) return

        // Ignore if a newer request has been made or aborted
        if (shouldAbortRequest(signal, requestId, requestIdRef.current)) return

        const errorMessage = getErrorMessage(err)
        setError(errorMessage)
        console.error('[usePendingProcessCheck] Failed to check for pending processes:', err)

        setHasPendingProcess(false)
        setPendingProcess(null)
      } finally {
        // Only update loading state if not aborted and this is still the current request
        if (!shouldAbortRequest(signal, requestId, requestIdRef.current)) {
          setIsLoading(false)
        }
      }
    },
    [processPath, employeeId, accessToken, enabled]
  )

  useEffect(() => {
    const abortController = new AbortController()

    checkPendingProcesses(abortController.signal)

    return () => {
      abortController.abort()
    }
  }, [checkPendingProcesses])

  return {
    /**
     * Whether there's a pending process submission for this employee
     */
    hasPendingProcess,

    /**
     * The pending process instance details (if any)
     */
    pendingProcess,

    /**
     * Metadata about the pending process formatted for UI display
     * Includes processId and any display configuration provided
     */
    pendingProcessMetadata,

    /**
     * Whether the check is currently running
     */
    isLoading,

    /**
     * Error message if check failed
     */
    error,

    /**
     * Function to manually re-check for pending processes
     */
    refetch: checkPendingProcesses
  }
}
