import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetCrmDocuments, getCrmDocumentApiConfig } from '@/business-apps/crm/common/utils/documentUtils'
import { useCrmDocuments } from '@/business-apps/crm/common/hooks/useCrmDocuments'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

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

  // REST client for document operations (CRM uses Kogito processes)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

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

  const documentUpdateActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentUpdate],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'contact-document-update'
    }),
    []
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentDelete],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'contact-document-delete'
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
        restClient={restClient}
        createFolderActionProps={documentCreateFolderActionProps}
        uploadActionProps={documentUploadActionProps}
        updateActionProps={documentUpdateActionProps}
        deleteActionProps={documentDeleteActionProps}
        aiOrganizeConfig={{ moduleType: 'CRM', entityType: 'CONTACT', domain: 'customer' }}
        data-testid="contact-document-section"
        accessToken={context.accessToken}
        userInfo={context.userInfo}
        additionalData={context.additionalData}
      />
    </div>
  )
}
