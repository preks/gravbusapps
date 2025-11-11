import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/business-apps/irm/common/hooks/useInvestmentDocuments'
import { createDocumentActions } from '@/business-apps/irm/common/utils/createDocumentActions'
import { getIrmDocumentApiConfig, useGetIrmDocuments } from '@/business-apps/irm/common/utils/documentUtils'

interface DocumentViewProps {
  accountId: string
  context: BusinessAppContextProps
}

const DocumentView: React.FC<DocumentViewProps> = ({ accountId, context }) => {
  // Fetch documents using the generic IRM hook
  const { fetchDocuments } = useGetIrmDocuments('account', context)

  // Use shared hook for document management
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: accountId,
    context,
    fetchDocuments
  })

  // Memoized action props for document operations
  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        accountId,
        folder: true
      },
      prefixDataTestId: 'account-document-create-folder'
    }),
    [accountId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        accountId
      },
      prefixDataTestId: 'account-document-upload'
    }),
    [accountId]
  )

  // Use shared document actions
  const customActions = useMemo(() => createDocumentActions({ entityType: 'account' }), [])

  return (
    <DocumentSection
      entityId={accountId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={getIrmDocumentApiConfig('account')}
      customActions={customActions}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      data-testid="account-document-section"
      {...context}
    />
  )
}

export { DocumentView }
export default DocumentView
