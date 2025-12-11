import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'
import { createDocumentSectionActions } from '@/common/utils/documentSectionActions'
import { getIrmDocumentApiConfig, useGetIrmDocuments } from '@/business-apps/irm/common/utils/documentUtils'

interface LeadDocumentsProps {
  leadId: string
  context: BusinessAppContextProps
}

const LeadDocuments: React.FC<LeadDocumentsProps> = ({ leadId, context }) => {
  // Fetch documents using the generic IRM hook
  const { fetchDocuments } = useGetIrmDocuments('lead', context)

  // Use shared hook for document management
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: leadId,
    context,
    fetchDocuments
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

  // Use shared document actions
  const customActions = useMemo(
    () =>
      createDocumentSectionActions({
        domain: 'investment-relations',
        documentFieldName: 'investmentDocument',
        entityType: 'lead',
        updateProcessName: 'updateInvestmentDocument',
        deleteEndpoint: '/investment-relations/deleteInvestmentDocument'
      }),
    []
  )

  return (
    <DocumentSection
      entityId={leadId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={getIrmDocumentApiConfig('lead')}
      customActions={customActions}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      data-testid="lead-document-section"
      {...context}
    />
  )
}

export { LeadDocuments }
export default LeadDocuments
