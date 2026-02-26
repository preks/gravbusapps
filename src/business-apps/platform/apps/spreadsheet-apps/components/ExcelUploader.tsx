/**
 * ExcelUploader Component
 *
 * A beautiful drag-and-drop file uploader for Excel files with
 * instant preview of sheet structure and data.
 */

import React, { useState, useCallback, useRef } from 'react'
import { useTranslation, Card, Button, Badge, Spinner, Progress } from '@newwork/nw-design-system'
import { FileSpreadsheet, Upload, X, Check, Table2, AlertCircle, Sparkles, ArrowRight, FileUp } from 'lucide-react'
import { useExcelParser } from '../hooks/useExcelParser'
import type { ParsedExcelFile, ParsedSheet } from '../types'
import translations from '../_i18n'

export interface ExcelUploaderProps {
  onFileParsed: (parsedFile: ParsedExcelFile) => void
  onError?: (error: string) => void
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
 * ExcelUploader Component
 */
export const ExcelUploader: React.FC<ExcelUploaderProps> = ({
  onFileParsed,
  onError,
  maxFileSize = 10,
  'data-testid': testId = 'excel-uploader'
}) => {
  const { t } = useTranslation(translations)
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { isLoading, error, parsedFile, progress, parseFile, reset } = useExcelParser()

  /**
   * Handle file selection
   */
  const handleFileSelect = useCallback(
    async (file: File) => {
      // Validate file size
      const maxBytes = maxFileSize * 1024 * 1024
      if (file.size > maxBytes) {
        const errorMsg = t('upload-error-file-size', { max: maxFileSize })
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
    [maxFileSize, parseFile, onFileParsed, onError, error, t]
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

  // Render upload state
  if (isLoading) {
    return (
      <Card className="gba:p-8" data-testid={`${testId}-loading`}>
        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:space-y-6">
          <div className="gba:relative">
            <div className="gba:w-20 gba:h-20 gba:rounded-full gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <FileSpreadsheet className="gba:w-10 gba:h-10 gba:text-primary" />
            </div>
            <div className="gba:absolute gba:-bottom-1 gba:-right-1 gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary gba:flex gba:items-center gba:justify-center">
              <Spinner size="sm" className="gba:text-primary-foreground" />
            </div>
          </div>

          <div className="gba:text-center gba:space-y-2">
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('upload-analyzing-title')}</h3>
            <p className="gba:text-sm gba:text-muted-foreground">{selectedFile?.name}</p>
          </div>

          <div className="gba:w-full gba:max-w-xs">
            <Progress value={progress} className="gba:h-2" />
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:mt-2">
              {t('upload-progress-complete', { progress })}
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // Render success state with preview
  if (parsedFile) {
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
                <h3 className="gba:font-semibold gba:text-foreground">{parsedFile.fileName}</h3>
                <p className="gba:text-sm gba:text-muted-foreground">
                  {t('upload-sheet-label', {
                    size: formatFileSize(parsedFile.fileSize),
                    count: parsedFile.sheets.length,
                    plural: parsedFile.sheets.length !== 1 ? 's' : ''
                  })}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear} data-testid={`${testId}-clear`}>
              <X className="gba:w-4 gba:h-4" />
            </Button>
          </div>
        </div>

        {/* Sheets preview */}
        <div className="gba:p-6 gba:space-y-4">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
            <Table2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <span className="gba:text-sm gba:font-medium gba:text-foreground">{t('upload-detected-sheets')}</span>
          </div>

          <div className="gba:grid gba:gap-3">
            {parsedFile.sheets.map((sheet, index) => (
              <SheetPreviewCard key={index} sheet={sheet} testId={testId} />
            ))}
          </div>

          {/* AI hint */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:p-4 gba:bg-primary/5 gba:rounded-lg gba:mt-6">
            <Sparkles className="gba:w-5 gba:h-5 gba:text-primary" />
            <p className="gba:text-sm gba:text-foreground">{t('upload-ai-hint')}</p>
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
            <h3 className="gba:text-lg gba:font-semibold gba:text-foreground">{t('upload-parse-failed-title')}</h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-md">{error}</p>
          </div>
          <Button variant="outline" onClick={handleClear}>
            {t('upload-try-again')}
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
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          onChange={handleInputChange}
          className="gba:hidden"
          data-testid={`${testId}-input`}
        />

        <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:space-y-6">
          {/* Icon */}
          <div className={`gba:relative gba:transition-transform ${isDragging ? 'gba:scale-110' : ''}`}>
            <div className="gba:w-20 gba:h-20 gba:rounded-2xl gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
              <FileSpreadsheet className="gba:w-10 gba:h-10 gba:text-primary" />
            </div>
            <div className="gba:absolute gba:-bottom-2 gba:-right-2 gba:w-8 gba:h-8 gba:rounded-full gba:bg-primary gba:flex gba:items-center gba:justify-center gba:shadow-lg">
              <Upload className="gba:w-4 gba:h-4 gba:text-primary-foreground" />
            </div>
          </div>

          {/* Text */}
          <div className="gba:text-center gba:space-y-2">
            <h3 className="gba:text-xl gba:font-semibold gba:text-foreground">
              {isDragging ? t('upload-drop-here') : t('upload-file-title')}
            </h3>
            <p className="gba:text-sm gba:text-muted-foreground gba:max-w-sm">
              {t('upload-file-description', { max: maxFileSize })}
            </p>
          </div>

          {/* Button */}
          <Button variant="outline" className="gba:pointer-events-none">
            <FileUp className="gba:w-4 gba:h-4 gba:mr-2" />
            {t('upload-browse-files')}
          </Button>

          {/* Supported formats */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap gba:justify-center">
            <Badge variant="secondary" className="gba:text-xs">
              .xlsx
            </Badge>
            <Badge variant="secondary" className="gba:text-xs">
              .csv
            </Badge>
          </div>
        </div>
      </div>

      {/* AI teaser */}
      <div className="gba:px-6 gba:py-4 gba:bg-muted/30 gba:border-t">
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:w-8 gba:h-8 gba:rounded-lg gba:bg-primary/10 gba:flex gba:items-center gba:justify-center">
            <Sparkles className="gba:w-4 gba:h-4 gba:text-primary" />
          </div>
          <div className="gba:flex-1">
            <p className="gba:text-sm gba:font-medium gba:text-foreground">{t('upload-ai-powered-title')}</p>
            <p className="gba:text-xs gba:text-muted-foreground">{t('upload-ai-powered-description')}</p>
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * Sheet preview card component
 */
interface SheetPreviewCardProps {
  sheet: ParsedSheet
  testId: string
}

const SheetPreviewCard: React.FC<SheetPreviewCardProps> = ({ sheet, testId }) => {
  const { t } = useTranslation(translations)
  const [isExpanded, setIsExpanded] = useState(false)

  if (sheet.isEmpty) {
    return (
      <div
        className="gba:p-4 gba:rounded-lg gba:border gba:border-border gba:bg-muted/20"
        data-testid={`${testId}-sheet-${sheet.index}`}
      >
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Table2 className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            <span className="gba:font-medium gba:text-foreground">{sheet.name}</span>
          </div>
          <Badge variant="secondary" className="gba:text-xs">
            {t('upload-empty')}
          </Badge>
        </div>
      </div>
    )
  }

  return (
    <div
      className="gba:rounded-lg gba:border gba:border-border gba:overflow-hidden"
      data-testid={`${testId}-sheet-${sheet.index}`}
    >
      {/* Sheet header */}
      <button
        className="gba:w-full gba:p-4 gba:flex gba:items-center gba:justify-between gba:hover:bg-muted/50 gba:transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
        type="button"
      >
        <div className="gba:flex gba:items-center gba:gap-3">
          <Table2 className="gba:w-4 gba:h-4 gba:text-primary" />
          <span className="gba:font-medium gba:text-foreground">{sheet.name}</span>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant="outline" className="gba:text-xs">
            {t('upload-columns', { count: sheet.columns.length })}
          </Badge>
          <Badge variant="outline" className="gba:text-xs">
            {t('upload-rows', { count: sheet.rowCount })}
          </Badge>
        </div>
      </button>

      {/* Expanded column preview */}
      {isExpanded && (
        <div className="gba:px-4 gba:pb-4 gba:pt-0">
          <div className="gba:bg-muted/30 gba:rounded-lg gba:p-3">
            <p className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:mb-2">
              {t('upload-column-list-title')}
            </p>
            <div className="gba:flex gba:flex-wrap gba:gap-1">
              {sheet.columns.map((col, idx) => (
                <Badge key={idx} variant="secondary" className="gba:text-xs gba:font-normal">
                  {col.name}
                  {col.hasFormula && <span className="gba:ml-1 gba:text-primary">ƒ</span>}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
