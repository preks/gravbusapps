import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DeleteConfirmationPopup } from '../delete-confirmation-popup/DeleteConfirmationPopup';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

export interface ActivityDeletionPopupProps extends BusinessAppContextProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  activityVersion?: number;
  activityTitle: string;

  // Entity scoping (at least one should be present)
  opportunityId?: string;
  accountId?: string;
  contactId?: string;
  leadId?: string;

  // Domain selection (default CRM)
  domain?: 'crm' | 'investments';

  onSuccess?: () => void;
  onError?: (error: any) => void;

  'data-testid'?: string;
}

/**
 * ActivityDeletionPopup
 * Thin wrapper around the universal DeleteConfirmationPopup configured for Sales/Investment Activities.
 * - Routes delete through Flow Registry with correct context per domain
 * - Passes entity scoping into externalContextData
 */
const ActivityDeletionPopup: React.FC<ActivityDeletionPopupProps> = ({
  isOpen,
  onClose,
  activityId,
  activityVersion,
  activityTitle,
  opportunityId,
  accountId,
  contactId,
  leadId,
  accessToken,
  domain = 'crm',
  onSuccess,
  onError,
  'data-testid': dataTestId = 'activity-deletion-popup',
}) => {
  const flowContextName = domain === 'investments'
    ? FlowContextName.investmentActivityDelete
    : FlowContextName.customerActivityDelete;

  const externalContextData: Record<string, any> = {
    activityId,
    // Provide nested model required by each domain
    ...(domain === 'investments'
      ? {
          investmentActivityId: activityId,
          investmentActivity: {
            id: activityId,
            ...(typeof activityVersion === 'number' ? { version: activityVersion } : {}),
            // Do NOT pass parent refs for delete
          },
        }
      : {
          salesActivity: {
            id: activityId,
            ...(typeof activityVersion === 'number' ? { version: activityVersion } : {}),
          },
        }),
  };

  return (
    <DeleteConfirmationPopup
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
  );
};

export default ActivityDeletionPopup;
export { ActivityDeletionPopup };


