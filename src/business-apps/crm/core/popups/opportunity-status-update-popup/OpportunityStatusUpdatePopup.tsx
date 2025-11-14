import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { OpportunityStatusUpdatePopup as CommonOpportunityStatusUpdatePopup } from '@/common/components/common-relations/popups/opportunity-status-update-popup'

/**
 * CRM-specific props (omits generic config that is hardcoded here)
 */
export interface CRMOpportunityStatusUpdatePopupProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  opportunityId?: string
  opportunityVersion?: number
  opportunityName?: string
  onSuccess?: () => void
  onError?: (error: any) => void
  'data-testid'?: string
}

/**
 * CRM OpportunityStatusUpdatePopup - Sales Opportunities
 * Configures the generic popup with CRM-specific settings:
 * - catalogIdentifier: 'SalesOpportunityStatus'
 * - graphqlEntity: 'Opportunity'
 * - payloadKey: 'opportunity'
 */
const OpportunityStatusUpdatePopup: React.FC<CRMOpportunityStatusUpdatePopupProps> = props => (
  <CommonOpportunityStatusUpdatePopup
    {...props}
    catalogIdentifier="SalesOpportunityStatus"
    graphqlEntity="Opportunity"
    payloadKey="opportunity"
    isOpen={props.isOpen ?? true}
    onClose={props.onClose ?? (() => {})}
    data-testid={props['data-testid'] ?? 'crm-opportunity-status-update-popup'}
  />
)

export { OpportunityStatusUpdatePopup }
export type { CRMOpportunityStatusUpdatePopupProps as OpportunityStatusUpdatePopupProps }
export default OpportunityStatusUpdatePopup
