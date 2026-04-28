import React, { useMemo } from 'react'
import { FolderSimpleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'
import { getIrmDocumentApiConfig, useGetIrmDocuments } from '@/business-apps/irm/common/utils/documentUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useAppActionData } from '@/common/hooks/useAppActionData'

const FOLDER_UPLOAD_CONTEXTS = [FlowContextName.investmentFolderUpload]

interface DocumentViewProps {
  opportunityId: string
  context: BusinessAppContextProps
}

const DocumentView: React.FC<DocumentViewProps> = ({ opportunityId, context }) => {
  const { fetchDocuments } = useGetIrmDocuments('opportunity', context)

  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: opportunityId,
    context,
    fetchDocuments,
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  const folderUploadActionConfig = useMemo(
    () => ({
      contextsArray: FOLDER_UPLOAD_CONTEXTS,
      externalContextData: { opportunityId },
      accessToken: context.accessToken || '',
      deferMainContextRequestsUntilClick: false,
      prefixDataTestId: 'opportunity-document-upload-folder'
    }),
    [opportunityId, context.accessToken]
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
        testId: 'opportunity-document-upload-folder-button'
      }
    ],
    [folderUploadActionData.combinedData]
  )

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        opportunityId,
        folder: true
      },
      prefixDataTestId: 'opportunity-document-create-folder'
    }),
    [opportunityId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        opportunityId
      },
      prefixDataTestId: 'opportunity-document-upload'
    }),
    [opportunityId]
  )

  const documentUpdateActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentUpdate],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'opportunity-document-update'
    }),
    []
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'opportunity-document-delete'
    }),
    []
  )

  return (
    <DocumentSection
      entityId={opportunityId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={getIrmDocumentApiConfig('opportunity')}
      restClient={restClient}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      updateActionProps={documentUpdateActionProps}
      deleteActionProps={documentDeleteActionProps}
      aiOrganizeConfig={{ moduleType: 'IRM', entityType: 'OPPORTUNITY', domain: 'investment' }}
      toolbarActions={uploadToolbarActions}
      data-testid="opportunity-document-section"
      {...context}
    />
  )
}

export { DocumentView }
export default DocumentView
