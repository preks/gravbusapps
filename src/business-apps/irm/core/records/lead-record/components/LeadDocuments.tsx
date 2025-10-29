import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentDocumentsByLeadId } from '@/common/data/investment/hooks/useInvestmentLeads'
import DocumentSection from '@/common/components/common-relations/record-sections/document-section/DocumentSection'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/business-apps/irm/common/hooks/useInvestmentDocuments'
import { createDocumentActions } from '@/business-apps/irm/common/utils/createDocumentActions'

interface LeadDocumentsProps {
  leadId: string
  context: BusinessAppContextProps
}

const LeadDocuments: React.FC<LeadDocumentsProps> = ({ leadId, context }) => {
  // Fetch documents using the existing hook
  const { fetchInvestmentDocumentsByLeadId } = useGetInvestmentDocumentsByLeadId(context)

  // Use shared hook for document management
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: leadId,
    context,
    fetchDocuments: fetchInvestmentDocumentsByLeadId
  })

  // Memoized action props for document operations
  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        leadId,
        folder: true
      },
      prefixDataTestId: 'lead-document-create-folder'
    }),
    [leadId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        leadId
      },
      prefixDataTestId: 'lead-document-upload'
    }),
    [leadId]
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      externalContextData: {
        leadId,
        entityType: 'lead'
      },
      prefixDataTestId: 'lead-document-delete'
    }),
    [leadId]
  )

  // Use shared document actions
  const customActions = useMemo(() => createDocumentActions({ entityType: 'lead' }), [])

  return (
    <DocumentSection
      entityId={leadId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={{
        baseEndpoint: '/investment-relations',
        entityFieldName: 'lead',
        documentFieldName: 'investmentDocument'
      }}
      enableGraphQLSearch={true}
      graphQLSearchConfig={{
        entityType: 'lead'
      }}
      customActions={customActions}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      deleteActionProps={documentDeleteActionProps}
      data-testid="lead-document-section"
      {...context}
    />
  )
}

export { LeadDocuments }
export default LeadDocuments
