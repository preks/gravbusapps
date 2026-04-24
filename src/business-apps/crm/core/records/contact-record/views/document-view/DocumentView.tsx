import React, { useMemo } from 'react'
import { FolderSimpleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetCrmDocuments, getCrmDocumentApiConfig } from '@/business-apps/crm/common/utils/documentUtils'
import { useCrmDocuments } from '@/business-apps/crm/common/hooks/useCrmDocuments'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useAppActionData } from '@/common/hooks/useAppActionData'

const FOLDER_UPLOAD_CONTEXTS = [FlowContextName.customerFolderUpload]

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

  const folderUploadActionConfig = useMemo(
    () => ({
      contextsArray: FOLDER_UPLOAD_CONTEXTS,
      externalContextData: { contactId },
      accessToken: context.accessToken || '',
      deferMainContextRequestsUntilClick: false,
      prefixDataTestId: 'contact-document-upload-folder'
    }),
    [contactId, context.accessToken]
  )

  const folderUploadActionData = useAppActionData(folderUploadActionConfig, 'UploadFolder')

  const uploadToolbarActions = useMemo(
    () => [
      {
        key: 'upload-folder',
        label: getTranslationFromI18nKeyAndLabel('document.upload.folder', 'Upload Folder'),
        icon: <FolderSimpleIcon className="gba:h-4 gba:w-4" />,
        onClick: () => folderUploadActionData.combinedData[0]?.onClick?.(),
        variant: 'outline' as const,
        testId: 'contact-document-upload-folder-button'
      }
    ],
    [folderUploadActionData.combinedData]
  )

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
        toolbarActions={uploadToolbarActions}
        data-testid="contact-document-section"
        accessToken={context.accessToken}
        userInfo={context.userInfo}
        additionalData={context.additionalData}
      />
    </div>
  )
}
