import React, { useState, useEffect } from 'react';
import { BusinessAppContextProps } from '@/common/BusinessAppContext';
import { DocumentSection, type DocumentItem } from '@/common/components/common-relations/record-sections';
import { FlowContextName } from '@/common/types/FlowRegistryTypes';
import { useGetInvestmentDocumentsByContactId } from '@/common/data/investment/hooks/useInvestmentContacts';
import type { InvestmentDocument } from '@/common/data/investment/types';
import { useProcessCompletion } from '@/common/hooks/useProcessCompletion';
import { Trash2, Edit } from 'lucide-react';

interface ContactDocumentsSectionProps extends BusinessAppContextProps {
  contactId: string;
}

export const ContactDocumentsSection: React.FC<ContactDocumentsSectionProps> = ({ 
  contactId, 
  ...context 
}) => {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { fetchInvestmentDocumentsByContactId } = useGetInvestmentDocumentsByContactId(context);

  const fetchDocuments = async () => {
    if (!contactId || !context.accessToken) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const investmentDocs = await fetchInvestmentDocumentsByContactId(contactId);
      
      // Transform InvestmentDocument to DocumentItem format
      const documentItems: DocumentItem[] = investmentDocs.map((doc: InvestmentDocument) => ({
        id: doc.id,
        name: doc.name,
        description: doc.description,
        createdAt: doc.createdAt,
        expirationDate: doc.expirationDate,
        documentType: doc.documentType,
        documentGroup: doc.documentGroup,
        file: doc.file,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        createdBy: doc.createdBy,
        parentDocument: typeof doc.parentDocument === 'object' ? doc.parentDocument?.id ?? null : doc.parentDocument ?? null,
        folder: !doc.mimeType && !doc.file && !doc.fileSize, // Infer folder from lack of file properties
        verified: doc.verified,
        verificationDate: doc.verificationDate,
        authenticated: doc.authenticated,
        authenticationDate: doc.authenticationDate,
        mandatory: doc.mandatory,
        version: doc.version
      }));

      setDocuments(documentItems);
    } catch (err) {
      console.error('Error fetching contact documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [contactId, context.accessToken]);

  // Listen for process completion to refetch documents after upload
  useProcessCompletion({
    onSuccess: () => {
      console.log('Process completed, refreshing contact documents');
      fetchDocuments();
    },
    onFailure: () => {
      console.log('Document upload process failed');
    }
  });

  return (
    <DocumentSection
      {...context}
      entityId={contactId}
      documents={documents}
      isLoading={loading}
      error={error}
      onRefresh={fetchDocuments}
      apiConfig={{
        baseEndpoint: '/investment-relations',
        entityFieldName: 'contact',
        documentFieldName: 'investmentDocument'
      }}
      customActions={[
        {
          key: 'delete',
          label: 'Delete',
          icon: <Trash2 className="gba:h-4 gba:w-4" />,
          apiEndpoint: '/investment-relations/deleteInvestmentDocument',
          confirmMessage: 'Are you sure you want to delete this document?'
        },
        {
          key: 'update',
          label: 'Update',
          icon: <Edit className="gba:h-4 gba:w-4" />,
          apiEndpoint: '/investment-relations/updateInvestmentDocument'
        }
      ]}
      uploadActionProps={{
        contextsArray: [FlowContextName.investmentDocumentCreate],
        externalContextData: { 
          contactId: contactId,
          entityType: 'contact'
        },
        prefixDataTestId: 'investment-contact-document-upload'
      }}
      createFolderActionProps={{
        contextsArray: [FlowContextName.investmentDocumentCreate],
        externalContextData: { 
          contactId: contactId,
          entityType: 'contact',
          folder: true
        },
        prefixDataTestId: 'investment-contact-document-create-folder'
      }}
      viewActionProps={{
        contextsArray: [FlowContextName.investmentDocumentView],
        externalContextData: { 
          contactId: contactId,
          entityType: 'contact'
        },
        prefixDataTestId: 'investment-contact-document-view'
      }}
      downloadActionProps={{
        contextsArray: [FlowContextName.investmentDocumentDownload],
        externalContextData: { 
          contactId: contactId,
          entityType: 'contact'
        },
        prefixDataTestId: 'investment-contact-document-download'
      }}
      deleteActionProps={{
        contextsArray: [FlowContextName.investmentDocumentDelete],
        externalContextData: { 
          contactId: contactId,
          entityType: 'contact'
        },
        prefixDataTestId: 'investment-contact-document-delete'
      }}
      data-testid="investment-contact-documents-section"
    />
  );
};

export default ContactDocumentsSection;
