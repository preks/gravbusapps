import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetCrmDocuments, getCrmDocumentApiConfig } from '@/business-apps/crm/common/utils/documentUtils'
import { useCrmDocuments } from '@/business-apps/crm/common/hooks/useCrmDocuments'
import { createDocumentSectionActions } from '@/common/utils/documentSectionActions'

interface DocumentViewProps extends BusinessAppContextProps {
  opportunityId: string
}

export const DocumentView: React.FC<DocumentViewProps> = ({ opportunityId, ...context }) => {
  const { fetchDocuments } = useGetCrmDocuments('opportunity', context)

  const { documents, isLoading, error, refetch } = useCrmDocuments({
    entityId: opportunityId,
    context,
    fetchDocuments,
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
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
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        opportunityId
      },
      prefixDataTestId: 'opportunity-document-upload'
    }),
    [opportunityId]
  )

  const customActions = useMemo(
    () =>
      createDocumentSectionActions({
        domain: 'customer-relations',
        documentFieldName: 'crmDocument',
        entityType: 'opportunity',
        updateProcessName: 'updateCrmDocument',
        deleteEndpoint: '/customer-relations/deleteCrmDocument',
        getTranslation: getTranslationFromI18nKeyAndLabel
      }),
    []
  )

  return (
    <div className="gba:col-span-12" data-testid="opportunity-documents-view">
      <DocumentSection
        entityId={opportunityId}
        documents={documents}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        apiConfig={getCrmDocumentApiConfig('opportunity')}
        customActions={customActions}
        createFolderActionProps={documentCreateFolderActionProps}
        uploadActionProps={documentUploadActionProps}
        data-testid="opportunity-document-section"
        accessToken={context.accessToken}
        userInfo={context.userInfo}
        additionalData={context.additionalData}
      />
    </div>
  )
}
