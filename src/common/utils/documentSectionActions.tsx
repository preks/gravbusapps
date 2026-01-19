import React from 'react'
import { Download, Edit, Trash2 } from 'lucide-react'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { toast } from '@newwork/nw-design-system'
import { startProcess } from '@/common/utils/start-process'

export interface DocumentSectionActionsConfig {
  /**
   * Domain for process execution (e.g., 'customer-relations', 'investment-relations', 'hr', 'finance')
   */
  domain: string

  /**
   * Document field name in payload (e.g., 'crmDocument', 'investmentDocument', 'hrDocument')
   */
  documentFieldName: string

  /**
   * Entity type (e.g., 'lead', 'account', 'employee', 'expense')
   */
  entityType: string

  /**
   * Update process name (e.g., 'updateCrmDocument', 'updateInvestmentDocument')
   */
  updateProcessName: string

  /**
   * Delete API endpoint (e.g., '/customer-relations/deleteCrmDocument')
   */
  deleteEndpoint: string

  /**
   * Optional translation function for i18n support
   * @param key - Translation key
   * @param fallback - Fallback text if translation not found
   * @returns Translated text or fallback
   */
  getTranslation?: (key: string, fallback: string) => string
}

/**
 * Creates standard document actions (download, update, delete) for DocumentSection component
 *
 * This is a generic utility that works with any business app (CRM, IRM, HR, Finance, etc.)
 *
 * @param config - Configuration object for document actions
 * @returns Array of action objects compatible with DocumentSection's customActions prop
 *
 * @example
 * ```typescript
 * // CRM example
 * const actions = createDocumentSectionActions({
 *   domain: 'customer-relations',
 *   documentFieldName: 'crmDocument',
 *   entityType: 'lead',
 *   updateProcessName: 'updateCrmDocument',
 *   deleteEndpoint: '/customer-relations/deleteCrmDocument',
 *   getTranslation: getTranslationFromI18nKeyAndLabel
 * })
 *
 * // IRM example
 * const actions = createDocumentSectionActions({
 *   domain: 'investment-relations',
 *   documentFieldName: 'investmentDocument',
 *   entityType: 'investment',
 *   updateProcessName: 'updateInvestmentDocument',
 *   deleteEndpoint: '/investment-relations/deleteInvestmentDocument'
 * })
 *
 * // HR example
 * const actions = createDocumentSectionActions({
 *   domain: 'hr',
 *   documentFieldName: 'employeeDocument',
 *   entityType: 'employee',
 *   updateProcessName: 'updateEmployeeDocument',
 *   deleteEndpoint: '/hr/deleteEmployeeDocument'
 * })
 * ```
 */
export function createDocumentSectionActions(config: DocumentSectionActionsConfig) {
  const {
    domain,
    documentFieldName,
    entityType,
    updateProcessName,
    deleteEndpoint,
    getTranslation = (_, fallback) => fallback
  } = config

  return [
    {
      key: 'download',
      label: getTranslation('document.action.download', 'Download'),
      icon: <Download className="gba:h-4 gba:w-4" />,
      onClick: (_documentId: string, document: any) => {
        if (!document.fileInfo) {
          toast.warning(getTranslation('document.warning.no.file', 'No file available to download'))
          return
        }

        try {
          // Use buildFileUrl to get the proper file URL
          const fileUrl = buildFileUrl(document.fileInfo)
          const downloadFilename = document.name || 'document'

          // Create link with download attribute to force download
          const link = globalThis.document.createElement('a')
          link.href = fileUrl
          link.download = downloadFilename
          globalThis.document.body.appendChild(link)
          link.click()
          link.remove()

          toast.success(getTranslation('document.success.downloading', `Downloading ${downloadFilename}`))
        } catch (error) {
          console.error('Error downloading document:', error)
          toast.error(getTranslation('document.error.download.failed', 'Failed to download document'))
        }
      }
    },
    {
      key: 'update',
      label: getTranslation('document.action.update', 'Update'),
      icon: <Edit className="gba:h-4 gba:w-4" />,
      onClick: (documentId: string, document: any, entityId: string) => {
        // Pass the complete document object to pre-fill the form
        startProcess({
          domain,
          processName: updateProcessName,
          payload: {
            documentId,
            [`${entityType}Id`]: entityId,
            [documentFieldName]: {
              // Core document fields
              id: documentId,
              version: document.version,
              name: document.name,
              description: document.description,
              folder: document.folder || false,
              parentDocument: document.parentDocument,
              format: document.format,

              // Catalog references
              documentGroupRef: document.documentGroup?.id,
              documentTypeRef: document.documentType?.id,

              // File information (essential for update mode)
              file: document.file,
              fileInfo: document.fileInfo,
              fileSize: document.fileSize,
              mimeType: document.mimeType,

              // Date fields
              expirationDate: document.expirationDate,
              createdAt: document.createdAt,

              // Additional metadata
              verified: document.verified,
              verificationDate: document.verificationDate,
              authenticated: document.authenticated,
              authenticationDate: document.authenticationDate,
              mandatory: document.mandatory,

              // Entity relationship
              [entityType]: entityId
            }
          },
          builderType: 'NATIVE_SCREEN'
        })
      }
    },
    {
      key: 'delete',
      label: getTranslation('document.action.delete', 'Delete'),
      icon: <Trash2 className="gba:h-4 gba:w-4" />,
      apiEndpoint: deleteEndpoint,
      confirmMessage: getTranslation(
        'document.confirm.delete',
        'Are you sure you want to delete this document? This action cannot be undone.'
      )
    }
  ]
}
