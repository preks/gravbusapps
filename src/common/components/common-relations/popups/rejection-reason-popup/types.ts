/**
 * Types for generic rejection reason popup component
 */

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { RejectionReasonEntityType } from '@/common/data/investment/payloads/rejectionReasonPayloads'

/**
 * Generic rejection reason popup props
 */
export interface RejectionReasonPopupProps extends BusinessAppContextProps {
  /** Type of entity (lead or opportunity) */
  entityType: RejectionReasonEntityType
  /** ID of the entity */
  entityId: string
  /** Function to call when popup should be closed */
  onClose: () => void
}
