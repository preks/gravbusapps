import React, { useCallback, useMemo, useState } from 'react'
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  toast
} from '@newwork/nw-design-system'
import { env } from '@/common/env/EnvUtils'
import { useFileClient } from '@/common/network/files/useFileClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { EmptyDropZone } from '@/common/components/common-relations/popups/document-folder-upload-popup/components/EmptyDropZone'
import { ProcessingState } from '@/common/components/common-relations/popups/document-folder-upload-popup/components/ProcessingState'
import { SelectionPreview } from '@/common/components/common-relations/popups/document-folder-upload-popup/components/SelectionPreview'
import { useFolderPreviewTree } from '@/common/components/common-relations/popups/document-folder-upload-popup/hooks/useFolderPreviewTree'
import { useFolderSelection } from '@/common/components/common-relations/popups/document-folder-upload-popup/hooks/useFolderSelection'

const TEST_ID_PREFIX = 'employee-document-folder-upload'

export interface DocumentFolderUploadProps {
  readonly open: boolean
  readonly employeeId: string
  readonly accessToken: string
  readonly onOpenChange: (open: boolean) => void
  readonly onSuccess?: () => void
}

interface CreatedEmployeeDocument {
  id?: string
}

interface EmployeeDocumentResponse {
  employeeDocument?: CreatedEmployeeDocument
}

function buildDropZoneClasses(isDragActive: boolean): string {
  const base =
    'gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:border-2 gba:border-dashed gba:rounded-md gba:p-6 gba:text-center gba:min-h-36 gba:transition-colors'
  const activeClasses = 'gba:border-primary gba:bg-primary/5'
  const idleClasses = 'gba:border-input gba:bg-muted/30'
  return `${base} ${isDragActive ? activeClasses : idleClasses}`
}

function getPathParts(file: File): string[] {
  return (file.webkitRelativePath || file.name).split('/').filter(Boolean)
}

export const DocumentFolderUpload: React.FC<DocumentFolderUploadProps> = ({
  open,
  employeeId,
  accessToken,
  onOpenChange,
  onSuccess
}) => {
  const selection = useFolderSelection()
  const { files, isProcessing, previewLimit, isDragActive, inputRef, dropZoneProps } = selection
  const { summary, previewRows, hiddenPreviewCount } = useFolderPreviewTree(files, previewLimit)
  const [isUploading, setIsUploading] = useState(false)
  const fileClient = useFileClient({ accessToken } as any)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const dropZoneClasses = useMemo(() => buildDropZoneClasses(isDragActive), [isDragActive])
  const hasFiles = files.length > 0

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        selection.clearSelection()
      }
      onOpenChange(nextOpen)
    },
    [onOpenChange, selection]
  )

  const createEmployeeDocument = useCallback(
    async (employeeDocument: Record<string, unknown>): Promise<CreatedEmployeeDocument> => {
      const response = await restClient.post<EmployeeDocumentResponse>(
        '/employee/employeeDocuments',
        { employeeDocument },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`
          }
        }
      )
      return response?.employeeDocument ?? {}
    },
    [accessToken, restClient]
  )

  const handleUpload = useCallback(async () => {
    if (!employeeId || !accessToken || files.length === 0) {
      return
    }

    setIsUploading(true)
    const folderIdsByPath = new Map<string, string>()

    try {
      for (const file of files) {
        const parts = getPathParts(file)
        if (parts.length === 0) {
          continue
        }

        let parentEmployeeDocumentId: string | null = null

        for (let index = 0; index < parts.length - 1; index++) {
          const folderPath = parts.slice(0, index + 1).join('/')
          const existingFolderId = folderIdsByPath.get(folderPath)

          if (existingFolderId) {
            parentEmployeeDocumentId = existingFolderId
            continue
          }

          const createdFolder = await createEmployeeDocument({
            employeeId,
            name: parts[index],
            folder: true,
            parentEmployeeDocumentId,
            recordState: 'active'
          })

          if (!createdFolder.id) {
            throw new Error('Folder creation failed')
          }

          folderIdsByPath.set(folderPath, createdFolder.id)
          parentEmployeeDocumentId = createdFolder.id
        }

        const uploadResponse = await fileClient.uploadFile(
          file,
          { accessScope: 'tenant' },
          {
            appName: 'employee-profile',
            folderPath: `/documents/${employeeId}`,
            mimeType: file.type || 'application/octet-stream'
          },
          'fileContent'
        )

        if (!uploadResponse?.fileInfo?.fileId) {
          throw new Error('File upload failed')
        }

        await createEmployeeDocument({
          employeeId,
          name: parts[parts.length - 1],
          file: uploadResponse.fileInfo.fileId,
          mimeType: uploadResponse.fileInfo.fileMetadata?.mimeType || file.type || 'application/octet-stream',
          fileSize: file.size,
          parentEmployeeDocumentId,
          validFrom: new Date().toISOString(),
          validTo: null,
          mandatory: false,
          folder: false
        })
      }

      toast.success(getTranslationFromI18nKeyAndLabel('folderUpload.popup.success', 'Folder uploaded successfully'))
      selection.clearSelection()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      console.error('Failed to upload employee document folder:', error)
      toast.error(getTranslationFromI18nKeyAndLabel('folderUpload.popup.error.uploadFailed', 'Failed to upload folder'))
    } finally {
      setIsUploading(false)
    }
  }, [accessToken, createEmployeeDocument, employeeId, fileClient, files, onOpenChange, onSuccess, selection])

  const renderDropZoneBody = () => {
    if (isProcessing) return <ProcessingState testIdPrefix={TEST_ID_PREFIX} />
    if (hasFiles) {
      return (
        <SelectionPreview
          testIdPrefix={TEST_ID_PREFIX}
          summary={summary}
          previewRows={previewRows}
          hiddenPreviewCount={hiddenPreviewCount}
          onShowMore={selection.showMorePreview}
          onClear={selection.clearSelection}
        />
      )
    }
    return <EmptyDropZone testIdPrefix={TEST_ID_PREFIX} onSelect={selection.openPicker} />
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent data-testid={`${TEST_ID_PREFIX}-dialog`}>
        <DialogHeader>
          <DialogTitle>{getTranslationFromI18nKeyAndLabel('document.upload.folder', 'Upload Folder')}</DialogTitle>
          <DialogDescription>
            {getTranslationFromI18nKeyAndLabel(
              'folderUpload.popup.description',
              'Drag and drop a folder below or pick one to upload.'
            )}
          </DialogDescription>
        </DialogHeader>

        {!employeeId && (
          <Alert variant="destructive" data-testid={`${TEST_ID_PREFIX}-missing-employee`}>
            {getTranslationFromI18nKeyAndLabel(
              'folderUpload.popup.error.missingEntity',
              'No record context found - cannot upload folder.'
            )}
          </Alert>
        )}

        <div {...dropZoneProps} className={dropZoneClasses} data-testid={`${TEST_ID_PREFIX}-drop-zone`}>
          {renderDropZoneBody()}
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          {...({ webkitdirectory: '' } as Record<string, string>)}
          className="gba:sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={selection.onInputChange}
          data-testid={`${TEST_ID_PREFIX}-native-input`}
        />

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            data-testid={`${TEST_ID_PREFIX}-cancel-button`}
          >
            {getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!employeeId || !hasFiles || isProcessing || isUploading}
            data-testid={`${TEST_ID_PREFIX}-upload-button`}
          >
            {isUploading
              ? getTranslationFromI18nKeyAndLabel('folderUpload.popup.uploading', 'Uploading...')
              : getTranslationFromI18nKeyAndLabel('folderUpload.popup.upload', 'Upload')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default DocumentFolderUpload
