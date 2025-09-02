import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DeleteConfirmationPopup } from '@/common/components';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

export interface ActivityDeletionPopupProps extends BusinessAppContextProps {
  isOpen: boolean;
  onClose: () => void;
  activityId: string;
  activityVersion?: number;
  activityTitle: string;
  opportunityId?: string;
  accountId?: string;
  contactId?: string;
  leadId?: string;
  onSuccess?: () => void;
  onError?: (error: any) => void;
  'data-testid'?: string;
}

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
  onSuccess,
  onError,
  'data-testid': dataTestId = 'activity-deletion-popup',
}) => {
  const externalContextData: Record<string, any> = {
    activityId,
    ...(opportunityId ? { opportunityId } : {}),
    ...(accountId ? { accountId } : {}),
    ...(contactId ? { contactId } : {}),
    ...(leadId ? { leadId } : {}),
    salesActivity: {
      id: activityId,
      ...(typeof activityVersion === 'number' ? { version: activityVersion } : {}),
      ...(opportunityId ? { opportunity: opportunityId } : {}),
      ...(accountId ? { account: accountId } : {}),
      ...(contactId ? { contact: contactId } : {}),
      ...(leadId ? { lead: leadId } : {}),
    },
  };

  return (
    <DeleteConfirmationPopup
      isOpen={isOpen}
      onClose={onClose}
      itemTitle={activityTitle}
      itemType="activity"
      accessToken={accessToken}
      flowContextName={FlowContextName.customerActivityDelete}
      externalContextData={externalContextData}
      onFlowSuccess={onSuccess}
      onFlowError={onError}
      data-testid={dataTestId}
    />
  );
};

export default ActivityDeletionPopup;
export { ActivityDeletionPopup };


