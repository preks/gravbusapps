import React, { useState, useRef, useCallback } from 'react'
import { FileText, Upload as UploadIcon, X, AlertCircle } from 'lucide-react'
import { Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { QuickTaskUploadFile } from './types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatFileSize } from '@/common/utils/fileUtils'

export interface QuickTaskFileUploadProps {
  value: QuickTaskUploadFile[]
  onChange: (files: QuickTaskUploadFile[]) => void
  disabled?: boolean
  maxFiles?: number
  maxFileSize?: number // in MB
  allowedFileTypes?: string[]
  error?: string
}

const DEFAULT_MAX_FILES = 5
const DEFAULT_MAX_FILE_SIZE = 10 // MB
const DEFAULT_ALLOWED_TYPES = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip']

export const QuickTaskFileUpload: React.FC<QuickTaskFileUploadProps> = ({
  value = [],
  onChange,
  disabled = false,
  maxFiles = DEFAULT_MAX_FILES,
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  allowedFileTypes = DEFAULT_ALLOWED_TYPES,
  error
}) => {
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        return getTranslationFromI18nKeyAndLabel(
          'quickTask.upload.error.fileSize',
          `File size must be less than ${maxFileSize}MB`,
          { maxSize: maxFileSize }
        )
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedFileTypes.includes(fileExtension)) {
        return getTranslationFromI18nKeyAndLabel(
          'quickTask.upload.error.fileType',
          `File type ${fileExtension} is not allowed`,
          { fileType: fileExtension }
        )
      }

      return null
    },
    [maxFileSize, allowedFileTypes]
  )

  const handleFilesAdded = useCallback(
    (newFiles: File[]) => {
      if (disabled) return

      // Check max files limit
      const remainingSlots = maxFiles - value.length
      const filesToAdd = newFiles.slice(0, remainingSlots)

      const uploadFiles: QuickTaskUploadFile[] = filesToAdd.map((file, index) => {
        const validationError = validateFile(file)

        return {
          uid: `${Date.now()}-${index}`,
          name: file.name,
          size: file.size,
          status: validationError ? ('error' as const) : ('done' as const),
          originFileObj: file,
          errorMessage: validationError || undefined
        }
      })

      const updatedFiles = [...value, ...uploadFiles]
      onChange(updatedFiles)
    },
    [disabled, maxFiles, value, validateFile, onChange]
  )

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = Array.from(event.target.files || [])
      handleFilesAdded(selectedFiles)

      // Clear input
      if (event.target) {
        event.target.value = ''
      }
    },
    [handleFilesAdded]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLElement>) => {
      event.preventDefault()
      setDragActive(false)

      if (disabled) return

      const droppedFiles = Array.from(event.dataTransfer.files)
      handleFilesAdded(droppedFiles)
    },
    [disabled, handleFilesAdded]
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLElement>) => {
    event.preventDefault()
    setDragActive(false)
  }, [])

  const removeFile = useCallback(
    (uid: string) => {
      if (disabled) return

      const updatedFiles = value.filter(file => file.uid !== uid)
      onChange(updatedFiles)
    },
    [value, onChange, disabled]
  )

  const openFilePicker = useCallback(() => {
    if (disabled) return
    fileInputRef.current?.click()
  }, [disabled])

  const canAddMoreFiles = value.length < maxFiles

  // Determine border color based on state
  const getBorderColor = () => {
    if (dragActive) return 'gba:border-blue-500 gba:bg-blue-50'
    if (error) return 'gba:border-red-300'
    return 'gba:border-gray-300'
  }

  // Determine file item styling based on upload status
  const getFileItemStyle = (status: 'uploading' | 'done' | 'error') => {
    if (status === 'error') return 'gba:border-red-300 gba:bg-red-50'
    if (status === 'uploading') return 'gba:border-blue-300 gba:bg-blue-50'
    return 'gba:border-gray-200 gba:bg-gray-50'
  }

  return (
    <div className="gba:space-y-3">
      {/* Upload Area */}
      <button
        type="button"
        disabled={disabled || !canAddMoreFiles}
        className={`gba:border-2 gba:border-dashed gba:rounded-lg gba:p-4 gba:text-center gba:transition-colors gba:w-full ${
          disabled
            ? 'gba:opacity-50 gba:cursor-not-allowed gba:bg-gray-50'
            : 'gba:cursor-pointer hover:gba:border-blue-400'
        } ${getBorderColor()}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={canAddMoreFiles ? openFilePicker : undefined}
        aria-label={getTranslationFromI18nKeyAndLabel('quickTask.upload.ariaLabel', 'Upload files')}
      >
        <div className="gba:flex gba:justify-center gba:mb-2">
          <UploadIcon className="gba:w-8 gba:h-8 gba:text-gray-400" />
        </div>

        {canAddMoreFiles ? (
          <>
            <p className="gba:mb-2 gba:font-medium gba:text-gray-700">
              {getTranslationFromI18nKeyAndLabel('quickTask.upload.dropText', 'Drop files here or click to browse')}
            </p>
            <p className="gba:text-sm gba:text-gray-500">
              {getTranslationFromI18nKeyAndLabel(
                'quickTask.upload.hint',
                `Supports: ${allowedFileTypes.join(', ')}. Max ${maxFiles} files, ${maxFileSize}MB each.`,
                { types: allowedFileTypes.join(', '), maxFiles, maxSize: maxFileSize }
              )}
            </p>
          </>
        ) : (
          <p className="gba:text-sm gba:text-gray-500">
            {getTranslationFromI18nKeyAndLabel('quickTask.upload.maxFiles', `Maximum ${maxFiles} files reached`, {
              maxFiles
            })}
          </p>
        )}
      </button>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileSelect}
        accept={allowedFileTypes.join(',')}
        multiple={maxFiles > 1}
        className="gba:hidden"
        disabled={disabled}
      />

      {/* File List */}
      {value.length > 0 && (
        <div className="gba:space-y-2">
          <p className="gba:text-sm gba:font-medium gba:text-gray-700">
            {getTranslationFromI18nKeyAndLabel('quickTask.upload.selectedFiles', `Selected Files (${value.length})`, {
              count: value.length
            })}
          </p>
          {value.map(file => (
            <div
              key={file.uid}
              className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-md gba:border ${getFileItemStyle(
                file.status
              )}`}
            >
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <FileText
                  className={`gba:w-5 gba:h-5 ${file.status === 'error' ? 'gba:text-red-500' : 'gba:text-blue-500'}`}
                />
                <div className="gba:flex-1">
                  <p className="gba:text-sm gba:font-medium gba:text-gray-900">{file.name}</p>
                  {file.size && <p className="gba:text-xs gba:text-gray-500">{formatFileSize(file.size)}</p>}
                  {file.errorMessage && <p className="gba:text-xs gba:text-red-600 gba:mt-1">{file.errorMessage}</p>}
                </div>
                {file.status === 'uploading' && (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:animate-spin gba:rounded-full gba:h-4 gba:w-4 gba:border-b-2 gba:border-blue-600"></div>
                    <span className="gba:text-xs gba:text-blue-600">
                      {getTranslationFromI18nKeyAndLabel('quickTask.upload.uploading', 'Uploading...')}
                    </span>
                  </div>
                )}
              </div>
              {!disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(file.uid)}
                  className="gba:h-8 gba:w-8 gba:p-0"
                >
                  <X className="gba:h-4 gba:w-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <Alert className="gba:border-red-200 gba:bg-red-50">
          <AlertCircle className="gba:h-4 gba:w-4 gba:text-red-600" />
          <AlertDescription className="gba:text-red-800">{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
