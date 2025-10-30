import { BusinessAppContextProps } from '@/common/BusinessAppContext'

/**
 * Source types for rejection reasons
 * Indicates which entity type the rejection reason is associated with
 */
export const REJECTION_REASON_SOURCE = {
  LEAD: 'LEAD',
  OPPORTUNITY: 'OPPORTUNITY',
  INVESTMENT: 'INVESTMENT'
} as const

export type RejectionReasonSource = (typeof REJECTION_REASON_SOURCE)[keyof typeof REJECTION_REASON_SOURCE]

/**
 * Main popup props interface
 * Used by the RejectionReasonPopup router component
 */
export interface RejectionReasonPopupProps extends BusinessAppContextProps {
  /** Function to call when popup should be closed */
  onClose: () => void
}

/**
 * Form data interface for rejection reason selection
 */
export interface RejectionReasonFormData {
  /** Array of catalog entry IDs representing selected rejection reasons */
  reasonRefs: string[]
  /** Optional additional description/notes */
  description?: string
}

/**
 * Rejection reason item from database
 * Represents a single rejection reason record
 */
export interface RejectionReasonItem {
  id: string
  version: number
  businessKey?: string
  recordState?: string
  activeTo?: string
  source: RejectionReasonSource
  description?: string
  /** Catalog reference ID (e.g., "InvestmentRejectionReason:v1:BUDGET") */
  rejectionReasonRef: string
  /** Reference to catalog entry with full details */
  rejectionReason?: {
    id: string
    code?: string
    value: string
  }
  /** UUID of associated lead (if source is LEAD) */
  lead?: string
  /** UUID of associated opportunity (if source is OPPORTUNITY) */
  opportunity?: string
  /** Audit fields */
  createdAt?: string
  createdBy?: string
  modifiedAt?: string
  modifiedBy?: string
}

/**
 * Lead-specific rejection component props
 */
export interface LeadRejectionComponentProps extends BusinessAppContextProps {
  onClose: () => void
  leadId: string
}

/**
 * Opportunity-specific rejection component props
 */
export interface OpportunityRejectionComponentProps extends BusinessAppContextProps {
  onClose: () => void
  opportunityId: string
}
