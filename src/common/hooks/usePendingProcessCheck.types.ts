/**
 * Extract known keys from KogitoProcessInstance (excluding index signature)
 */
export type KogitoProcessKnownKeys = 'id' | 'employeeId' | 'createdAt' | 'startedAt' | 'state'

/**
 * Configuration for checking pending process submissions (NEW BACKEND - Simplified!)
 *
 * With the new backend, we no longer need to check entity fields.
 * The backend now returns a status field (PENDING, PROCESSING, etc.)
 * and supports filtering by employeeId query parameter.
 */
export interface PendingProcessCheckConfig {
  /** Kogito process REST endpoint path (e.g., 'changeBankAccount') */
  processPath: string

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
