import React from 'react'
import { Download, Edit, Trash2 } from 'lucide-react'
import { startProcess } from '@/common/utils/start-process'
import { env } from '@/common/env/EnvUtils'
import { toast } from '@newwork/nw-design-system'

interface CreateDocumentActionsParams {
  entityType: 'lead' | 'account' | 'contact' | 'opportunity'
  getTranslation?: (key: string, fallback: string) => string
}

/**
 * Create standardized document actions for CRM entities
 * Provides download, update, and delete actions
 */
export function createDocumentActions({ entityType, getTranslation }: CreateDocumentActionsParams) {
  const translate = getTranslation || ((_, fallback: string) => fallback)

  return [
    {
      key: 'download',
      label: translate('crm.documents.download', 'Download'),
      icon: <Download className="gba:h-4 gba:w-4" />,
      onClick: (_documentId: string, document: any, entityId: string) => {
        // Handle both old format (document.file) and new format (document.fileInfo.fileId)
        const fileId = document.file || document.fileInfo?.fileId || document.fileInfo?.path

        if (!fileId) {
          toast.warning(translate('crm.documents.noFileAvailable', 'No file available to download'))
          return
        }

        try {
          const filesEndpoint = env('NEXT_PUBLIC_FILES_ENDPOINT') || ''

          const getFileExtension = (doc: any): string => {
            if (doc.name?.includes('.')) {
              return doc.name.split('.').pop() || 'pdf'
            }
            const mimeTypeExtensions: Record<string, string> = {
              'application/pdf': 'pdf',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
              'application/msword': 'doc',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
              'application/vnd.ms-excel': 'xls',
              'image/png': 'png',
              'image/jpeg': 'jpg',
              'text/plain': 'txt'
            }
            return (doc.mimeType && mimeTypeExtensions[doc.mimeType]) || 'pdf'
          }

          const fileExtension = getFileExtension(document)
          const pluralEntityType = `${entityType}s`
          const baseUrl = `${filesEndpoint}/files/api/v1/public/downloads/crm/${pluralEntityType}/${entityId}/documents/`

          let fileUrl: string
          if (fileId.includes('.')) {
            fileUrl = `${baseUrl}${fileId}`
          } else {
            fileUrl = `${baseUrl}${fileId}.${fileExtension}`
          }

          const downloadFilename = document.name || `document.${fileExtension}`

          const link = globalThis.document.createElement('a')
          link.href = fileUrl
          link.download = downloadFilename
          globalThis.document.body.appendChild(link)
          link.click()
          link.remove()
        } catch (error) {
          console.error('Error downloading document:', error)
          toast.error(translate('crm.documents.downloadFailed', 'Failed to download document'))
        }
      }
    },
    {
      key: 'update',
      label: translate('crm.documents.update', 'Update'),
      icon: <Edit className="gba:h-4 gba:w-4" />,
      onClick: (documentId: string, document: any, entityId: string) => {
        startProcess({
          domain: 'customer-relations',
          processName: 'updateCrmDocument',
          payload: {
            documentId: documentId,
            [`${entityType}Id`]: entityId,
            crmDocument: {
              id: documentId,
              version: document.version,
              name: document.name,
              documentGroupRef: document.documentGroup?.id,
              documentTypeRef: document.documentType?.id,
              expirationDate: document.expirationDate,
              description: document.description,
              [entityType]: entityId
            }
          },
          builderType: 'NATIVE_SCREEN'
        })
      }
    },
    {
      key: 'delete',
      label: translate('crm.documents.delete', 'Delete'),
      icon: <Trash2 className="gba:h-4 gba:w-4" />,
      apiEndpoint: '/customer-relations/deleteCrmDocument',
      confirmMessage: translate(
        'crm.documents.deleteConfirm',
        'Are you sure you want to delete this document? This action cannot be undone.'
      )
    }
  ]
}
