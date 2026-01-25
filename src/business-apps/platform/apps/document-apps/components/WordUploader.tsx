/**
 * WordUploader Component
 *
 * A drag-and-drop file uploader for Word documents with
 * instant parsing preview using mammoth.js.
 */

import React, { useState, useCallback, useRef } from 'react'
import { Card, Button, Badge, Spinner, Progress } from '@newwork/nw-design-system'
import { FileText, Upload, X, Check, AlertCircle, FileUp, ArrowRight } from 'lucide-react'
import { useWordParser } from '../hooks/useWordParser'
import type { ParsedWordDocument } from '../types'

export interface WordUploaderProps {
  onFileParsed: (parsedDocument: ParsedWordDocument) => void
  onError?: (error: string) => void
  maxFileSize?: number // in MB, default 25MB
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
 * WordUploader Component
 */
export const WordUploader: React.FC<WordUploaderProps> = ({
  onFileParsed,
  onError,
  maxFileSize = 25,
  'data-testid': testId = 'word-uploader'
}) => {
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isLoading, error, parsedDocument, progress, parseFile, reset } = useWordParser()

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file size
      const maxBytes = maxFileSize * 1024 * 1024
      if (file.size > maxBytes) {
        const errorMsg = `File size exceeds ${maxFileSize}MB limit`
        onError?.(errorMsg)
        return
      }

      setSelectedFile(file)

      const result = await parseFile(file)
      if (result) {
        onFileParsed(result)
      } else if (error) {
        onError?.(error)
      }
    },
    [maxFileSize, parseFile, onFileParsed, onError, error]
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
    reset()
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [reset])

  // Render loading state
  if (isLoading) {
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
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Processing your document...</h3>
            <p className="gba:text-sm gba:text-muted-foreground">{selectedFile?.name}</p>
          </div>

          <div className="gba:w-full gba:max-w-xs">
            <Progress value={progress} className="gba:h-2" />
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:mt-2">{progress}% complete</p>
          </div>
        </div>
      </Card>
    )
  }

  // Render success state with preview
  if (parsedDocument) {
    const wordCount = parsedDocument.plainText.split(/\s+/).filter(w => w.length > 0).length

    return (
      <Card className="gba:overflow-hidden" data-testid={`${testId}-preview`}>
        {/* Success header */}
        <div className="gba:bg-success/10 gba:px-6 gba:py-4 gba:border-b gba:border-success/20">
          <div className="gba:flex gba:items-center gba:justify-between">
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-success/20 gba:flex gba:items-center gba:justify-center">
                <Check className="gba:w-5 gba:h-5 gba:text-success" />
              </div>
              <div>
                <h3 className="gba:font-semibold gba:text-foreground">{parsedDocument.fileName}</h3>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {formatFileSize(parsedDocument.fileSize)} - {wordCount.toLocaleString()} words
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} data-testid={`${testId}-clear`}>
              <X className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </div>

        {/* Preview */}
        <div className="gba:p-6 gba:space-y-4">
          {/* Parser messages */}
          {parsedDocument.messages.length > 0 && (
            <div className="gba:space-y-2">
              {parsedDocument.messages.slice(0, 3).map((msg, idx) => (
                <div
                  key={idx}
                  className={`gba:flex gba:items-start gba:gap-2 gba:text-sm gba:p-2 gba:rounded ${
                    msg.type === 'error'
                      ? 'gba:bg-destructive/10 gba:text-destructive'
                      : msg.type === 'warning'
                        ? 'gba:bg-warning/10 gba:text-warning-foreground'
                        : 'gba:bg-muted gba:text-muted-foreground'
                  }`}
                >
                  <AlertCircle className="gba:w-4 gba:h-4 gba:flex-shrink-0 gba:mt-0.5" />
                  <span>{msg.message}</span>
                </div>
              ))}
            </div>
          )}

          {/* Content preview */}
          <div className="gba:bg-muted/30 gba:rounded-lg gba:p-4">
            <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">Preview</p>
            <div
              className="gba:text-sm gba:text-foreground gba:line-clamp-4 gba:prose gba:prose-sm gba:max-w-none"
              dangerouslySetInnerHTML={{
                __html: parsedDocument.html.substring(0, 500) + (parsedDocument.html.length > 500 ? '...' : '')
              }}
            />
          </div>

          {/* Images found */}
          {parsedDocument.images && parsedDocument.images.length > 0 && (
            <div className="gba:flex gba:items-center gba:gap-2">
              <Badge variant="secondary">{parsedDocument.images.length} images found</Badge>
            </div>
          )}

          {/* Continue hint */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:bg-primary/5 gba:rounded-lg gba:mt-4">
            <FileText className="gba:w-5 gba:h-5 gba:text-primary" />
            <p className="gba:text-sm gba:text-foreground">Document parsed successfully. Ready to edit!</p>
            <ArrowRight className="gba:w-4 gba:h-4 gba:text-primary gba:ml-auto" />
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
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">Failed to parse document</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">{error}</p>
          </div>
          <Button variant="outline" onClick={handleClear}>
            Try Again
          </Button>
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
          accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
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
              {isDragging ? 'Drop your file here' : 'Upload your Word document'}
            </h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-sm">
              Drag and drop your Word document here, or click to browse. We support .docx files (Word 2007+) up to{' '}
              {maxFileSize}MB.
            </p>
          </div>

          {/* Button */}
          <Button variant="outline" className="gba:pointer-events-none">
            <FileUp className="gba:w-4 gba:h-4 gba:mr-2" />
            Browse Files
          </Button>

          {/* Supported formats */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap gba:justify-center">
            <Badge variant="secondary" className="gba:text-xs">
              .docx (Word 2007+)
            </Badge>
          </div>
        </div>
      </div>

      {/* Feature teaser */}
      <div className="gba:px-6 gba:py-4 gba:bg-muted/30 gba:border-t">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <Check className="gba:w-4 gba:h-4 gba:text-primary" />
          </div>
          <div className="gba:flex-1">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">Formatting Preserved</p>
            <p className="gba:text-xs gba:text-muted-foreground">
              We'll keep your headers, lists, tables, and images intact
            </p>
          </div>
        </div>
      </div>
    </Card>
  )
}

export default WordUploader
