import type { KogitoProcessInstance } from '@/common/network/kogito-process/KogitoProcessClient'

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
 * Type guard to check if a property exists on a KogitoProcessInstance
 */
export const hasEntityField = <TEntityField extends string>(
  process: KogitoProcessInstance,
  entityField: TEntityField
): process is KogitoProcessInstance & Record<TEntityField, unknown> => {
  return entityField in process
}
