import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetCrmDocuments, getCrmDocumentApiConfig } from '@/business-apps/crm/common/utils/documentUtils'
import { useCrmDocuments } from '@/business-apps/crm/common/hooks/useCrmDocuments'
import { createDocumentSectionActions } from '@/common/utils/documentSectionActions'

interface DocumentViewProps {
  accountId: string
  context: BusinessAppContextProps
}

const DocumentView: React.FC<DocumentViewProps> = ({ accountId, context }) => {
  const { fetchDocuments } = useGetCrmDocuments('account', context)

  const { documents, isLoading, error, refetch } = useCrmDocuments({
    entityId: accountId,
    context,
    fetchDocuments,
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
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
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        accountId
      },
      prefixDataTestId: 'account-document-upload'
    }),
    [accountId]
  )

  const customActions = useMemo(
    () =>
      createDocumentSectionActions({
        domain: 'customer-relations',
        documentFieldName: 'crmDocument',
        entityType: 'account',
        updateProcessName: 'updateCrmDocument',
        deleteEndpoint: '/customer-relations/deleteCrmDocument',
        getTranslation: getTranslationFromI18nKeyAndLabel
      }),
    []
  )

  return (
    <DocumentSection
      entityId={accountId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={getCrmDocumentApiConfig('account')}
      customActions={customActions}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      data-testid="account-document-section"
      accessToken={context.accessToken}
      userInfo={context.userInfo}
      additionalData={context.additionalData}
    />
  )
}

export { DocumentView }
export default DocumentView
