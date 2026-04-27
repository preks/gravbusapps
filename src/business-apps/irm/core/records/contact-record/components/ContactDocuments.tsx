import React, { useMemo } from 'react'
import { FolderSimpleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'
import { getIrmDocumentApiConfig, useGetIrmDocuments } from '@/business-apps/irm/common/utils/documentUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

const FOLDER_UPLOAD_CONTEXTS = [FlowContextName.investmentFolderUpload]

interface ContactDocumentsProps {
  contactId: string
  context: BusinessAppContextProps
}

const ContactDocuments: React.FC<ContactDocumentsProps> = ({ contactId, context }) => {
  const { fetchDocuments } = useGetIrmDocuments('contact', context)

  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: contactId,
    context,
    fetchDocuments
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
      contextsArray: [FlowContextName.investmentDocumentCreate],
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
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        contactId
      },
      prefixDataTestId: 'contact-document-upload'
    }),
    [contactId]
  )

  const documentUpdateActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentUpdate],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'contact-document-update'
    }),
    []
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'contact-document-delete'
    }),
    []
  )

  return (
    <DocumentSection
      entityId={contactId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={getIrmDocumentApiConfig('contact')}
      restClient={restClient}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      updateActionProps={documentUpdateActionProps}
      deleteActionProps={documentDeleteActionProps}
      aiOrganizeConfig={{ moduleType: 'IRM', entityType: 'CONTACT', domain: 'investment' }}
      toolbarActions={uploadToolbarActions}
      data-testid="contact-document-section"
      {...context}
    />
  )
}

export { ContactDocuments }
export default ContactDocuments
