import React from 'react'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@newwork/nw-design-system'
import { Paperclip, Download, Loader2 } from 'lucide-react'
import { formatFileSize } from '../../utils/emailDisplayUtils'
import type { EmailAttachment } from '../../types'

interface EmailAttachmentsSectionProps {
  attachments?: EmailAttachment[]
  hasAttachments: boolean
  downloadingAttachmentId: string | null
  onDownload: (attachmentId: string) => void
  countLabel: string
  fallbackLabel: string
  syncingLabel: string
  variant?: 'detailed' | 'compact'
  showTooltip?: boolean
  testIdPrefix?: string
}

export const EmailAttachmentsSection: React.FC<EmailAttachmentsSectionProps> = ({
  attachments,
  hasAttachments,
  downloadingAttachmentId,
  onDownload,
  countLabel,
  fallbackLabel,
  syncingLabel,
  variant = 'detailed',
  showTooltip = false,
  testIdPrefix
}) => {
  const nonInlineAttachments = (attachments || []).filter(attachment => !attachment.isInline)
  const attachmentCount = nonInlineAttachments.length

  if (!hasAttachments) return null

  const title = attachmentCount > 0 ? countLabel : fallbackLabel

  return (
    <div className={variant === 'detailed' ? 'gba:mt-6 gba:pt-4 gba:border-t' : 'gba:mt-4 gba:pt-3 gba:border-t'}>
      {variant === 'detailed' ? (
        <h3 className="gba:text-sm gba:font-medium gba:text-foreground gba:mb-3 gba:flex gba:items-center gba:gap-2">
          <Paperclip className="gba:w-4 gba:h-4" />
          {title}
        </h3>
      ) : (
        <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">{title}</p>
      )}

      {attachmentCount > 0 ? (
        <div className="gba:flex gba:flex-wrap gba:gap-2">
          {nonInlineAttachments.map(attachment => {
            const isDownloading = downloadingAttachmentId === attachment.id
            const button = (
              <button
                key={attachment.id}
                onClick={() => onDownload(attachment.id)}
                disabled={isDownloading}
                className={
                  variant === 'detailed'
                    ? 'gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:rounded-lg gba:border gba:bg-muted/30 gba:hover:bg-muted/50 gba:cursor-pointer gba:transition-colors gba:disabled:opacity-50'
                    : 'gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1.5 gba:rounded gba:border gba:bg-muted/30 gba:hover:bg-muted/50 gba:text-xs gba:disabled:opacity-50'
                }
                data-testid={testIdPrefix ? `${testIdPrefix}-${attachment.id}` : undefined}
              >
                <Paperclip
                  className={variant === 'detailed' ? 'gba:w-4 gba:h-4 gba:text-muted-foreground' : 'gba:w-3 gba:h-3'}
                />
                {variant === 'detailed' ? (
                  <div className="gba:text-left">
                    <p className="gba:text-xs gba:font-medium gba:text-foreground">{attachment.filename}</p>
                    <p className="gba:text-[10px] gba:text-muted-foreground">{formatFileSize(attachment.size)}</p>
                  </div>
                ) : (
                  <span className="gba:truncate gba:max-w-32">{attachment.filename}</span>
                )}
                {isDownloading ? (
                  <Loader2 className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:animate-spin" />
                ) : (
                  <Download className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                )}
              </button>
            )

            if (!showTooltip) {
              return button
            }

            return (
              <TooltipProvider key={attachment.id}>
                <Tooltip>
                  <TooltipTrigger asChild>{button}</TooltipTrigger>
                  <TooltipContent>
                    {attachment.filename} ({formatFileSize(attachment.size)})
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )
          })}
        </div>
      ) : (
        <p className="gba:text-xs gba:text-muted-foreground gba:italic">{syncingLabel}</p>
      )}
    </div>
  )
}
