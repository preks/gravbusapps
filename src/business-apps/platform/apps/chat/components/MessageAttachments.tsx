import React from 'react'
import { FileText, Download } from 'lucide-react'
import { useTranslation } from '@newwork/nw-design-system'
import { formatFileSize } from './utils/messageUtils'
import { isPreviewable } from './utils/attachmentUtils'
import translations from '../_i18n'

export interface MessageAttachment {
  id: string
  name: string
  url: string
  type?: string
  mimeType?: string
  size?: number
  thumbnailUrl?: string
}

interface MessageAttachmentsProps {
  attachments: MessageAttachment[]
  isOwnMessage: boolean
  onPreview: (attachment: MessageAttachment) => void
}

/**
 * Renders a list of message attachments with preview/download functionality
 */
export const MessageAttachments: React.FC<MessageAttachmentsProps> = ({ attachments, isOwnMessage, onPreview }) => {
  const { t } = useTranslation(translations)
  if (attachments.length === 0) return null

  return (
    <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mb-2">
      {attachments.map(att => {
        const kind = isPreviewable(att)

        if (kind === 'image') {
          return (
            <button
              key={att.id}
              type="button"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onPreview(att)
              }}
              className="gba:block gba:rounded-lg gba:overflow-hidden gba:max-w-[200px]"
              data-testid={`attachment-thumb-${att.id}`}
              title={t('chat-preview-open')}
            >
              <img
                src={att.thumbnailUrl || att.url}
                alt={att.name}
                className="gba:w-full gba:h-auto gba:max-h-[200px] gba:object-cover"
              />
            </button>
          )
        }

        if (kind === 'pdf') {
          return (
            <button
              key={att.id}
              type="button"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onPreview(att)
              }}
              className={`gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:transition-colors ${
                isOwnMessage
                  ? 'gba:bg-primary-foreground/20 gba:hover:bg-primary-foreground/30'
                  : 'gba:bg-muted/50 gba:hover:bg-muted'
              }`}
              data-testid={`attachment-pdf-${att.id}`}
              title={t('chat-preview-open')}
            >
              <FileText className="gba:w-5 gba:h-5 gba:flex-shrink-0" />
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:text-sm gba:font-medium gba:truncate">{att.name}</div>
                {att.size && (
                  <div className={`gba:text-xs ${isOwnMessage ? 'gba:opacity-70' : 'gba:text-muted-foreground'}`}>
                    {formatFileSize(att.size)}
                  </div>
                )}
              </div>
              <Download className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:opacity-60" />
            </button>
          )
        }

        // Non-previewable: download link
        return (
          <a
            key={att.id}
            href={att.url}
            target="_blank"
            rel="noopener noreferrer"
            download={att.name}
            className={`gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:transition-colors ${
              isOwnMessage
                ? 'gba:bg-primary-foreground/20 gba:hover:bg-primary-foreground/30'
                : 'gba:bg-muted/50 gba:hover:bg-muted'
            }`}
            data-testid={`attachment-download-${att.id}`}
          >
            <FileText className="gba:w-5 gba:h-5 gba:flex-shrink-0" />
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:text-sm gba:font-medium gba:truncate">{att.name}</div>
              {att.size && (
                <div className={`gba:text-xs ${isOwnMessage ? 'gba:opacity-70' : 'gba:text-muted-foreground'}`}>
                  {formatFileSize(att.size)}
                </div>
              )}
            </div>
            <Download className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:opacity-60" />
          </a>
        )
      })}
    </div>
  )
}
