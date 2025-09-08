import React from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DeleteConfirmationPopup } from '../delete-confirmation-popup/DeleteConfirmationPopup';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';

export interface NoteDeletionPopupProps extends BusinessAppContextProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteVersion?: number;
  noteTitle: string;

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

const NoteDeletionPopup: React.FC<NoteDeletionPopupProps> = ({
  isOpen,
  onClose,
  noteId,
  noteVersion,
  noteTitle,
  accessToken,
  domain = 'crm',
  onSuccess,
  onError,
  'data-testid': dataTestId = 'note-deletion-popup',
}) => {
  const flowContextName = domain === 'investments'
    ? FlowContextName.investmentNoteDelete
    : FlowContextName.customerNoteDelete;

  const externalContextData: Record<string, any> = {
    noteId,
    ...(domain === 'investments'
      ? {
          investmentNoteId: noteId,
          investmentNote: {
            id: noteId,
            ...(typeof noteVersion === 'number' ? { version: noteVersion } : {}),
          },
        }
      : {
          crmNote: {
            id: noteId,
            ...(typeof noteVersion === 'number' ? { version: noteVersion } : {}),
          },
        }),
  };

  return (
    <DeleteConfirmationPopup
      isOpen={isOpen}
      onClose={onClose}
      itemTitle={noteTitle}
      itemType="note"
      accessToken={accessToken}
      flowContextName={flowContextName}
      externalContextData={externalContextData}
      onFlowSuccess={onSuccess}
      onFlowError={onError}
      data-testid={dataTestId}
    />
  );
};

export default NoteDeletionPopup;
export { NoteDeletionPopup };


