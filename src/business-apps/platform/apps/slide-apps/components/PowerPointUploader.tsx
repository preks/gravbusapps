/**
 * PowerPointUploader Component
 *
 * Drag-and-drop interface for importing PowerPoint (.pptx) files.
 * Shows progress, preview, and error handling.
 */

import React, { useCallback, useState } from 'react'
import { Button, Card, Spinner } from '@newwork/nw-design-system'
import { Upload, CheckCircle, AlertCircle, X, Presentation } from 'lucide-react'
import { toast } from 'sonner'
import { usePowerPointParser, type ParsedPowerPointDocument } from '../hooks/usePowerPointParser'

export interface PowerPointUploaderProps {
  onFileParsed: (parsedDocument: ParsedPowerPointDocument) => void
  onError?: (error: string) => void
  onCancel?: () => void
  maxFileSize?: number // in bytes, default 50MB
  'data-testid'?: string
}

const MAX_FILE_SIZE_DEFAULT = 50 * 1024 * 1024 // 50MB

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * PowerPointUploader Component
 */
export const PowerPointUploader: React.FC<PowerPointUploaderProps> = ({
  onFileParsed,
  onError,
  onCancel,
  maxFileSize = MAX_FILE_SIZE_DEFAULT,
  'data-testid': testId = 'powerpoint-uploader'
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const { isLoading, progress, error, parsedDocument, parseFile, reset } = usePowerPointParser()

  /**
   * Handle file selection
   */
  const handleFile = useCallback(
    async (file: File) => {
      // Validate file size
      if (file.size > maxFileSize) {
        const errorMsg = `File too large. Maximum size is ${formatFileSize(maxFileSize)}`
        toast.error(errorMsg)
        onError?.(errorMsg)
        return
      }

      // Parse the file
      const result = await parseFile(file)

      if (result) {
        toast.success('PowerPoint imported successfully')
        onFileParsed(result)
      } else if (error) {
        toast.error('Import failed')
        onError?.(error)
      }
    },
    [parseFile, maxFileSize, onFileParsed, onError, error]
  )

  /**
   * Handle file drop
   */
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
        const errorMsg = 'Please drop a PowerPoint (.pptx) file'
        toast.error(errorMsg)
        onError?.(errorMsg)
      }
    },
    [handleFile, onError]
  )

  /**
   * Handle file input change
   */
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) {
        handleFile(file)
      }
    },
    [handleFile]
  )

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  /**
   * Handle retry
   */
  const handleRetry = useCallback(() => {
    reset()
  }, [reset])

  // Loading state
  if (isLoading) {
    return (
      <Card className="gba:p-8 gba:text-center" data-testid={testId}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <Spinner size="lg" />
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Importing PowerPoint</h3>
            <p className="gba:text-muted-foreground gba:text-sm">Parsing slides and extracting content...</p>
            <div className="gba:mt-4 gba:w-64 gba:h-2 gba:bg-muted gba:rounded-full gba:overflow-hidden">
              <div
                className="gba:h-full gba:bg-primary gba:transition-all gba:duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{progress}%</p>
          </div>
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className="gba:p-8 gba:text-center" data-testid={testId}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-destructive/10 gba:flex gba:items-center gba:justify-center">
            <AlertCircle className="gba:w-8 gba:h-8 gba:text-destructive" />
          </div>
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:text-destructive gba:mb-2">Import Failed</h3>
            <p className="gba:text-muted-foreground gba:text-sm">{error}</p>
          </div>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" size="sm" onClick={handleRetry}>
              Try Again
            </Button>
            {onCancel && (
              <Button variant="ghost" size="sm" onClick={onCancel}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Success state
  if (parsedDocument) {
    return (
      <Card className="gba:p-8 gba:text-center" data-testid={testId}>
        <div className="gba:flex gba:flex-col gba:items-center gba:gap-4">
          <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-success/10 gba:flex gba:items-center gba:justify-center">
            <CheckCircle className="gba:w-8 gba:h-8 gba:text-success" />
          </div>
          <div>
            <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Import Successful</h3>
            <p className="gba:text-muted-foreground gba:text-sm">
              Imported {parsedDocument.slideCount} {parsedDocument.slideCount === 1 ? 'slide' : 'slides'}
            </p>
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {parsedDocument.fileName} ({formatFileSize(parsedDocument.fileSize)})
            </p>
          </div>
          {parsedDocument.messages.length > 0 && (
            <div className="gba:w-full gba:text-left gba:p-4 gba:bg-warning/10 gba:rounded-lg gba:text-sm">
              <p className="gba:font-medium gba:mb-2">Import Notes:</p>
              <ul className="gba:space-y-1">
                {parsedDocument.messages.map((msg, idx) => (
                  <li key={idx} className="gba:text-xs gba:text-muted-foreground">
                    • {msg.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Card>
    )
  }

  // Upload state
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
          <h3 className="gba:text-lg gba:font-semibold gba:mb-2">Import PowerPoint</h3>
          <p className="gba:text-muted-foreground gba:text-sm gba:mb-1">Drag and drop a .pptx file here</p>
          <p className="gba:text-xs gba:text-muted-foreground">Maximum file size: {formatFileSize(maxFileSize)}</p>
        </div>

        <div className="gba:flex gba:gap-2">
          <Button variant="default" size="sm" onClick={() => document.getElementById(`${testId}-file-input`)?.click()}>
            <Upload className="gba:w-4 gba:h-4 gba:mr-2" />
            Choose File
          </Button>
          {onCancel && (
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="gba:w-4 gba:h-4 gba:mr-2" />
              Cancel
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

        <div className="gba:text-xs gba:text-muted-foreground gba:border-t gba:pt-4 gba:w-full">
          <p className="gba:mb-1">Supported features:</p>
          <ul className="gba:space-y-0.5 gba:text-left">
            <li>• Text boxes and formatting</li>
            <li>• Images and shapes</li>
            <li>• Slide layouts</li>
            <li>• Basic transitions (partial)</li>
          </ul>
        </div>
      </div>
    </Card>
  )
}

export default PowerPointUploader
