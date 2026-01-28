/**
 * DocumentView Component for Company Record
 * Displays company documents in the documents tab
 */
import React, { useMemo, useState } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { UploadIcon, FolderIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils' // Fallback for document actions
import { useCompanyDocuments } from '@/common/data/orgchart/hooks/useCompanyDocuments'
import { useCompany } from '@/common/data/orgchart/hooks/useCompany'
import { DocumentSection } from '@/components/document-section'
import { createDocumentSectionActions } from '@/common/utils/documentSectionActions'
import { CompanyDocumentUploadPopup } from '@/business-apps/mdm/forms/company-document-upload-popup'
import { CompanyFolderCreatePopup } from '@/business-apps/mdm/forms/company-folder-create-popup'
import type { DocumentViewProps } from '../../types'
import translations from '../../_i18n'

/**
 * Get Company Document API configuration
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
  // Fetch full company data for complete payload in PUT request
  const { company } = useCompany(context.accessToken, companyId, 'record')

  // State for popups
  const [uploadPopupOpen, setUploadPopupOpen] = useState(false)
  const [folderPopupOpen, setFolderPopupOpen] = useState(false)

  // Icons - created once to prevent re-renders
  const uploadIcon = useMemo(() => <UploadIcon className="gba:h-4 gba:w-4" />, [])
  const folderIcon = useMemo(() => <FolderIcon className="gba:h-4 gba:w-4" />, [])

  // Toolbar actions for upload and folder buttons
  const toolbarActions = useMemo(
    () => [
      {
        key: 'create-folder',
        label: getTranslationFromI18nKeyAndLabel('document.folder.new', 'New Document Folder'),
        onClick: () => setFolderPopupOpen(true),
        icon: folderIcon,
        variant: 'outline' as const,
        testId: 'company-document-create-folder-button'
      },
      {
        key: 'upload',
        label: getTranslationFromI18nKeyAndLabel('document.upload', 'Upload Document'),
        onClick: () => setUploadPopupOpen(true),
        icon: uploadIcon,
        variant: 'outline' as const,
        testId: 'company-document-upload-button'
      }
    ],
    [uploadIcon, folderIcon]
  )

  // Custom document row actions (edit, delete, etc.)
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

  return (
    <>
      <div className="gba:col-span-12" data-testid="company-documents-view">
        <DocumentSection
          entityId={companyId}
          documents={documents}
          isLoading={loading}
          error={error}
          onRefresh={refetch}
          apiConfig={getCompanyDocumentApiConfig()}
          toolbarActions={toolbarActions}
          customActions={customActions}
          data-testid="company-document-section"
          accessToken={context.accessToken}
          userInfo={context.userInfo}
          additionalData={context.additionalData}
        />
      </div>

      {/* Document Upload Popup */}
      {uploadPopupOpen && company && (
        <CompanyDocumentUploadPopup
          open={uploadPopupOpen}
          company={company}
          accessToken={context.accessToken}
          onClose={() => setUploadPopupOpen(false)}
          onSuccess={() => {
            setUploadPopupOpen(false)
            refetch()
          }}
        />
      )}

      {/* Folder Create Popup */}
      {folderPopupOpen && company && (
        <CompanyFolderCreatePopup
          open={folderPopupOpen}
          company={company}
          accessToken={context.accessToken}
          onClose={() => setFolderPopupOpen(false)}
          onSuccess={() => {
            setFolderPopupOpen(false)
            refetch()
          }}
        />
      )}
    </>
  )
}

export default DocumentView
