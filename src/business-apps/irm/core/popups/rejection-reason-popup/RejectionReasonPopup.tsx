/**
 * Rejection Reason Popup - Router Component
 * Routes to appropriate component based on entity type (lead or opportunity)
 */

import React from 'react'
import { Alert } from '@newwork/nw-design-system'
import { RejectionReasonPopup as RejectionReasonPopupComponent } from '@/common/components/common-relations/popups/rejection-reason-popup'
import { RejectionReasonPopupProps } from './types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const prefixDataTestId = 'rejection-reason-popup'

/**
 * Main rejection reason popup component
 * Determines entity type and routes to appropriate generic popup component
 */
export const RejectionReasonPopup: React.FC<RejectionReasonPopupProps> = ({
  onClose,
  accessToken,
  userInfo,
  additionalData
}) => {
  // Extract entity IDs from additionalData
  const leadId = additionalData?.leadId || additionalData?.psi_taskPayload?.psi_initialParameters?.leadId
  const opportunityId =
    additionalData?.opportunityId || additionalData?.psi_taskPayload?.psi_initialParameters?.opportunityId

  // Validate that at least one entity ID is provided
  if (!leadId && !opportunityId) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-missing-entity`}>
        {getTranslationFromI18nKeyAndLabel(
          'rejection.popup.error.missingEntity',
          'No lead or opportunity ID found in context data'
        )}
      </Alert>
    )
  }

  // Route to lead rejection
  if (leadId) {
    return (
      <RejectionReasonPopupComponent
        entityType="LEAD"
        entityId={leadId}
        onClose={onClose}
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
      />
    )
  }

  // Route to opportunity rejection
  if (opportunityId) {
    return (
      <RejectionReasonPopupComponent
        entityType="OPPORTUNITY"
        entityId={opportunityId}
        onClose={onClose}
        accessToken={accessToken}
        userInfo={userInfo}
        additionalData={additionalData}
      />
    )
  }

  return null
}

export default RejectionReasonPopup
