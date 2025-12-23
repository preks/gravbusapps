import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { KogitoProcessClient, type KogitoProcessInstance } from '@/common/network/kogito-process/KogitoProcessClient'

/**
 * Extract known keys from KogitoProcessInstance (excluding index signature)
 */
export type KogitoProcessKnownKeys = 'id' | 'employeeId' | 'createdAt' | 'startedAt' | 'state'

/**
 * Configuration for checking pending process submissions
 * @template TEntityField - The entity field key to check (must be a valid key of KogitoProcessInstance)
 */
export interface PendingProcessCheckConfig<TEntityField extends string = string> {
  /** Kogito process REST endpoint path (e.g., 'changeBankAccount') */
  processPath: string

  /** Entity field name to check for data (e.g., 'bankAccount') */
  entityField: TEntityField

  /** Employee UUID */
  employeeId: string

  /** JWT access token for API authentication */
  accessToken: string

  /** Enable/disable the check (default: true) */
  enabled?: boolean

  /** Optional display configuration for UI rendering */
  displayConfig?: {
    /** Human-readable process type name (e.g., 'Bank Account Change') */
    processType: string
    /** Status message to display (e.g., 'Pending', 'Awaiting Approval') */
    statusMessage: string
  }
}

/**
 * Metadata about a pending process submission
 */
export interface PendingProcessMetadata {
  /** Process instance ID */
  processId: string
  /** Human-readable process type name (if provided) */
  processType?: string
  /** Status message to display (if provided) */
  statusMessage?: string
}

/**
 * Predefined process configurations for common employee self-service processes
 * These are convenience constants - consumers can create their own configs
 */
export const EMPLOYEE_PROCESS_CONFIGS = {
  CHANGE_BANK_ACCOUNT: {
    processPath: 'changeBankAccount',
    entityField: 'bankAccount'
  } satisfies Pick<PendingProcessCheckConfig<'bankAccount'>, 'processPath' | 'entityField'>,
  CHANGE_ADDRESS: {
    processPath: 'changeAddress',
    entityField: 'address'
  } satisfies Pick<PendingProcessCheckConfig<'address'>, 'processPath' | 'entityField'>,
  CHANGE_PERSONAL_DATA: {
    processPath: 'changePersonalData',
    entityField: 'personalData'
  } satisfies Pick<PendingProcessCheckConfig<'personalData'>, 'processPath' | 'entityField'>,
  CHANGE_COMMUNICATION: {
    processPath: 'changeCommunication',
    entityField: 'communication'
  } satisfies Pick<PendingProcessCheckConfig<'communication'>, 'processPath' | 'entityField'>,
  GRANT_BONUS: {
    processPath: 'grantBonus',
    entityField: 'bonus'
  } satisfies Pick<PendingProcessCheckConfig<'bonus'>, 'processPath' | 'entityField'>,
  ADJUST_SALARY: {
    processPath: 'adjustSalary',
    entityField: 'salary'
  } satisfies Pick<PendingProcessCheckConfig<'salary'>, 'processPath' | 'entityField'>
} as const

/**
 * Type guard to check if a property exists on a KogitoProcessInstance
 */
const hasEntityField = <TEntityField extends string>(
  process: KogitoProcessInstance,
  entityField: TEntityField
): process is KogitoProcessInstance & Record<TEntityField, unknown> => {
  return entityField in process
}

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
        if (signal?.aborted || requestId !== requestIdRef.current) return

        // Filter for processes that:
        // 1. Belong to this specific employee
        // 2. Have actual entity data (not orphan processes)
        const realSubmissions = allProcesses.filter(process => {
          const isForEmployee = process.employeeId === employeeId

          // Type-safe property access using type guard
          if (!hasEntityField(process, entityField)) {
            return false
          }

          const hasEntityData = process[entityField] !== null && process[entityField] !== undefined

          return isForEmployee && hasEntityData
        })

        const hasPending = realSubmissions.length > 0

        // Warn if multiple pending processes exist (indicates potential data issue)
        if (realSubmissions.length > 1) {
          console.warn(`[usePendingProcessCheck] Multiple pending processes found for employee ${employeeId}`, {
            employeeId,
            processPath,
            count: realSubmissions.length,
            processIds: realSubmissions.map(p => p.id),
            submissions: realSubmissions
          })
        }

        // Check again before setting state
        if (signal?.aborted || requestId !== requestIdRef.current) return

        setHasPendingProcess(hasPending)
        setPendingProcess(hasPending ? realSubmissions[0] : null)
      } catch (err) {
        // Don't update state if request was aborted
        if (err instanceof Error && err.name === 'AbortError') {
          return
        }

        // Ignore if a newer request has been made
        if (requestId !== requestIdRef.current) return

        // Check if aborted before setting error state
        if (signal?.aborted) return

        const errorMessage = err instanceof Error ? err.message : 'Unknown error checking pending processes'
        setError(errorMessage)
        console.error('[usePendingProcessCheck] Failed to check for pending processes:', err)

        setHasPendingProcess(false)
        setPendingProcess(null)
      } finally {
        // Only update loading state if not aborted and this is still the current request
        if (!signal?.aborted && requestId === requestIdRef.current) {
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
