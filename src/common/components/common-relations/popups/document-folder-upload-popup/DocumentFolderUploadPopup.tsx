/**
 * Shared Document Folder Upload Popup (common component)
 *
 * IRM and CRM render their own thin wrappers (under
 * `src/business-apps/<app>/core/popups/document-folder-upload-popup/`) which
 * extract entity context from `additionalData` and hand it to this
 * component. All UI behaviour — drag-and-drop, native folder picker, tree
 * preview with progressive "Show more", processing spinner, and the
 * AppActionForm submit wiring — lives here so the two apps stay in sync.
 *
 * Note on the browser consent dialog: any folder-picker API
 * (webkitdirectory input or File System Access) triggers a mandatory
 * Chromium prompt ("Upload N files to this site?" or "Allow this site to
 * view and copy files?") that cannot be suppressed from JavaScript. Users
 * who don't want the prompt can drag-and-drop instead — drop events are
 * treated by browsers as implicit user consent and never prompt.
 *
 * The popup is wired to the flow engine via {@link AppActionForm}: on submit
 * it returns `{ [payloadKey]: FolderUploadPayload }` and AppActionForm
 * dispatches the `pse_submit` event so the Kogito task completes with that
 * payload. The wrapper chooses `payloadKey` (e.g. `investmentDocumentTree`).
 */

import React, { useCallback, useMemo } from 'react'
import { Alert } from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { AppActionForm } from '@/components/app-action-form'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildFolderTree, type FolderUploadEntityIds, type FolderUploadPayload } from '@/common/utils/folderUploadUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { EmptyDropZone } from './components/EmptyDropZone'
import { ProcessingState } from './components/ProcessingState'
import { SelectionPreview } from './components/SelectionPreview'
import { useFolderPreviewTree } from './hooks/useFolderPreviewTree'
import { useFolderSelection } from './hooks/useFolderSelection'

const DEFAULT_TEST_ID_PREFIX = 'document-folder-upload-popup'

export interface DocumentFolderUploadPopupProps extends BusinessAppContextProps {
  /** Active entity type — must be provided by the wrapper (empty string means "no record context"). */
  readonly entityType: string
  /** Active entity id — must be provided by the wrapper. */
  readonly entityId: string
  /** All entity ids known at submit time (lead / contact / account / opportunity / investment). */
  readonly entityIds: FolderUploadEntityIds
  /**
   * Key under which the folder tree is placed in the form submit payload
   * (e.g. `investmentDocumentTree` for the IRM flow).
   */
  readonly payloadKey: string
  /** Optional override for the data-testid prefix used by every control. */
  readonly 'data-testid'?: string
  readonly onClose?: () => void
}

/**
 * Normalise a File[] / FileList into a FileList that `buildFolderTree` can
 * consume. When a native `DataTransfer` is available we use it for a real
 * FileList; otherwise we fall back to a FileList-compatible shape.
 */
function toFileList(input: FileList | File[]): FileList {
  if (typeof FileList !== 'undefined' && input instanceof FileList) {
    return input
  }

  const files = input as File[]

  if (typeof DataTransfer !== 'undefined') {
    const dt = new DataTransfer()
    for (const file of files) {
      dt.items.add(file)
    }
    return dt.files
  }

  const fallback: FileList = {
    length: files.length,
    item: (index: number) => files[index] ?? null,
    [Symbol.iterator]: function* () {
      for (const f of files) yield f
    }
  } as unknown as FileList

  for (let i = 0; i < files.length; i++) {
    ;(fallback as unknown as Record<number, File>)[i] = files[i]
  }

  return fallback
}

function buildDropZoneClasses(isDragActive: boolean): string {
  const base =
    'gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-2 gba:border-2 gba:border-dashed gba:rounded-md gba:p-6 gba:text-center gba:min-h-[140px] gba:transition-colors'
  const borderColor = isDragActive ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-input gba:bg-muted/30'
  return `${base} ${borderColor}`
}

export const DocumentFolderUploadPopup: React.FC<DocumentFolderUploadPopupProps> = props => {
  const { entityType, entityId, entityIds, payloadKey, onClose } = props
  const testIdPrefix = props['data-testid'] ?? DEFAULT_TEST_ID_PREFIX

  const selection = useFolderSelection()
  const { files, isProcessing, previewLimit, isDragActive, inputRef, dropZoneProps } = selection

  const { summary, previewRows, hiddenPreviewCount } = useFolderPreviewTree(files, previewLimit)

  // AppActionForm requires a react-hook-form instance. We don't bind any
  // field to the form state — files live in the selection hook — but RHF is
  // still used for the submit/cancel button lifecycle.
  const form = useForm<Record<string, never>>({ defaultValues: {} })

  const handleSubmit = useCallback(async (): Promise<Record<string, FolderUploadPayload>> => {
    if (files.length === 0) {
      throw new Error(
        getTranslationFromI18nKeyAndLabel('folderUpload.popup.error.noFiles', 'Please select a folder before uploading')
      )
    }
    const fileList = toFileList(files as File[])
    const payload = buildFolderTree(fileList, entityIds)
    return { [payloadKey]: payload }
  }, [files, entityIds, payloadKey])

  const dropZoneClasses = useMemo(() => buildDropZoneClasses(isDragActive), [isDragActive])

  if (!entityType || !entityId) {
    return (
      <Alert variant="destructive" data-testid={`${testIdPrefix}-missing-entity`}>
        {getTranslationFromI18nKeyAndLabel(
          'folderUpload.popup.error.missingEntity',
          'No record context found — cannot upload folder.'
        )}
      </Alert>
    )
  }

  const hasFiles = files.length > 0

  const renderDropZoneBody = () => {
    if (isProcessing) return <ProcessingState testIdPrefix={testIdPrefix} />
    if (hasFiles) {
      return (
        <SelectionPreview
          testIdPrefix={testIdPrefix}
          summary={summary}
          previewRows={previewRows}
          hiddenPreviewCount={hiddenPreviewCount}
          onShowMore={selection.showMorePreview}
          onClear={selection.clearSelection}
        />
      )
    }
    return <EmptyDropZone testIdPrefix={testIdPrefix} onSelect={selection.openPicker} />
  }

  return (
    <AppActionForm
      processType="create"
      onSubmit={handleSubmit}
      onCancel={onClose}
      formData={form.getValues()}
      form={form}
      isSubmitDisabled={!hasFiles}
      data-testid={`${testIdPrefix}-form`}
      submitButtonText={getTranslationFromI18nKeyAndLabel('folderUpload.popup.upload', 'Upload')}
      cancelButtonText={getTranslationFromI18nKeyAndLabel('common.cancel', 'Cancel')}
    >
      <div className="gba:space-y-4" data-testid={`${testIdPrefix}-content`}>
        <p className="gba:text-sm gba:text-muted-foreground gba:text-center">
          {getTranslationFromI18nKeyAndLabel(
            'folderUpload.popup.description',
            'Drag and drop a folder below or pick one to upload.'
          )}
        </p>

        <div {...dropZoneProps} className={dropZoneClasses} data-testid={`${testIdPrefix}-drop-zone`}>
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
          data-testid={`${testIdPrefix}-native-input`}
        />
      </div>
    </AppActionForm>
  )
}

export default DocumentFolderUploadPopup
