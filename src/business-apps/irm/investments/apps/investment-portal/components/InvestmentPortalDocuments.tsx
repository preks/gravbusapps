import React, { useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentDocumentsByInvestmentId } from '@/business-apps/irm/investments/records/investment-record/hooks/useInvestmentDocumentsByInvestmentId'
import { DocumentSection } from '@/components/document-section'
import { getIrmDocumentApiConfig } from '@/business-apps/irm/common/utils/documentUtils'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { createDocumentSectionActions } from '@/common/utils/documentSectionActions'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'

interface InvestmentPortalDocumentsProps {
  investmentId: string
  context: BusinessAppContextProps
}

const InvestmentPortalDocuments: React.FC<InvestmentPortalDocumentsProps> = ({ investmentId, context }) => {
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

  // Use centralized document actions
  const customActions = useMemo(
    () =>
      createDocumentSectionActions({
        domain: 'investment-relations',
        documentFieldName: 'investmentDocument',
        entityType: 'investment',
        updateProcessName: 'updateInvestmentDocument',
        deleteEndpoint: '/investment-relations/deleteInvestmentDocument',
        getTranslation: getTranslationFromI18nKeyAndLabel
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
      customActions={customActions}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      data-testid="investment-portal-document-section"
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      additionalData={context.additionalData}
    />
  )
}

export { InvestmentPortalDocuments }
