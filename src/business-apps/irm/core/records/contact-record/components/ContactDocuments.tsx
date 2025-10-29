import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentDocumentsByContactId } from '@/common/data/investment/hooks/useInvestmentContacts'
import DocumentSection from '@/common/components/common-relations/record-sections/document-section/DocumentSection'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/business-apps/irm/common/hooks/useInvestmentDocuments'
import { createDocumentActions } from '@/business-apps/irm/common/utils/createDocumentActions'

interface ContactDocumentsProps {
  contactId: string
  context: BusinessAppContextProps
}

const ContactDocuments: React.FC<ContactDocumentsProps> = ({ contactId, context }) => {
  // Fetch documents using the existing hook
  const { fetchInvestmentDocumentsByContactId } = useGetInvestmentDocumentsByContactId(context)

  // Use shared hook for document management
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: contactId,
    context,
    fetchDocuments: fetchInvestmentDocumentsByContactId
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

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      externalContextData: {
        contactId,
        entityType: 'contact'
      },
      prefixDataTestId: 'contact-document-delete'
    }),
    [contactId]
  )

  // Use shared document actions
  const customActions = useMemo(() => createDocumentActions({ entityType: 'contact' }), [])

  return (
    <DocumentSection
      entityId={contactId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={{
        baseEndpoint: '/investment-relations',
        entityFieldName: 'contact',
        documentFieldName: 'investmentDocument'
      }}
      enableGraphQLSearch={true}
      graphQLSearchConfig={{
        entityType: 'contact'
      }}
      customActions={customActions}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      deleteActionProps={documentDeleteActionProps}
      data-testid="contact-document-section"
      {...context}
    />
  )
}

export { ContactDocuments }
export default ContactDocuments
