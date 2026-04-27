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

interface LeadDocumentsProps {
  leadId: string
  context: BusinessAppContextProps
}

const LeadDocuments: React.FC<LeadDocumentsProps> = ({ leadId, context }) => {
  const { fetchDocuments } = useGetIrmDocuments('lead', context)

  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: leadId,
    context,
    fetchDocuments
  })

  const folderUploadActionConfig = useMemo(
    () => ({
      contextsArray: FOLDER_UPLOAD_CONTEXTS,
      externalContextData: { leadId },
      accessToken: context.accessToken || '',
      deferMainContextRequestsUntilClick: false,
      prefixDataTestId: 'lead-document-upload-folder'
    }),
    [leadId, context.accessToken]
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
        testId: 'lead-document-upload-folder-button'
      }
    ],
    [folderUploadActionData.combinedData]
  )

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        leadId,
        folder: true
      },
      prefixDataTestId: 'lead-document-create-folder'
    }),
    [leadId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        leadId
      },
      prefixDataTestId: 'lead-document-upload'
    }),
    [leadId]
  )

  const documentUpdateActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentUpdate],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'lead-document-update'
    }),
    []
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'lead-document-delete'
    }),
    []
  )

  return (
    <DocumentSection
      entityId={leadId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={getIrmDocumentApiConfig('lead')}
      restClient={restClient}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      updateActionProps={documentUpdateActionProps}
      deleteActionProps={documentDeleteActionProps}
      aiOrganizeConfig={{ moduleType: 'IRM', entityType: 'LEAD', domain: 'investment' }}
      toolbarActions={uploadToolbarActions}
      data-testid="lead-document-section"
      {...context}
    />
  )
}

export { LeadDocuments }
export default LeadDocuments
