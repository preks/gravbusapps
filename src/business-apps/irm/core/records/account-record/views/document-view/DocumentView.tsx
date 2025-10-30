import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetInvestmentDocumentsByAccountId } from '@/common/data/investment/hooks/useInvestmentAccounts'
import DocumentSection from '@/common/components/common-relations/record-sections/document-section/DocumentSection'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/business-apps/irm/common/hooks/useInvestmentDocuments'
import { createDocumentActions } from '@/business-apps/irm/common/utils/createDocumentActions'

interface DocumentViewProps {
  accountId: string
  context: BusinessAppContextProps
}

const DocumentView: React.FC<DocumentViewProps> = ({ accountId, context }) => {
  // Fetch documents using the existing hook
  const { fetchInvestmentDocumentsByAccountId } = useGetInvestmentDocumentsByAccountId(context)

  // Use shared hook for document management
  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: accountId,
    context,
    fetchDocuments: fetchInvestmentDocumentsByAccountId
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

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      externalContextData: {
        accountId,
        entityType: 'account'
      },
      prefixDataTestId: 'account-document-delete'
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
      apiConfig={{
        baseEndpoint: '/investment-relations',
        entityFieldName: 'account',
        documentFieldName: 'investmentDocument'
      }}
      enableGraphQLSearch={true}
      graphQLSearchConfig={{
        entityType: 'account'
      }}
      customActions={customActions}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      deleteActionProps={documentDeleteActionProps}
      data-testid="account-document-section"
      {...context}
    />
  )
}

export { DocumentView }
export default DocumentView
