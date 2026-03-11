import React, { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button } from '@newwork/nw-design-system'
import { Download, Loader2, AlertCircle, X } from 'lucide-react'
import type { DriveItem } from '../types/drive.types'
import { DriveApiService } from '../services/DriveApiService'

interface DriveFilePreviewDialogProps {
  item: DriveItem | null
  onClose: () => void
  onDownload?: (item: DriveItem) => void
  t: (key: string, args?: Record<string, unknown>) => string
  'data-testid'?: string
}

export const DriveFilePreviewDialog: React.FC<DriveFilePreviewDialogProps> = ({
  item,
  onClose,
  onDownload,
  t,
  'data-testid': testId = 'drive-file-preview'
}) => {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!item) {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl(null)
      }
      setError(null)
      return
    }

    let revoked = false
    setLoading(true)
    setError(null)

    DriveApiService.getFilePreviewBlob(item.id)
      .then(({ url }) => {
        if (revoked) {
          URL.revokeObjectURL(url)
          return
        }
        setPreviewUrl(url)
      })
      .catch(() => {
        if (!revoked) setError(t('preview-error'))
      })
      .finally(() => {
        if (!revoked) setLoading(false)
      })

    return () => {
      revoked = true
    }
  }, [item?.id])

  const handleClose = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl(null)
    }
    onClose()
  }, [previewUrl, onClose])

  const handleDownload = useCallback(() => {
    if (item && onDownload) onDownload(item)
  }, [item, onDownload])

  const isImage = item?.mimeType?.startsWith('image/')

  return (
    <Dialog
      open={!!item}
      onOpenChange={open => {
        if (!open) handleClose()
      }}
    >
      <DialogContent
        className="gba:max-w-4xl gba:max-h-[90vh] gba:flex gba:flex-col gba:p-0 gba:gap-0"
        data-testid={testId}
      >
        <DialogHeader className="gba:px-5 gba:py-4 gba:border-b gba:border-border/50 gba:flex-shrink-0">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
            <DialogTitle className="gba:truncate gba:text-base gba:font-semibold">
              {item?.name ?? t('preview-title')}
            </DialogTitle>
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0">
              {onDownload && item && (
                <Button variant="outline" size="sm" onClick={handleDownload} data-testid={`${testId}-download`}>
                  <Download className="gba:w-4 gba:h-4 gba:mr-1.5" />
                  {t('preview-download')}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={handleClose} data-testid={`${testId}-close`}>
                <X className="gba:w-4 gba:h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        <div className="gba:flex-1 gba:overflow-auto gba:flex gba:items-center gba:justify-center gba:p-4 gba:min-h-[300px]">
          {loading && (
            <div
              className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:text-muted-foreground"
              data-testid={`${testId}-loading`}
            >
              <Loader2 className="gba:w-8 gba:h-8 gba:animate-spin" />
              <span className="gba:text-sm">{t('preview-loading')}</span>
            </div>
          )}
          {error && (
            <div
              className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:text-muted-foreground"
              data-testid={`${testId}-error`}
            >
              <AlertCircle className="gba:w-8 gba:h-8" />
              <span className="gba:text-sm">{error}</span>
            </div>
          )}
          {!loading && !error && previewUrl && isImage && (
            <img
              src={previewUrl}
              alt={item?.name ?? ''}
              className="gba:max-w-full gba:max-h-[calc(90vh-120px)] gba:object-contain gba:rounded-md"
              data-testid={`${testId}-image`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
