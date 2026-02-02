import type { SupportedLocale } from '@newwork/nw-design-system'

/**
 * Props for the PendingSubmissionMessage component
 */
export interface PendingSubmissionMessageProps {
  /** Display name of the process type (e.g., "Bank Account Change", "Bonus Grant") */
  processType: string
  /** When the submission was made (optional - will show "Recently" if not provided) */
  submissionDate?: string | Date
  /** Optional process instance ID for debugging */
  processId?: string
  /**
   * Status message describing what's happening (e.g., "Awaiting Approval", "awaiting acknowledgment")
   * If not provided, defaults to localized "Pending" status via translation key 'pending-status-pending'
   */
  statusMessage?: string
  /** Optional callback when close button is clicked */
  onClose?: () => void
  /** Optional locale override */
  locale?: SupportedLocale
  /** Optional test id for testing */
  'data-testid'?: string
}
