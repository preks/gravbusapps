/**
 * DocumentView Component for Company Record
 * Displays company documents in the documents tab
 */
import React, { useMemo, useState, useCallback } from 'react'
import { useTranslation, toast } from '@newwork/nw-design-system'
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
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'

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
  const [updatePopupOpen, setUpdatePopupOpen] = useState(false)
  const [folderPopupOpen, setFolderPopupOpen] = useState(false)
  const [folderUpdatePopupOpen, setFolderUpdatePopupOpen] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<any>(null)
  const [selectedFolder, setSelectedFolder] = useState<any>(null)

  // REST client for document operations
  const orgchartClient = useOrgchartClient(context.accessToken)

  // Icons - created once to prevent re-renders
  const uploadIcon = useMemo(() => <UploadIcon className="gba:h-4 gba:w-4" />, [])
  const folderIcon = useMemo(() => <FolderIcon className="gba:h-4 gba:w-4" />, [])

  /**
   * Custom delete handler for MDM using updateCompany endpoint with changeMode: 'DELETE'
   */
  const handleDeleteDocument = useCallback(
    async (documentId: string, _document: any, entityId: string, accessToken?: string) => {
      if (!accessToken) {
        toast.error(getTranslationFromI18nKeyAndLabel('document.error.missing-token', 'Access token is required'))
        return
      }

      if (!company) {
        toast.error(getTranslationFromI18nKeyAndLabel('document.error.company-not-loaded', 'Company data not loaded'))
        return
      }

      try {
        // Build payload with changeMode: 'DELETE'
        const payload = {
          structureId: company.structureId,
          code: company.code,
          documents: [
            {
              id: documentId,
              companyId: entityId,
              changeMode: 'DELETE'
            }
          ]
        }

        // Call updateCompany endpoint
        await orgchartClient.updateCompany(entityId, payload, {
          headers: { Authorization: `Bearer ${accessToken}` }
        })

        toast.success(getTranslationFromI18nKeyAndLabel('document.success.delete', 'Document deleted successfully'))

        // Refresh documents list
        refetch()
      } catch (error) {
        console.error('Error deleting document:', error)
        toast.error(getTranslationFromI18nKeyAndLabel('document.error.delete.failed', 'Failed to delete document'))
      }
    },
    [company, orgchartClient, refetch]
  )

  /**
   * Custom update handler for MDM - opens appropriate popup based on folder flag
   */
  const handleUpdateDocument = useCallback((_documentId: string, document: any) => {
    if (document.folder) {
      // Open folder popup for folders
      setSelectedFolder(document)
      setFolderUpdatePopupOpen(true)
    } else {
      // Open document popup for documents
      setSelectedDocument(document)
      setUpdatePopupOpen(true)
    }
  }, [])

  // Toolbar actions for upload and folder buttons
  const toolbarActions = useMemo(
    () => [
      {
        key: 'create-folder',
        label: getTranslationFromI18nKeyAndLabel('document-folder-new', 'New Document Folder'),
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
        updateProcessName: 'updateCompanyDocument', // Not used when customUpdateHandler is provided
        deleteEndpoint: '/mdm/deleteCompanyDocument', // Not used when customDeleteHandler is provided
        customUpdateHandler: handleUpdateDocument, // Use custom update handler to open popup
        customDeleteHandler: handleDeleteDocument, // Use custom delete handler with changeMode: 'DELETE'
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
    [t, handleUpdateDocument, handleDeleteDocument]
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
          restClient={orgchartClient}
          companyData={
            company?.structureId && company?.code
              ? {
                  structureId: company.structureId,
                  code: company.code
                }
              : undefined
          }
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
          mode="create"
        />
      )}

      {/* Document Update Popup */}
      {updatePopupOpen && company && selectedDocument && (
        <CompanyDocumentUploadPopup
          open={updatePopupOpen}
          company={company}
          accessToken={context.accessToken}
          onClose={() => {
            setUpdatePopupOpen(false)
            setSelectedDocument(null)
          }}
          onSuccess={() => {
            setUpdatePopupOpen(false)
            setSelectedDocument(null)
            refetch()
          }}
          mode="update"
          document={selectedDocument}
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
          mode="create"
        />
      )}

      {/* Folder Update Popup */}
      {folderUpdatePopupOpen && company && selectedFolder && (
        <CompanyFolderCreatePopup
          open={folderUpdatePopupOpen}
          company={company}
          accessToken={context.accessToken}
          onClose={() => {
            setFolderUpdatePopupOpen(false)
            setSelectedFolder(null)
          }}
          onSuccess={() => {
            setFolderUpdatePopupOpen(false)
            setSelectedFolder(null)
            refetch()
          }}
          mode="update"
          folder={selectedFolder}
        />
      )}
    </>
  )
}

export default DocumentView
