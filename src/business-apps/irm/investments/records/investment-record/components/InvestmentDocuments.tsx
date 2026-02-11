import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'
import { getIrmDocumentApiConfig, useGetIrmDocuments } from '@/business-apps/irm/common/utils/documentUtils'

interface InvestmentDocumentsProps {
  investmentId: string
  context: BusinessAppContextProps
}

const InvestmentDocuments: React.FC<InvestmentDocumentsProps> = ({ investmentId, context }) => {
  // Fetch documents using the generic IRM hook
  const { fetchDocuments } = useGetIrmDocuments('investment', context)

  // Use shared hook for document management
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: investmentId,
    context,
    fetchDocuments,
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  // Memoized action props for document operations - EXACTLY like opportunity record
  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        investmentId,
        folder: true
      },
      prefixDataTestId: 'investment-document-create-folder'
    }),
    [investmentId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        investmentId
      },
      prefixDataTestId: 'investment-document-upload'
    }),
    [investmentId]
  )

  const documentUpdateActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentUpdate],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'investment-document-update'
    }),
    []
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'investment-document-delete'
    }),
    []
  )

  return (
    <DocumentSection
      entityId={investmentId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={getIrmDocumentApiConfig('investment')}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      updateActionProps={documentUpdateActionProps}
      deleteActionProps={documentDeleteActionProps}
      data-testid="investment-document-section"
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      additionalData={context.additionalData}
    />
  )
}

export { InvestmentDocuments }
export default InvestmentDocuments
