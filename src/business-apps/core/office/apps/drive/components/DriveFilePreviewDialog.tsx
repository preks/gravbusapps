import React, { useEffect, useState, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Badge } from '@newwork/nw-design-system'
import {
  Download,
  Loader2,
  AlertCircle,
  FileText,
  Presentation,
  FileSpreadsheet,
  FileJson,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  File,
  Image as ImageIcon
} from 'lucide-react'
import type { DriveItem } from '../types/drive.types'
import { getFileTypeLabel, formatFileSize } from '../types/drive.types'
import { DriveApiService } from '../services/DriveApiService'
import { createSafeObjectUrl } from '@/common/utils/safeUrlUtils'

interface DriveFilePreviewDialogProps {
  item: DriveItem | null
  onClose: () => void
  onDownload?: (item: DriveItem) => void
  t: (key: string, args?: Record<string, unknown>) => string
  'data-testid'?: string
}

const PdfIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M8 4C8 2.89543 8.89543 2 10 2H24L32 10V36C32 37.1046 31.1046 38 30 38H10C8.89543 38 8 37.1046 8 36V4Z"
      fill="currentColor"
      fillOpacity="0.08"
      stroke="currentColor"
      strokeOpacity="0.3"
      strokeWidth="1.5"
    />
    <path d="M24 2L32 10H26C24.8954 10 24 9.10457 24 8V2Z" fill="currentColor" fillOpacity="0.15" />
    <rect x="10" y="22" rx="2" width="20" height="12" fill="hsl(var(--destructive))" />
    <text
      x="20"
      y="31.5"
      textAnchor="middle"
      fill="hsl(var(--destructive-foreground))"
      fontSize="7.5"
      fontWeight="700"
      fontFamily="system-ui, sans-serif"
    >
      PDF
    </text>
  </svg>
)

function resolvePreviewIcon(mime: string, name: string): { Icon: React.ElementType; color: string } {
  const m = mime.toLowerCase()
  const n = name.toLowerCase()
  if (m.startsWith('image/')) return { Icon: ImageIcon, color: 'gba:text-primary' }
  if (m === 'application/pdf') return { Icon: PdfIcon, color: 'gba:text-destructive' }
  if (m.includes('presentation') || m.includes('powerpoint') || /\.pptx?$/.test(n))
    return { Icon: Presentation, color: 'gba:text-warning' }
  if (m.includes('spreadsheet') || m.includes('excel') || /\.xlsx?$/.test(n) || n.endsWith('.csv'))
    return { Icon: FileSpreadsheet, color: 'gba:text-success' }
  if (m === 'application/json' || n.endsWith('.json')) return { Icon: FileJson, color: 'gba:text-info' }
  if (m.startsWith('video/')) return { Icon: FileVideo, color: 'gba:text-destructive' }
  if (m.startsWith('audio/')) return { Icon: FileAudio, color: 'gba:text-warning' }
  if (m.includes('zip') || m.includes('tar') || m.includes('rar'))
    return { Icon: FileArchive, color: 'gba:text-muted-foreground' }
  if (/\.(jsx?|tsx?|py|go|rs|java)$/i.test(n)) return { Icon: FileCode, color: 'gba:text-info' }
  if (m.includes('word') || /\.docx?$/.test(n)) return { Icon: FileText, color: 'gba:text-info' }
  return { Icon: File, color: 'gba:text-muted-foreground' }
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
      .then(({ blob, mimeType }) => {
        const url = createSafeObjectUrl(blob, currentMimeType => {
          const effectiveMimeType = (currentMimeType || mimeType || '').toLowerCase()
          return effectiveMimeType.startsWith('image/') || effectiveMimeType === 'application/pdf'
        })
        if (!url) throw new Error('Unsupported preview type')
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
  const isPdf = item?.mimeType === 'application/pdf'
  const { Icon: FileIcon, color: iconColor } = resolvePreviewIcon(item?.mimeType ?? '', item?.name ?? '')
  const typeLabel = item ? getFileTypeLabel(item.type, item.mimeType, item.name) : ''

  const dialogWidth = isPdf ? 'gba:max-w-[95vw] gba:w-[1200px]' : 'gba:max-w-5xl'

  return (
    <Dialog
      open={!!item}
      onOpenChange={open => {
        if (!open) handleClose()
      }}
    >
      <DialogContent
        className={`${dialogWidth} gba:max-h-[95vh] gba:h-[90vh] gba:flex gba:flex-col gba:p-0 gba:gap-0`}
        data-testid={testId}
      >
        <DialogHeader className="gba:pl-6 gba:pr-14 gba:py-4 gba:border-b gba:border-border/40 gba:flex-shrink-0 gba:bg-card">
          <div className="gba:flex gba:items-center gba:gap-4">
            <div className="gba:w-10 gba:h-10 gba:rounded-xl gba:bg-muted/60 gba:flex gba:items-center gba:justify-center gba:flex-shrink-0">
              <FileIcon className={`gba:w-5 gba:h-5 ${iconColor}`} />
            </div>
            <div className="gba:flex-1 gba:min-w-0">
              <DialogTitle className="gba:truncate gba:text-base gba:font-semibold">
                {item?.name ?? t('preview-title')}
              </DialogTitle>
              <div className="gba:flex gba:items-center gba:gap-2 gba:mt-0.5">
                <Badge variant="outline" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                  {typeLabel}
                </Badge>
                {item?.fileSize ? (
                  <span className="gba:text-xs gba:text-muted-foreground">{formatFileSize(item.fileSize)}</span>
                ) : null}
                {item?.externalSource && (
                  <Badge variant="info" className="gba:text-[10px] gba:px-1.5 gba:py-0">
                    Imported
                  </Badge>
                )}
              </div>
            </div>
            {onDownload && item && (
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                className="gba:flex-shrink-0"
                data-testid={`${testId}-download`}
              >
                <Download className="gba:w-4 gba:h-4 gba:mr-1.5" />
                {t('preview-download')}
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="gba:flex-1 gba:overflow-auto gba:flex gba:items-center gba:justify-center gba:bg-muted/20 gba:min-h-0">
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
            <div className="gba:p-6 gba:flex gba:items-center gba:justify-center gba:w-full gba:h-full">
              <img
                src={previewUrl}
                alt={item?.name ?? ''}
                className="gba:max-w-full gba:max-h-full gba:object-contain gba:rounded-lg"
                data-testid={`${testId}-image`}
              />
            </div>
          )}
          {!loading && !error && previewUrl && isPdf && (
            <iframe
              src={previewUrl}
              title={item?.name ?? 'PDF Preview'}
              className="gba:w-full gba:h-full gba:border-0"
              data-testid={`${testId}-pdf`}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
