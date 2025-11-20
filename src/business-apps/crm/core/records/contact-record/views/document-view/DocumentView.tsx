import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetCrmDocuments, getCrmDocumentApiConfig } from '@/business-apps/crm/common/utils/documentUtils'
import { useCrmDocuments } from '@/business-apps/crm/common/hooks/useCrmDocuments'
import { createDocumentSectionActions } from '@/common/utils/documentSectionActions'

interface DocumentViewProps extends BusinessAppContextProps {
  contactId: string
}

export const DocumentView: React.FC<DocumentViewProps> = ({ contactId, ...context }) => {
  const { fetchDocuments } = useGetCrmDocuments('contact', context)

  const { documents, isLoading, error, refetch } = useCrmDocuments({
    entityId: contactId,
    context,
    fetchDocuments,
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
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
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        contactId
      },
      prefixDataTestId: 'contact-document-upload'
    }),
    [contactId]
  )

  const customActions = useMemo(
    () =>
      createDocumentSectionActions({
        domain: 'customer-relations',
        documentFieldName: 'crmDocument',
        entityType: 'contact',
        updateProcessName: 'updateCrmDocument',
        deleteEndpoint: '/customer-relations/deleteCrmDocument',
        getTranslation: getTranslationFromI18nKeyAndLabel
      }),
    []
  )

  return (
    <div className="gba:col-span-12" data-testid="contact-documents-view">
      <DocumentSection
        entityId={contactId}
        documents={documents}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        apiConfig={getCrmDocumentApiConfig('contact')}
        customActions={customActions}
        createFolderActionProps={documentCreateFolderActionProps}
        uploadActionProps={documentUploadActionProps}
        data-testid="contact-document-section"
        accessToken={context.accessToken}
        userInfo={context.userInfo}
        additionalData={context.additionalData}
      />
    </div>
  )
}
