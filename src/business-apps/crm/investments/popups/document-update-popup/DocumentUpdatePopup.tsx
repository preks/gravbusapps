import React, { useMemo } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DocumentPopup } from '../document-popup/DocumentPopup';

export interface DocumentUpdatePopupProps extends BusinessAppContextProps {
  initialValues?: any;
}

const DocumentUpdatePopup: React.FC<DocumentUpdatePopupProps> = ({ initialValues = {}, ...props }) => {
  // Extract document information from the context to pass to DocumentPopup
  const documentUpdateInitialValues = useMemo(() => {
    const src = { ...(props as any), ...(initialValues as any) } as any;
    const ad = src?.additionalData || {};
    const payload = ad?.payload || ad?.psi_taskPayload?.psi_initialParameters?.payload || ad?.psi_taskPayload?.initialParameters?.payload || {};
    const docFromAd = ad?.investmentDocument || ad?.psi_taskPayload?.psi_initialParameters?.investmentDocument || ad?.psi_taskPayload?.initialParameters?.investmentDocument || payload?.investmentDocument;
    
    // Extract document ID and other data
    const documentId = src?.documentId || src?.investmentDocumentId || docFromAd?.id || payload?.documentId || payload?.investmentDocumentId || '';
    
    // Extract entity information
    const urlParams = new URLSearchParams(window.location.search);
    const accountId = src?.accountId || src?.account || docFromAd?.account || urlParams.get('accountId') || '';
    const contactId = src?.contactId || src?.contact || docFromAd?.contact || urlParams.get('contactId') || '';
    const leadId = src?.leadId || src?.lead || docFromAd?.lead || urlParams.get('leadId') || '';
    const opportunityId = src?.opportunityId || src?.opportunity || docFromAd?.opportunity || urlParams.get('opportunityId') || '';

    // Prepare the initial values for DocumentPopup in update mode
    return {
      ...initialValues,
      investmentDocument: {
        id: documentId,
        version: docFromAd?.version || 0,
        name: docFromAd?.name || '',
        documentGroupRef: docFromAd?.documentGroupRef,
        documentTypeRef: docFromAd?.documentTypeRef,
        description: docFromAd?.description || '',
        expirationDate: docFromAd?.expirationDate,
        parentDocument: docFromAd?.parentDocument,
        folder: docFromAd?.folder || false,
        // Entity associations
        account: accountId,
        contact: contactId,
        lead: leadId,
        opportunity: opportunityId,
      },
      // Pass through entity IDs
      accountId,
      contactId,
      leadId,
      opportunityId,
      // Pass through any additional data
      ...src,
    };
  }, [initialValues, props]);

  // Use DocumentPopup in update mode
  return (
    <DocumentPopup
      {...props}
      initialValues={documentUpdateInitialValues}
    />
  );
};

export default DocumentUpdatePopup;