import React, { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGetCrmDocuments, getCrmDocumentApiConfig } from '@/business-apps/crm/common/utils/documentUtils'
import { useCrmDocuments } from '@/business-apps/crm/common/hooks/useCrmDocuments'
import { createDocumentSectionActions } from '@/common/utils/documentSectionActions'

interface DocumentViewProps extends BusinessAppContextProps {
  leadId: string
}

export const DocumentView: React.FC<DocumentViewProps> = ({ leadId, ...context }) => {
  const { fetchDocuments } = useGetCrmDocuments('lead', context)

  const { documents, isLoading, error, refetch } = useCrmDocuments({
    entityId: leadId,
    context,
    fetchDocuments,
    errorMessage: getTranslationFromI18nKeyAndLabel('error.loading.documents', 'Failed to load documents')
  })

  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
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
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        leadId
      },
      prefixDataTestId: 'lead-document-upload'
    }),
    [leadId]
  )

  const customActions = useMemo(
    () =>
      createDocumentSectionActions({
        domain: 'customer-relations',
        documentFieldName: 'crmDocument',
        entityType: 'lead',
        updateProcessName: 'updateCrmDocument',
        deleteEndpoint: '/customer-relations/deleteCrmDocument',
        getTranslation: getTranslationFromI18nKeyAndLabel
      }),
    []
  )

  return (
    <div className="gba:col-span-12" data-testid="lead-documents-view">
      <DocumentSection
        entityId={leadId}
        documents={documents}
        isLoading={isLoading}
        error={error}
        onRefresh={refetch}
        apiConfig={getCrmDocumentApiConfig('lead')}
        customActions={customActions}
        createFolderActionProps={documentCreateFolderActionProps}
        uploadActionProps={documentUploadActionProps}
        data-testid="lead-document-section"
        accessToken={context.accessToken}
        userInfo={context.userInfo}
        additionalData={context.additionalData}
      />
    </div>
  )
}
