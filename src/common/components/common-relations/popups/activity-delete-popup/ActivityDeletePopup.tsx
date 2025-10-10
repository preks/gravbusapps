import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DeleteConfirmPopup } from '@/common/components/common-relations/popups/delete-confirm-popup'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface ActivityDeletePopupProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  activityId: string
  activityVersion?: number
  activityTitle: string

  // Entity scoping (at least one should be present)
  opportunityId?: string
  accountId?: string
  contactId?: string
  leadId?: string

  // Domain selection (default CRM)
  domain?: 'crm' | 'investments'

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

/**
 * ActivityDeletePopup
 * Thin wrapper around the universal DeleteConfirmationPopup configured for Sales/Investment Activities.
 * - Routes delete through Flow Registry with correct context per domain
 * - Passes entity scoping into externalContextData
 */
export const ActivityDeletePopup: React.FC<ActivityDeletePopupProps> = ({
  isOpen,
  onClose,
  activityId,
  activityVersion,
  activityTitle,
  accessToken,
  domain = 'crm',
  onSuccess,
  onError,
  'data-testid': dataTestId = 'activity-delete-popup'
}) => {
  const flowContextName =
    domain === 'investments' ? FlowContextName.investmentActivityDelete : FlowContextName.customerActivityDelete

  const externalContextData: Record<string, any> = {
    // Flow compatibility keys
    activityId,
    // Provide nested model required by each domain
    ...(domain === 'investments'
      ? {
          investmentActivityId: activityId,
          investmentActivity: {
            id: activityId,
            ...(typeof activityVersion === 'number' ? { version: activityVersion } : {})
          }
        }
      : {
          salesActivity: {
            id: activityId,
            ...(typeof activityVersion === 'number' ? { version: activityVersion } : {})
          }
        })
  }

  return (
    <DeleteConfirmPopup
      isOpen={isOpen}
      onClose={onClose}
      itemTitle={activityTitle}
      itemType="activity"
      accessToken={accessToken}
      flowContextName={flowContextName}
      externalContextData={externalContextData}
      onFlowSuccess={onSuccess}
      onFlowError={onError}
      data-testid={dataTestId}
    />
  )
}
