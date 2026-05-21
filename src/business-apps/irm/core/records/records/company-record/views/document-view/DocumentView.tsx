import React, { useMemo } from 'react'
import { FolderSimpleIcon } from '@phosphor-icons/react'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useInvestmentDocuments } from '@/common/data/investment/hooks/useInvestmentDocuments'
import { getIrmDocumentApiConfig, useGetIrmDocuments } from '@/business-apps/irm/common/utils/documentUtils'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { useAppActionData } from '@/common/hooks/useAppActionData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { DocumentViewProps } from '../../types'

const FOLDER_UPLOAD_CONTEXTS = [FlowContextName.investmentFolderUpload]

export const DocumentView: React.FC<DocumentViewProps> = ({ investmentCompanyId, context }) => {
  const { fetchDocuments } = useGetIrmDocuments('investmentCompany', context)

  const { documents, isLoading, error, refetch } = useInvestmentDocuments({
    entityId: investmentCompanyId,
    context,
    fetchDocuments,
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  const folderUploadActionConfig = useMemo(
    () => ({
      contextsArray: FOLDER_UPLOAD_CONTEXTS,
      externalContextData: { investmentCompanyId },
      accessToken: context.accessToken || '',
      deferMainContextRequestsUntilClick: false,
      prefixDataTestId: 'investment-company-document-upload-folder'
    }),
    [investmentCompanyId, context.accessToken]
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
        testId: 'investment-company-document-upload-folder-button'
      }
    ],
    [folderUploadActionData.combinedData]
  )

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        investmentCompanyId,
        folder: true
      },
      prefixDataTestId: 'investment-company-document-create-folder'
    }),
    [investmentCompanyId]
  )

  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentCreate],
      externalContextData: {
        investmentCompanyId
      },
      prefixDataTestId: 'investment-company-document-upload'
    }),
    [investmentCompanyId]
  )

  const documentUpdateActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentUpdate],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'investment-company-document-update'
    }),
    []
  )

  const documentDeleteActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.investmentDocumentDelete],
      buildExternalContextData: (document: any) => ({ documentId: document.id }),
      prefixDataTestId: 'investment-company-document-delete'
    }),
    []
  )

  return (
    <DocumentSection
      entityId={investmentCompanyId}
      documents={documents}
      isLoading={isLoading}
      error={error}
      onRefresh={refetch}
      apiConfig={getIrmDocumentApiConfig('investmentCompany')}
      restClient={restClient}
      createFolderActionProps={documentCreateFolderActionProps}
      uploadActionProps={documentUploadActionProps}
      updateActionProps={documentUpdateActionProps}
      deleteActionProps={documentDeleteActionProps}
      aiOrganizeConfig={{ moduleType: 'IRM', entityType: 'INVESTMENT_COMPANY', domain: 'investment' }}
      toolbarActions={uploadToolbarActions}
      data-testid="investment-company-document-section"
      {...context}
    />
  )
}

export default DocumentView
