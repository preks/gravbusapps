import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@newwork/nw-design-system'
import { X, Download } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { MessageAttachment } from './MessageAttachments'
import { isPreviewable } from './utils/attachmentUtils'

interface AttachmentPreviewDialogProps {
  open: boolean
  attachment: MessageAttachment | null
  objectUrl?: string
  onClose: () => void
}

/**
 * Dialog for previewing image and PDF attachments
 */
export const AttachmentPreviewDialog: React.FC<AttachmentPreviewDialogProps> = ({
  open,
  attachment,
  objectUrl,
  onClose
}) => {
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)

  if (!attachment) return null

  const kind = isPreviewable(attachment)
  const isImage = kind === 'image'
  const isPdf = kind === 'pdf'
  const src = objectUrl || attachment.url

  // Calculate dialog size based on image dimensions
  const getDialogStyle = () => {
    if (!isImage || !imageDimensions) {
      // Full size for PDFs and unsupported types
      return {
        maxWidth: 'calc(100vw - 32px)',
        width: 'calc(100vw - 32px)',
        height: 'calc(100vh - 32px)'
      }
    }

    // For images, calculate size based on image dimensions
    const maxWidth = window.innerWidth - 64
    const maxHeight = window.innerHeight - 64
    const headerFooterHeight = 100

    const availableHeight = maxHeight - headerFooterHeight
    const imgWidth = imageDimensions.width
    const imgHeight = imageDimensions.height

    // Calculate scale to fit within available space
    const scaleX = maxWidth / imgWidth
    const scaleY = availableHeight / imgHeight
    const scale = Math.min(scaleX, scaleY, 1)

    const dialogWidth = Math.max(400, imgWidth * scale + 32)

    return {
      maxWidth: `${Math.min(dialogWidth, maxWidth)}px`,
      width: 'auto',
      height: 'auto',
      maxHeight: `${maxHeight}px`
    }
  }

  const dialogStyle = getDialogStyle()

  return (
    <Dialog open={open} onOpenChange={val => !val && onClose()}>
      <DialogContent
        className="gba:!p-0 gba:overflow-hidden gba:flex gba:flex-col"
        style={{
          maxWidth: dialogStyle.maxWidth,
          width: dialogStyle.width,
          height: dialogStyle.height,
          maxHeight: dialogStyle.maxHeight
        }}
        data-testid="attachment-preview-dialog"
      >
        {/* Header */}
        <DialogHeader className="gba:px-4 gba:py-2 gba:flex gba:flex-row gba:items-center gba:justify-between gba:border-b gba:border-border gba:flex-shrink-0">
          <DialogTitle className="gba:text-sm gba:font-medium gba:truncate gba:flex-1 gba:pr-4">
            {attachment.name}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="gba:h-8 gba:w-8"
            onClick={onClose}
            data-testid="attachment-preview-close"
          >
            <X className="gba:h-4 gba:w-4" />
          </Button>
        </DialogHeader>

        {/* Content */}
        <div className="gba:flex-1 gba:min-h-0 gba:overflow-hidden gba:bg-muted/30 gba:flex gba:items-center gba:justify-center">
          {isImage && (
            <img
              src={src}
              alt={attachment.name}
              className="gba:max-w-full gba:max-h-full gba:object-contain"
              onLoad={e => {
                const img = e.currentTarget
                setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight })
              }}
              data-testid="attachment-preview-image"
            />
          )}
          {isPdf && (
            <iframe
              src={src}
              title={attachment.name}
              className="gba:w-full gba:h-full gba:border-none gba:min-h-[70vh]"
              data-testid="attachment-preview-pdf"
            />
          )}
          {!isImage && !isPdf && (
            <div className="gba:text-sm gba:text-muted-foreground gba:p-8">
              {getTranslationFromI18nKeyAndLabel('chat.preview.unsupported', 'Preview not available.')}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="gba:px-4 gba:py-3 gba:flex gba:items-center gba:justify-end gba:gap-2 gba:border-t gba:border-border gba:flex-shrink-0 gba:bg-background">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(attachment.url, '_blank', 'noopener,noreferrer')}
            data-testid="attachment-open-newtab"
          >
            {getTranslationFromI18nKeyAndLabel('chat.preview.openNewTab', 'Open in new tab')}
          </Button>
          <Button variant="default" size="sm" asChild data-testid="attachment-download">
            <a href={src} download={attachment.name}>
              <Download className="gba:w-4 gba:h-4 gba:mr-2" />
              {getTranslationFromI18nKeyAndLabel('chat.preview.download', 'Download')}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
