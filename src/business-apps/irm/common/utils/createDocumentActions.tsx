import React from 'react'
import { Download, Edit, Trash2 } from 'lucide-react'
import { buildFileUrl } from '@/common/utils/fileUtils'
import { toast } from '@newwork/nw-design-system'
import { startProcess } from '@/common/utils/start-process'

export type EntityType = 'account' | 'contact' | 'lead' | 'investment'

interface CreateDocumentActionsParams {
  entityType: EntityType
  getTranslation?: (key: string, fallback: string) => string
}

/**
 * Creates standard document actions (download, update, delete) for IRM records
 * Eliminates ~60 lines of duplicated code per component
 */
export function createDocumentActions({
  entityType,
  getTranslation = (_, fallback) => fallback
}: CreateDocumentActionsParams) {
  // Map entity type to field name for payload
  const entityFieldMap: Record<EntityType, string> = {
    account: 'accountId',
    contact: 'contactId',
    lead: 'leadId',
    investment: 'investmentId'
  }

  const entityField = entityFieldMap[entityType]

  return [
    {
      key: 'download',
      label: getTranslation('action.download', 'Download'),
      icon: <Download className="gba:h-4 gba:w-4" />,
      onClick: (_documentId: string, document: any) => {
        if (!document.fileInfo) {
          toast.warning(getTranslation('warning.no.file.available', 'No file available to download'))
          return
        }

        try {
          const fileUrl = buildFileUrl(document.fileInfo)
          const downloadFilename = document.name || 'document'

          const link = globalThis.document.createElement('a')
          link.href = fileUrl
          link.download = downloadFilename
          globalThis.document.body.appendChild(link)
          link.click()
          link.remove()

          toast.success(getTranslation('success.document.downloaded', `Downloading ${downloadFilename}`))
        } catch (error) {
          console.error('Error downloading document:', error)
          toast.error(getTranslation('error.download.failed', 'Failed to download document'))
        }
      }
    },
    {
      key: 'update',
      label: getTranslation('action.update', 'Update'),
      icon: <Edit className="gba:h-4 gba:w-4" />,
      onClick: (documentId: string, document: any, entityId: string) => {
        startProcess({
          domain: 'investment-relations',
          processName: 'updateInvestmentDocument',
          payload: {
            documentId: documentId,
            [entityField]: entityId,
            investmentDocument: {
              id: documentId,
              version: document.version,
              name: document.name,
              documentGroupRef: document.documentGroup?.id,
              documentTypeRef: document.documentType?.id,
              expirationDate: document.expirationDate,
              description: document.description,
              folder: document.folder || false
            }
          },
          builderType: 'NATIVE_SCREEN'
        })
      }
    },
    {
      key: 'delete',
      label: getTranslation('action.delete', 'Delete'),
      icon: <Trash2 className="gba:h-4 gba:w-4" />,
      apiEndpoint: '/investment-relations/deleteInvestmentDocument',
      confirmMessage: getTranslation(
        'confirm.delete.document',
        'Are you sure you want to delete this document? This action cannot be undone.'
      )
    }
  ]
}
