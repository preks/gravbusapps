/**
 * DocumentView Component for Company Record
 * Displays company documents in the documents tab
 * NOTE: Currently shows empty state as GraphQL schema for company documents is not yet available
 */
import React, { useMemo } from 'react'
import { Alert, AlertDescription, useTranslation } from '@newwork/nw-design-system'
import { Info } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils' // Fallback for document actions
import { useCompanyDocuments } from '@/common/data/orgchart/hooks/useCompanyDocuments'
import { DocumentSection } from '@/components/document-section'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { createDocumentSectionActions } from '@/common/utils/documentSectionActions'
import type { DocumentViewProps } from '../../types'
import translations from '../../_i18n'

/**
 * Get Company Document API configuration
 * NOTE: This is a placeholder - adjust endpoints when GraphQL schema is available
 */
const getCompanyDocumentApiConfig = () => ({
  baseEndpoint: '/mdm',
  entityFieldName: 'company',
  documentFieldName: 'companyDocument',
  endpoints: {
    create: '/mdm/createCompanyDocument',
    update: '/mdm/updateCompanyDocument',
    delete: '/mdm/deleteCompanyDocument'
  }
})

export const DocumentView: React.FC<DocumentViewProps> = ({ companyId, ...context }) => {
  const { t } = useTranslation(translations)
  const { documents, loading, error, refetch } = useCompanyDocuments(context.accessToken, companyId)

  // Document create folder action props
  const documentCreateFolderActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        companyId,
        folder: true
      },
      prefixDataTestId: 'company-document-create-folder'
    }),
    [companyId]
  )

  // Document upload action props
  const documentUploadActionProps = useMemo(
    () => ({
      contextsArray: [FlowContextName.customerDocumentCreate],
      externalContextData: {
        companyId
      },
      prefixDataTestId: 'company-document-upload'
    }),
    [companyId]
  )

  // Custom document actions
  const customActions = useMemo(
    () =>
      createDocumentSectionActions({
        domain: 'mdm',
        documentFieldName: 'companyDocument',
        entityType: 'company',
        updateProcessName: 'updateCompanyDocument',
        deleteEndpoint: '/mdm/deleteCompanyDocument',
        getTranslation: (key: string, fallback: string) => {
          // Try to get translation from local translations first
          try {
            const translation = t(key as any)
            if (translation && translation !== key) return translation
          } catch {
            // Fallback to windowUtils if key not found
          }
          return getTranslationFromI18nKeyAndLabel(key, fallback)
        }
      }),
    [t]
  )

  // Show info alert that documents are not yet available
  const isDocumentsNotAvailable = !loading && !error && documents.length === 0

  return (
    <div className="gba:col-span-12" data-testid="company-documents-view">
      {isDocumentsNotAvailable && (
        <Alert className="gba:mb-4" data-testid="company-documents-not-available-alert">
          <Info className="gba:h-4 gba:w-4" />
          <AlertDescription>{t('documents-not-available')}</AlertDescription>
        </Alert>
      )}

      <DocumentSection
        entityId={companyId}
        documents={documents}
        isLoading={loading}
        error={error}
        onRefresh={refetch}
        apiConfig={getCompanyDocumentApiConfig()}
        customActions={customActions}
        createFolderActionProps={documentCreateFolderActionProps}
        uploadActionProps={documentUploadActionProps}
        data-testid="company-document-section"
        accessToken={context.accessToken}
        userInfo={context.userInfo}
        additionalData={context.additionalData}
      />
    </div>
  )
}

export default DocumentView
