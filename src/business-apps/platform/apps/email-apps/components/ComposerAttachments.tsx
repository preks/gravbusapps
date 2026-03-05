/**
 * ComposerAttachments - Renders attachment chip list for the email composer.
 * Presentational only — state management is in useFileAttachments hook.
 */

import React from 'react'
import { X, Image, FileText, File } from 'lucide-react'
import type { SendAttachment } from '../types'

interface ComposerAttachmentsProps {
  attachments: SendAttachment[]
  onRemove: (index: number) => void
  totalSize: number
  /** Optional formatter for summary text when multiple files: (count, size) => string */
  formatSummary?: (count: number, size: string) => string
  'data-testid'?: string
}

/** Converts bytes to human-readable size */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** Returns an icon based on content type */
function AttachmentIcon({ contentType }: { contentType: string }) {
  if (contentType.startsWith('image/')) return <Image className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
  if (contentType === 'application/pdf' || contentType.includes('document'))
    return <FileText className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
  return <File className="gba:w-3.5 gba:h-3.5 gba:text-muted-foreground" />
}

export const ComposerAttachments: React.FC<ComposerAttachmentsProps> = ({
  attachments,
  onRemove,
  totalSize,
  'data-testid': testId = 'composer-attachments'
}) => {
  if (attachments.length === 0) return null

  return (
    <div className="gba:px-4 gba:py-2 gba:border-t gba:bg-muted/20" data-testid={testId}>
      <div className="gba:flex gba:flex-wrap gba:gap-1.5">
        {attachments.map((att, idx) => (
          <div
            key={`${att.filename}-${idx}`}
            className="gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1 gba:rounded gba:border gba:bg-card gba:text-xs gba:max-w-52"
            data-testid={`${testId}-chip-${idx}`}
          >
            <AttachmentIcon contentType={att.contentType} />
            <span className="gba:truncate gba:flex-1" title={att.filename}>
              {att.filename}
            </span>
            <span className="gba:text-muted-foreground gba:flex-shrink-0">{formatSize(att.size || 0)}</span>
            <button
              onClick={() => onRemove(idx)}
              className="gba:p-0.5 gba:rounded-full hover:gba:bg-destructive/10 gba:text-muted-foreground hover:gba:text-destructive gba:flex-shrink-0"
              data-testid={`${testId}-remove-${idx}`}
            >
              <X className="gba:w-3 gba:h-3" />
            </button>
          </div>
        ))}
      </div>
      {attachments.length > 1 && (
        <p className="gba:text-[10px] gba:text-muted-foreground gba:mt-1">
          {formatSummary
            ? formatSummary(attachments.length, formatSize(totalSize))
            : `${attachments.length} files · ${formatSize(totalSize)}`}
        </p>
      )}
    </div>
  )
}
