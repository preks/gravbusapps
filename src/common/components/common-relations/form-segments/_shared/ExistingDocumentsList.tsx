import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { DownloadIcon, XIcon } from 'lucide-react'
import { handleDocumentClick, type DocumentWithFileInfo } from '@/common/utils/documentClickHandler'
import { formatFileSize } from '@/common/utils/fileUtils'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import { cn } from '@/common/utils/cn'

export interface ExistingDocument extends DocumentWithFileInfo {
  fileSize?: number | null
  version?: number
}

export interface ExistingDocumentsListProps {
  documents: ExistingDocument[]
  accessToken?: string
  onRemove?: (documentId: string) => void
  /** Section heading rendered above the list. Defaults to "Attached documents". */
  label?: string
  className?: string
  ['data-testid']?: string
}

/**
 * Renders existing (already uploaded) documents for forms in update mode.
 *
 * Replaces the design-system FileUpload's built-in download (which uses an
 * unauthenticated `<a href>` against `file.url`) with the same authenticated
 * `handleDocumentClick` flow used by the detail sheets and Documents tab,
 * so the actual file bytes are fetched with the access token instead of an
 * HTML SPA shell being saved under the file's name.
 *
 * Visually distinct from the FileUpload dropzone above it: this is "what is
 * already attached", whereas the upload component is the "add more" affordance.
 */
export const ExistingDocumentsList: React.FC<ExistingDocumentsListProps> = ({
  documents,
  accessToken,
  onRemove,
  label = 'Attached documents',
  className,
  'data-testid': dataTestId = 'existing-documents-list'
}) => {
  if (!documents || documents.length === 0) {
    return null
  }

  const open = (doc: ExistingDocument) => handleDocumentClick(doc, accessToken, { showToast: true })

  return (
    <div className={cn('gba:flex gba:flex-col gba:gap-2', className)} data-testid={dataTestId}>
      <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
        {label} ({documents.length})
      </span>
      <ul className="gba:flex gba:flex-col gba:gap-1">
        {documents.map(doc => {
          const displayName = doc.name || 'Unnamed Document'
          const sizeLabel = doc.fileSize ? formatFileSize(doc.fileSize) : null
          const itemTestId = `${dataTestId}-item-${doc.id}`
          const iconElement = getDocumentIcon({
            name: doc.name,
            mimeType: doc.mimeType ?? doc.fileInfo?.fileMetadata?.mimeType ?? undefined,
            size: 20,
            className: 'gba:h-5 gba:w-5'
          })

          return (
            <li
              key={doc.id}
              className="gba:flex gba:w-full gba:items-center gba:gap-2 gba:rounded-lg gba:border gba:bg-background gba:p-2 gba:pe-3"
              data-testid={itemTestId}
            >
              <button
                type="button"
                onClick={() => open(doc)}
                className="gba:flex gba:flex-1 gba:items-center gba:gap-3 gba:overflow-hidden gba:text-left"
                aria-label={`Open ${displayName}`}
                data-testid={`${itemTestId}-open`}
              >
                <span className="gba:flex gba:aspect-square gba:size-10 gba:shrink-0 gba:items-center gba:justify-center gba:rounded gba:border gba:bg-background">
                  {iconElement}
                </span>
                <span className="gba:flex gba:min-w-0 gba:flex-col gba:gap-0.5">
                  <span className="gba:truncate gba:text-[13px] gba:font-medium">{displayName}</span>
                  {sizeLabel && <span className="gba:text-xs gba:text-muted-foreground">{sizeLabel}</span>}
                </span>
              </button>

              <div className="gba:flex gba:gap-1">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="gba:-me-2 gba:size-8 gba:text-muted-foreground/80 gba:hover:bg-transparent gba:hover:text-foreground"
                  onClick={() => open(doc)}
                  aria-label={`Download ${displayName}`}
                  data-testid={`${itemTestId}-download`}
                >
                  <DownloadIcon className="gba:size-4" aria-hidden="true" />
                </Button>

                {onRemove && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="gba:-me-2 gba:size-8 gba:text-muted-foreground/80 gba:hover:bg-transparent gba:hover:text-foreground"
                    onClick={() => onRemove(doc.id)}
                    aria-label={`Remove ${displayName}`}
                    data-testid={`${itemTestId}-remove`}
                  >
                    <XIcon className="gba:size-4" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export default ExistingDocumentsList
