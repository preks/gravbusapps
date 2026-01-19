import React from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DeleteConfirmPopup } from '@/common/components/common-relations/popups/delete-confirm-popup'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

export interface SimpleDocumentDeletePopupProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  documentId: string
  documentVersion?: number
  documentName: string

  // Entity scoping (at least one should be present)
  opportunityId?: string
  accountId?: string
  contactId?: string
  leadId?: string

  onSuccess?: () => void
  onError?: (error: any) => void

  'data-testid'?: string
}

const SimpleDocumentDeletePopup: React.FC<SimpleDocumentDeletePopupProps> = ({
  isOpen,
  onClose,
  documentId,
  documentVersion,
  documentName,
  accessToken,
  onSuccess,
  onError,
  'data-testid': dataTestId = 'simple-document-delete-popup'
}) => {
  const flowContextName = FlowContextName.investmentDocumentDelete

  const externalContextData: Record<string, any> = {
    documentId,
    investmentDocumentId: documentId,
    investmentDocument: {
      id: documentId,
      ...(typeof documentVersion === 'number' ? { version: documentVersion } : {})
    }
  }

  return (
    <DeleteConfirmPopup
      isOpen={isOpen}
      onClose={onClose}
      itemTitle={documentName}
      itemType="document"
      accessToken={accessToken}
      flowContextName={flowContextName}
      externalContextData={externalContextData}
      onFlowSuccess={onSuccess}
      onFlowError={onError}
      data-testid={dataTestId}
    />
  )
}

export default SimpleDocumentDeletePopup
export { SimpleDocumentDeletePopup }
