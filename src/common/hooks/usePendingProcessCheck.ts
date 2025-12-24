import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { KogitoProcessClient, type KogitoProcessInstance } from '@/common/network/kogito-process/KogitoProcessClient'
import type { PendingProcessCheckConfig, PendingProcessMetadata } from './usePendingProcessCheck.types'
import {
  shouldAbortRequest,
  filterRealSubmissions,
  warnMultipleSubmissions,
  isAbortError,
  getErrorMessage
} from './usePendingProcessCheckUtils'

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
 * Kogito process instance with actual data (not an orphan process).
 *
 * 🔥 HOW IT WORKS:
 * - Queries the Kogito process REST endpoint (e.g., /changeBankAccount)
 * - Orphan processes have entityField: null (form opened but closed with X)
 * - Real submitted processes have entityField: {...data} (form filled and submitted)
 * - Returns metadata for UI display using consumer-provided display configuration
 *
 * @template TEntityField - The entity field key to check (must be a valid key of KogitoProcessInstance)
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
 *   entityField: 'customData',
 *   employeeId,
 *   accessToken,
 *   displayConfig: {
 *     processType: 'My Custom Process',
 *     statusMessage: 'Pending Review'
 *   }
 * })
 * ```
 */
export const usePendingProcessCheck = <TEntityField extends string = string>(
  config: PendingProcessCheckConfig<TEntityField>
) => {
  const { processPath, entityField, employeeId, accessToken, enabled = true, displayConfig } = config

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
      if (!enabled || !accessToken || !employeeId || !processPath || !entityField) {
        setIsLoading(false)
        setHasPendingProcess(false)
        setPendingProcess(null)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const kogitoClient = new KogitoProcessClient(accessToken)

        // Query all active process instances for this process type with abort signal
        const allProcesses = await kogitoClient.getProcessInstances(processPath, { signal })

        // Check if request was aborted or a newer request has been made
        if (shouldAbortRequest(signal, requestId, requestIdRef.current)) return

        // Filter for real submissions (not orphan processes)
        const realSubmissions = filterRealSubmissions(allProcesses, employeeId, entityField)
        const hasPending = realSubmissions.length > 0

        // Warn if multiple pending processes exist (indicates potential data issue)
        warnMultipleSubmissions(realSubmissions, employeeId, processPath)

        // Check again before setting state
        if (shouldAbortRequest(signal, requestId, requestIdRef.current)) return

        setHasPendingProcess(hasPending)
        setPendingProcess(hasPending ? realSubmissions[0] : null)
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
    [processPath, entityField, employeeId, accessToken, enabled]
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
