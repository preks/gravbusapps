import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'
import { createDocumentSectionActions } from '@/common/utils/documentSectionActions'
import { getIrmDocumentApiConfig, useGetIrmDocuments } from '@/business-apps/irm/common/utils/documentUtils'

interface ContactDocumentsProps {
  contactId: string
  context: BusinessAppContextProps
}

const ContactDocuments: React.FC<ContactDocumentsProps> = ({ contactId, context }) => {
  // Fetch documents using the generic IRM hook
  const { fetchDocuments } = useGetIrmDocuments('contact', context)

  // Use shared hook for document management
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: contactId,
    context,
    fetchDocuments
  })

  // Memoized action props for document operations
  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        contactId,
        folder: true
      },
      prefixDataTestId: 'contact-document-create-folder'
    }),
    [contactId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        contactId
      },
      prefixDataTestId: 'contact-document-upload'
    }),
    [contactId]
  )

  // Use shared document actions
  const customActions = useMemo(
    () =>
      createDocumentSectionActions({
        domain: 'investment-relations',
        documentFieldName: 'investmentDocument',
        entityType: 'contact',
        updateProcessName: 'updateInvestmentDocument',
        deleteEndpoint: '/investment-relations/deleteInvestmentDocument'
      }),
    []
  )

  return (
    <DocumentSection
      entityId={contactId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={getIrmDocumentApiConfig('contact')}
      customActions={customActions}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      data-testid="contact-document-section"
      {...context}
    />
  )
}

export { ContactDocuments }
export default ContactDocuments
