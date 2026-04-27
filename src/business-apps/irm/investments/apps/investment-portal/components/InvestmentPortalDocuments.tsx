import React, { useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentDocumentsByInvestmentId } from '@/business-apps/irm/investments/records/investment-record/hooks/useInvestmentDocumentsByInvestmentId'
import { DocumentSection } from '@/components/document-section'
import { getIrmDocumentApiConfig } from '@/business-apps/irm/common/utils/documentUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

interface InvestmentPortalDocumentsProps {
  investmentId: string
  context: BusinessAppContextProps
  investmentGroupId?: string
  investmentGroupCode?: string
}

const InvestmentPortalDocuments: React.FC<InvestmentPortalDocumentsProps> = ({
  investmentId,
  context,
  investmentGroupId,
  investmentGroupCode
}) => {
  // Get current user ID for filtering
  const currentUserId = context.userInfo?.id

  // Use the existing hook that supports createdBy filtering
  const { fetchInvestmentDocumentsByInvestmentId } = useGetInvestmentDocumentsByInvestmentId(context)

  // Wrapper to match the expected signature with optional FetchOptions
  const fetchDocuments = useCallback(
    (entityId: string, options?: { createdBy?: string }) => {
      return fetchInvestmentDocumentsByInvestmentId(entityId, options?.createdBy)
    },
    [fetchInvestmentDocumentsByInvestmentId]
  )

  // Use shared hook WITH user filtering (replaces 70+ lines of manual state)
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: investmentId,
    context,
    fetchDocuments,
    fetchOptions: { createdBy: currentUserId }, // 🔑 KEY: Server-side user filtering
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  // REST client for document operations (IRM uses Kogito processes)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Configure upload action button
  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        investmentId
      },
      prefixDataTestId: 'investment-portal-document-upload'
    }),
    [investmentId]
  )

  // Configure folder creation action button
  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        investmentId,
        folder: true
      },
      prefixDataTestId: 'investment-portal-document-create-folder'
    }),
    [investmentId]
  )

  // API configuration for document operations
  const apiConfig = useMemo(() => getIrmDocumentApiConfig('investment'), [])

  const documentUpdateActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentUpdate],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'investment-portal-document-update'
    }),
    []
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'investment-portal-document-delete'
    }),
    []
  )

  return (
    <DocumentSection
      documents={documents}
      entityId={investmentId}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={apiConfig}
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
      data-testid="investment-portal-document-section"
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      additionalData={context.additionalData}
    />
  )
}

export { InvestmentPortalDocuments }
