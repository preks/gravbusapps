import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'
import { getIrmDocumentApiConfig, useGetIrmDocuments } from '@/business-apps/irm/common/utils/documentUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

interface InvestmentDocumentsProps {
  investmentId: string
  context: BusinessAppContextProps
  investmentGroupId?: string
  investmentGroupCode?: string
}

const InvestmentDocuments: React.FC<InvestmentDocumentsProps> = ({
  investmentId,
  context,
  investmentGroupId,
  investmentGroupCode
}) => {
  // Fetch documents using the generic IRM hook
  const { fetchDocuments } = useGetIrmDocuments('investment', context)

  // Use shared hook for document management
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: investmentId,
    context,
    fetchDocuments,
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  // REST client for document operations (IRM uses Kogito processes)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

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
      restClient={restClient}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      updateActionProps={documentUpdateActionProps}
      deleteActionProps={documentDeleteActionProps}
      aiOrganizeConfig={{
        moduleType: 'IRM',
        entityType: 'INVESTMENT',
        domain: 'investment',
        investmentTemplate: {
          catalogType: 'GROUP',
          entryId: investmentGroupId,
          entryCode: investmentGroupCode
        }
      }}
      data-testid="investment-document-section"
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      additionalData={context.additionalData}
    />
  )
}

export { InvestmentDocuments }
export default InvestmentDocuments
