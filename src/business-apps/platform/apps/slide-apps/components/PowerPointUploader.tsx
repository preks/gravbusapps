// Drag-and-drop interface for importing PowerPoint (.pptx) files.
// Shows progress, then an import preview dialog for slide selection.

import React, { useCallback, useState } from 'react'
import { Button, Card, Spinner, useTranslation } from '@newwork/nw-design-system'
import { Upload, AlertCircle, X, Presentation, Check } from 'lucide-react'
import { toast } from 'sonner'
import { usePowerPointParser, type ParsedPowerPointDocument } from '../hooks/usePowerPointParser'
import { ImportPreviewDialog } from './ImportPreviewDialog'
import translations from '../_i18n'

export interface PowerPointUploaderProps {
  onFileParsed: (parsedDocument: ParsedPowerPointDocument) => void | Promise<void>
  onError?: (error: string) => void
  onCancel?: () => void
  showPreview?: boolean
  maxFileSize?: number
  'data-testid'?: string
}

const MAX_FILE_SIZE_DEFAULT = 50 * 1024 * 1024

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export const PowerPointUploader: React.FC<PowerPointUploaderProps> = ({
  onFileParsed,
  onError,
  onCancel,
  showPreview = true,
  maxFileSize = MAX_FILE_SIZE_DEFAULT,
  'data-testid': testId = 'powerpoint-uploader'
}) => {
  const { t } = useTranslation(translations)
  const [isDragging, setIsDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const { isLoading, progress, error, parsedDocument, parseFile, reset } = usePowerPointParser({ t })

  const handleFile = useCallback(
    async (file: File) => {
      if (file.size > maxFileSize) {
        const errorMsg = t('import-file-too-large', { maxSize: formatFileSize(maxFileSize) })
        toast.error(errorMsg)
        onError?.(errorMsg)
        return
      }

      const result = await parseFile(file)

      if (result && !showPreview) {
        toast.success(t('toast-import-success'))
        onFileParsed(result)
      } else if (!result && error) {
        toast.error(t('toast-import-failed-generic'))
        onError?.(error)
      }
    },
    [parseFile, maxFileSize, onFileParsed, onError, error, showPreview, t]
  )

  const handlePreviewConfirm = useCallback(
    async (doc: ParsedPowerPointDocument) => {
      setIsImporting(true)
      try {
        await onFileParsed(doc)
      } catch (err) {
        console.error('[PowerPointUploader] Import failed:', err)
      } finally {
        setIsImporting(false)
      }
    },
    [onFileParsed]
  )

  const handlePreviewCancel = useCallback(() => {
    reset()
  }, [reset])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setIsDragging(false)

      const files = Array.from(e.dataTransfer.files)
      const pptxFile = files.find(
        f =>
          f.type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
          f.name.toLowerCase().endsWith('.pptx')
      )

      if (pptxFile) {
        handleFile(pptxFile)
      } else {
        const errorMsg = t('import-drop-pptx')
        toast.error(errorMsg)
        onError?.(errorMsg)
      }
    },
    [handleFile, onError, t]
  )

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) handleFile(file)
    },
    [handleFile]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleRetry = useCallback(() => {
    reset()
  }, [reset])

  if (isImporting) {
    return (
      <Card className="gba:p-8 gba:text-center" data-testid={testId}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <Spinner size="lg" />
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{t('import-importing-title')}</h3>
            <p className="gba:text-muted-foreground gba:text-sm">{t('import-saving')}</p>
          </div>
        </div>
      </Card>
    )
  }

  if (isLoading) {
    return (
      <Card className="gba:p-8 gba:text-center" data-testid={testId}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <Spinner size="lg" />
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{t('import-importing-title')}</h3>
            <p className="gba:text-muted-foreground gba:text-sm">{t('import-parsing')}</p>
            <div className="gba:mt-4 gba:w-64 gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
              <div
                className="gba:h-full gba:bg-primary gba:transition-all gba:duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{Math.round(progress)}%</p>
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className="gba:p-8 gba:text-center" data-testid={testId}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-destructive/10 gba:flex gba:items-center gba:justify-center">
            <AlertCircle className="gba:w-8 gba:h-8 gba:text-destructive" />
          </div>
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-destructive gba:mb-2">{t('import-failed-title')}</h3>
            <p className="gba:text-muted-foreground gba:text-sm">{t(error)}</p>
          </div>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              {t('import-try-again')}
            </Button>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                {t('import-cancel')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  if (parsedDocument && showPreview) {
    return (
      <ImportPreviewDialog
        parsedDocument={parsedDocument}
        onConfirm={handlePreviewConfirm}
        onCancel={handlePreviewCancel}
        data-testid={`${testId}-preview`}
      />
    )
  }

  return (
    <Card
      className={`gba:p-8 gba:border-2 gba:border-dashed gba:transition-colors ${
        isDragging
          ? 'gba:border-primary gba:bg-primary/5'
          : 'gba:border-border hover:gba:border-primary/50 hover:gba:bg-muted/30'
      }`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      data-testid={testId}
    >
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:text-center">
        <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
          <Presentation className="gba:w-8 gba:h-8 gba:text-primary" />
        </div>

        <div>
          <h3 className="gba:text-lg gba:font-semibold gba:mb-2">{t('import-powerpoint-title')}</h3>
          <p className="gba:text-muted-foreground gba:text-sm gba:mb-1">{t('import-drag-drop')}</p>
          <p className="gba:text-xs gba:text-muted-foreground">
            {t('import-max-size', { size: formatFileSize(maxFileSize) })}
          </p>
        </div>

        <div className="gba:flex gba:gap-2">
          <Button variant="default" size="sm" onClick={() => document.getElementById(`${testId}-file-input`)?.click()}>
            <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('import-choose-file')}
          </Button>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="gba:w-4 gba:h-4 gba:mr-2" />
              {t('import-cancel')}
            </Button>
          )}
        </div>

        <input
          id={`${testId}-file-input`}
          type="file"
          accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
          onChange={handleFileInput}
          className="gba:hidden"
        />

        <div className="gba:border-t gba:pt-4 gba:w-full">
          <div className="gba:flex gba:flex-wrap gba:justify-center gba:gap-x-4 gba:gap-y-1.5">
            {(
              [
                'import-feature-text',
                'import-feature-images',
                'import-feature-layouts',
                'import-feature-transitions'
              ] as const
            ).map(key => (
              <span
                key={key}
                className="gba:inline-flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground"
              >
                <Check className="gba:w-3 gba:h-3 gba:text-primary gba:shrink-0" />
                {t(key)}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

export default PowerPointUploader
