import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { OpportunityStatusUpdatePopup as CommonOpportunityStatusUpdatePopup } from '@/common/components/common-relations/popups/opportunity-status-update-popup'

/**
 * IRM-specific props (omits generic config that is hardcoded here)
 */
export interface IRMOpportunityStatusUpdatePopupProps extends BusinessAppContextProps {
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
 * IRM OpportunityStatusUpdatePopup - Investment Opportunities
 * Configures the generic popup with IRM-specific settings:
 * - catalogIdentifier: 'InvestmentOpportunityStatus'
 * - graphqlEntity: 'InvestmentOpportunity'
 * - payloadKey: 'investmentOpportunity'
 */
const OpportunityStatusUpdatePopup: React.FC<IRMOpportunityStatusUpdatePopupProps> = props => (
  <CommonOpportunityStatusUpdatePopup
    {...props}
    catalogIdentifier="InvestmentOpportunityStatus"
    graphqlEntity="InvestmentOpportunity"
    payloadKey="investmentOpportunity"
    isOpen={props.isOpen ?? true}
    onClose={props.onClose ?? (() => {})}
    data-testid={props['data-testid'] ?? 'irm-opportunity-status-update-popup'}
  />
)

export { OpportunityStatusUpdatePopup }
export type { IRMOpportunityStatusUpdatePopupProps as OpportunityStatusUpdatePopupProps }
export default OpportunityStatusUpdatePopup
