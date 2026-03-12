import React from 'react'
import { Upload, Loader2 } from 'lucide-react'
import type { UploadProgress } from '../hooks/useDriveUpload'

interface DriveDropZoneOverlayProps {
  isDragActive: boolean
  uploadProgress: UploadProgress | null
  t: (key: string) => string
  'data-testid'?: string
}

export const DriveDropZoneOverlay: React.FC<DriveDropZoneOverlayProps> = ({
  isDragActive,
  uploadProgress,
  t,
  'data-testid': testId = 'drive-drop-overlay'
}) => {
  if (isDragActive) {
    return (
      <div
        className="gba:absolute gba:inset-0 gba:z-50 gba:flex gba:flex-col gba:items-center gba:justify-center gba:bg-primary/10 gba:border-2 gba:border-dashed gba:border-primary gba:rounded-xl gba:backdrop-blur-sm gba:pointer-events-none"
        data-testid={testId}
      >
        <div className="gba:w-16 gba:h-16 gba:rounded-2xl gba:bg-primary/20 gba:flex gba:items-center gba:justify-center gba:mb-4">
          <Upload className="gba:w-8 gba:h-8 gba:text-primary" />
        </div>
        <p className="gba:text-lg gba:font-semibold gba:text-primary">{t('dropzone-title')}</p>
        <p className="gba:text-sm gba:text-muted-foreground">{t('dropzone-description')}</p>
      </div>
    )
  }

  if (uploadProgress) {
    const percent = uploadProgress.total > 0 ? Math.round((uploadProgress.current / uploadProgress.total) * 100) : 0

    return (
      <div
        className="gba:absolute gba:bottom-4 gba:left-1/2 gba:-translate-x-1/2 gba:z-50 gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:rounded-xl gba:bg-card gba:border gba:border-border gba:min-w-80"
        data-testid={`${testId}-progress`}
      >
        <Loader2 className="gba:w-5 gba:h-5 gba:text-primary gba:animate-spin gba:flex-shrink-0" />
        <div className="gba:flex-1 gba:min-w-0">
          <p className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">
            {uploadProgress.currentFileName}
          </p>
          <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
            <div className="gba:flex-1 gba:h-1.5 gba:rounded-full gba:bg-muted">
              <div
                className="gba:h-full gba:rounded-full gba:bg-primary gba:transition-all"
                style={{ width: `${percent}%` }}
              />
            </div>
            <span className="gba:text-xs gba:text-muted-foreground gba:flex-shrink-0">
              {uploadProgress.current + 1}/{uploadProgress.total}
            </span>
          </div>
        </div>
      </div>
    )
  }

  return null
}
