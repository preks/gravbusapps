/**
 * PdfUploader Component
 *
 * A drag-and-drop file uploader for PDF documents.
 * Uploads the PDF to the backend which stores it in the file service
 * and extracts text for indexing.
 */

import React, { useState, useCallback, useRef } from 'react'
import { Card, Button, Badge, Spinner, Progress, useTranslation } from '@newwork/nw-design-system'
import { FileText, Upload, X, Check, AlertCircle, FileUp } from 'lucide-react'
import type { Document } from '../types'
import { DocumentApiService } from '../services/DocumentApiService'
import translations from '../_i18n'

export interface PdfUploaderProps {
  accessToken: string
  onUploadComplete: (document: Document) => void
  onError?: (error: string) => void
  onCancel?: () => void
  maxFileSize?: number // in MB, default 10MB
  'data-testid'?: string
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * PdfUploader Component
 */
export const PdfUploader: React.FC<PdfUploaderProps> = ({
  accessToken,
  onUploadComplete,
  onError,
  onCancel,
  maxFileSize = 10,
  'data-testid': testId = 'pdf-uploader'
}) => {
  const { t } = useTranslation(translations)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadedDocument, setUploadedDocument] = useState<Document | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Handle file selection and upload
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file type
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
      if (!isPdf) {
        const errorMsg = t('upload-pdf-select-pdf')
        setError(errorMsg)
        onError?.(errorMsg)
        return
      }

      // Validate file size
      const maxBytes = maxFileSize * 1024 * 1024
      if (file.size > maxBytes) {
        const errorMsg = t('upload-word-file-size-exceeds', { max: maxFileSize })
        setError(errorMsg)
        onError?.(errorMsg)
        return
      }

      setSelectedFile(file)
      setError(null)
      setIsUploading(true)
      setUploadProgress(10) // Start progress

      try {
        // Set the access token
        DocumentApiService.setAccessToken(accessToken)

        // Simulate progress during upload
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90))
        }, 200)

        // Upload the PDF
        const document = await DocumentApiService.importPdf(file)

        clearInterval(progressInterval)
        setUploadProgress(100)
        setUploadedDocument(document)
        setIsUploading(false)

        // Notify parent
        onUploadComplete(document)
      } catch (err) {
        setIsUploading(false)
        setUploadProgress(0)
        const errorMsg = err instanceof Error ? err.message : t('upload-pdf-upload-failed')
        setError(errorMsg)
        onError?.(errorMsg)
      }
    },
    [accessToken, maxFileSize, onUploadComplete, onError, t]
  )

  /**
   * Handle drag events
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const files = e.dataTransfer.files
      if (files && files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  /**
   * Handle click to upload
   */
  const handleClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /**
   * Handle file input change
   */
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files
      if (files && files.length > 0) {
        handleFileSelect(files[0])
      }
    },
    [handleFileSelect]
  )

  /**
   * Reset and clear
   */
  const handleClear = useCallback(() => {
    setSelectedFile(null)
    setError(null)
    setIsUploading(false)
    setUploadProgress(0)
    setUploadedDocument(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [])

  // Render loading state
  if (isUploading) {
    return (
      <Card className="gba:p-8" data-testid={`${testId}-loading`}>
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:space-y-6">
          <div className="gba:relative">
            <div className="gba:w-20 gba:h-20 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <FileText className="gba:w-10 gba:h-10 gba:text-primary" />
            </div>
            <div className="gba:absolute gba:-bottom-1 gba:-right-1 gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary gba:flex gba:items-center gba:justify-center">
              <Spinner size="sm" className="gba:text-primary-foreground" />
            </div>
          </div>

          <div className="gba:text-center gba:space-y-2">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('upload-pdf-uploading')}</h3>
            <p className="gba:text-sm gba:text-muted-foreground">{selectedFile?.name}</p>
          </div>

          <div className="gba:w-full gba:max-w-xs">
            <Progress value={uploadProgress} className="gba:h-2" />
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:mt-2">
              {t('upload-pdf-progress', { progress: uploadProgress })}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // Render success state
  if (uploadedDocument) {
    return (
      <Card className="gba:overflow-hidden" data-testid={`${testId}-success`}>
        <div className="gba:bg-success/10 gba:px-6 gba:py-4 gba:border-b gba:border-success/20">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-success/20 gba:flex gba:items-center gba:justify-center">
                <Check className="gba:w-5 gba:h-5 gba:text-success" />
              </div>
              <div>
                <h3 className="gba:font-semibold gba:text-foreground">{uploadedDocument.title}</h3>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {selectedFile && formatFileSize(selectedFile.size)} - {t('upload-pdf-uploaded-indexed')}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} data-testid={`${testId}-clear`}>
              <X className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </div>

        <div className="gba:p-6">
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:bg-primary/5 gba:rounded-lg">
            <FileText className="gba:w-5 gba:h-5 gba:text-primary" />
            <p className="gba:text-sm gba:text-foreground">{t('upload-pdf-success-message')}</p>
          </div>
        </div>
      </Card>
    )
  }

  // Render error state
  if (error) {
    return (
      <Card className="gba:p-8" data-testid={`${testId}-error`}>
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:space-y-4">
          <div className="gba:w-16 gba:h-16 gba:rounded-full gba:bg-destructive/10 gba:flex gba:items-center gba:justify-center">
            <AlertCircle className="gba:w-8 gba:h-8 gba:text-destructive" />
          </div>
          <div className="gba:text-center gba:space-y-2">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('upload-pdf-upload-failed')}</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">{error}</p>
          </div>
          <div className="gba:flex gba:gap-2">
            <Button variant="outline" onClick={handleClear}>
              {t('upload-pdf-try-again')}
            </Button>
            {onCancel && (
              <Button variant="ghost" onClick={onCancel}>
                {t('common-cancel')}
              </Button>
            )}
          </div>
        </div>
      </Card>
    )
  }

  // Render upload dropzone
  return (
    <Card
      className={`gba:relative gba:overflow-hidden gba:transition-all gba:duration-200 ${
        isDragging ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2' : ''
      }`}
      data-testid={testId}
    >
      {/* Gradient accent */}
      <div className="gba:h-1 gba:w-full gba:bg-gradient-to-r gba:from-primary gba:via-primary/80 gba:to-primary/60" />

      <div
        className={`gba:p-10 gba:cursor-pointer gba:transition-colors ${
          isDragging ? 'gba:bg-primary/5' : 'gba:hover:bg-muted/50'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleClick()
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleInputChange}
          className="gba:hidden"
          data-testid={`${testId}-input`}
        />

        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:space-y-6">
          {/* Icon */}
          <div className={`gba:relative gba:transition-transform ${isDragging ? 'gba:scale-110' : ''}`}>
            <div className="gba:w-20 gba:h-20 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <FileText className="gba:w-10 gba:h-10 gba:text-primary" />
            </div>
            <div className="gba:absolute gba:-bottom-2 gba:-right-2 gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary gba:flex gba:items-center gba:justify-center gba:shadow-lg">
              <Upload className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
            </div>
          </div>

          {/* Text */}
          <div className="gba:text-center gba:space-y-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-foreground">
              {isDragging ? t('upload-pdf-drop-here') : t('upload-pdf-title-dropzone')}
            </h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-sm">
              {t('upload-pdf-drag-drop', { max: maxFileSize })}
            </p>
          </div>

          {/* Button */}
          <Button variant="outline" className="gba:pointer-events-none">
            <FileUp className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('upload-pdf-browse')}
          </Button>

          {/* Supported formats */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap gba:justify-center">
            <Badge variant="secondary" className="gba:text-xs">
              {t('upload-pdf-format')}
            </Badge>
          </div>
        </div>
      </div>

      {/* Feature description */}
      <div className="gba:px-6 gba:py-4 gba:bg-muted/30 gba:border-t">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <Check className="gba:w-4 gba:h-4 gba:text-primary" />
          </div>
          <div className="gba:flex-1">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('upload-pdf-searchable')}</p>
            <p className="gba:text-xs gba:text-muted-foreground">{t('upload-pdf-searchable-description')}</p>
          </div>
        </div>
      </div>

      {/* Cancel button */}
      {onCancel && (
        <div className="gba:px-6 gba:pb-4">
          <Button variant="ghost" size="sm" onClick={onCancel} className="gba:w-full">
            {t('common-cancel')}
          </Button>
        </div>
      )}
    </Card>
  )
}

export default PdfUploader
