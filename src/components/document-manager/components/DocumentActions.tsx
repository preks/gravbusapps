import React, { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { Download, Eye, PencilSimple, Trash } from '@phosphor-icons/react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Button as DialogButton
} from '@newwork/nw-design-system'
import { startProcess } from '@/common/utils/start-process'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { DocumentActionProps } from '../types/documentTypes'
import { isPreviewableFile } from '@/common/utils/filePreview'

export const DocumentActions: React.FC<DocumentActionProps> = ({
  document,
  entityId,
  entityType,
  context,
  onActionComplete
}) => {
  const [deleteModal, setDeleteModal] = useState(false)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const handleDownload = async () => {
    if (!document.file) {
      console.error('No file available for download')
      return
    }

    try {
      const link = window.document.createElement('a')
      link.href = document.file
      link.target = '_blank'

      // Only set download attribute for non-previewable files
      // Note: document.mimeType might be undefined, no fileInfo in this component
      const canPreview = isPreviewableFile(document.mimeType)
      if (!canPreview) {
        link.download = document.name || 'document'
      }

      window.document.body.appendChild(link)
      link.click()
      window.document.body.removeChild(link)
    } catch (error) {
      console.error('Download error:', error)
      console.error('Failed to download document')
    }
  }

  const handleView = () => {
    if (!document.file) {
      console.error('No file available to view')
      return
    }

    window.open(document.file, '_blank')
  }

  const handleEdit = () => {
    startProcess({
      domain: 'investments',
      processName: 'createInvestmentDocument',
      payload: {
        [`${entityType}Id`]: entityId,
        investmentDocument: {
          id: document.id,
          version: document.version,
          name: document.name,
          documentGroupRef: document.documentGroup?.id,
          documentTypeRef: document.documentType?.id,
          parentDocument: document.parentDocument || undefined
        }
      },
      builderType: 'NATIVE_SCREEN'
    })
  }

  const confirmDelete = async () => {
    try {
      await restClient.delete(`/customer-relations/deleteCrmDocument/${document.id}`, {
        headers: { Authorization: `Bearer ${context.accessToken || ''}` }
      })

      console.log('Document deleted')
      setDeleteModal(false)
      onActionComplete()
    } catch (error: any) {
      console.error('Error deleting document:', error)
      console.error(error?.message || 'Failed to delete document')
    }
  }

  return (
    <div className="gba:flex gba:gap-2">
      <Button variant="ghost" size="sm" onClick={handleDownload} title="Download">
        <Download className="gba:w-4 gba:h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleView} title="View">
        <Eye className="gba:w-4 gba:h-4" />
      </Button>
      <Button variant="ghost" size="sm" onClick={handleEdit} title="Edit">
        <PencilSimple className="gba:w-4 gba:h-4" />
      </Button>
      <Dialog open={deleteModal} onOpenChange={setDeleteModal}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" title="Delete">
            <Trash className="gba:w-4 gba:h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Document</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete "{document.name}"?</p>
          <div className="gba:flex gba:gap-2 gba:justify-end gba:mt-4">
            <DialogButton variant="outline" onClick={() => setDeleteModal(false)}>
              Cancel
            </DialogButton>
            <DialogButton variant="destructive" onClick={confirmDelete}>
              Delete
            </DialogButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
