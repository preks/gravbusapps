import React, { useState, useRef, useCallback } from 'react'
import { FileText, Upload as UploadIcon, X, AlertCircle } from 'lucide-react'
import { Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { BlinkUploadFile } from '../hooks/useBlinkFileUpload'

export interface BlinkFileUploadProps {
  value: BlinkUploadFile[]
  onChange: (files: BlinkUploadFile[]) => void
  disabled?: boolean
  maxFiles?: number
  maxFileSize?: number // in MB
  allowedFileTypes?: string[]
  error?: string
}

const DEFAULT_MAX_FILES = 5
const DEFAULT_MAX_FILE_SIZE = 10 // MB
const DEFAULT_ALLOWED_TYPES = ['.pdf', '.doc', '.docx', '.txt', '.xls', '.xlsx', '.jpg', '.jpeg', '.png', '.zip']

export const BlinkFileUpload: React.FC<BlinkFileUploadProps> = ({
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
        return `File size must be less than ${maxFileSize}MB`
      }

      // Check file type
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
      if (!allowedFileTypes.includes(fileExtension)) {
        return `File type ${fileExtension} is not allowed`
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

      const uploadFiles: BlinkUploadFile[] = filesToAdd.map((file, index) => {
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
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      setDragActive(false)

      if (disabled) return

      const droppedFiles = Array.from(event.dataTransfer.files)
      handleFilesAdded(droppedFiles)
    },
    [disabled, handleFilesAdded]
  )

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setDragActive(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
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
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  return (
    <div className="gba:space-y-3">
      {/* Upload Area */}
      <div
        className={`gba:border-2 gba:border-dashed gba:rounded-lg gba:p-6 gba:text-center gba:transition-colors ${
          disabled
            ? 'gba:opacity-50 gba:cursor-not-allowed gba:bg-gray-50'
            : 'gba:cursor-pointer hover:gba:border-blue-400'
        } ${dragActive ? 'gba:border-blue-500 gba:bg-blue-50' : error ? 'gba:border-red-300' : 'gba:border-gray-300'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={canAddMoreFiles ? openFilePicker : undefined}
      >
        <div className="gba:flex gba:justify-center gba:mb-3">
          <UploadIcon className="gba:w-10 gba:h-10 gba:text-gray-400" />
        </div>

        {canAddMoreFiles ? (
          <>
            <p className="gba:mb-2 gba:font-medium gba:text-gray-700">Drop files here or click to browse</p>
            <p className="gba:text-sm gba:text-gray-500">
              Supports: {allowedFileTypes.join(', ')}. Max {maxFiles} files, {maxFileSize}MB each.
            </p>
          </>
        ) : (
          <p className="gba:text-sm gba:text-gray-500">Maximum {maxFiles} files reached</p>
        )}
      </div>

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
          <p className="gba:text-sm gba:font-medium gba:text-gray-700">Selected Files ({value.length})</p>
          {value.map(file => (
            <div
              key={file.uid}
              className={`gba:flex gba:items-center gba:justify-between gba:p-3 gba:rounded-md gba:border ${
                file.status === 'error'
                  ? 'gba:border-red-300 gba:bg-red-50'
                  : file.status === 'uploading'
                    ? 'gba:border-blue-300 gba:bg-blue-50'
                    : 'gba:border-gray-200 gba:bg-gray-50'
              }`}
            >
              <div className="gba:flex gba:items-center gba:gap-3 gba:flex-1">
                <FileText
                  className={`gba:w-5 gba:h-5 ${file.status === 'error' ? 'gba:text-red-500' : 'gba:text-blue-500'}`}
                />
                <div className="gba:flex-1">
                  <p className="gba:text-sm gba:font-medium gba:text-gray-900">{file.name}</p>
                  <p className="gba:text-xs gba:text-gray-500">{formatFileSize(file.size)}</p>
                  {file.errorMessage && <p className="gba:text-xs gba:text-red-600 gba:mt-1">{file.errorMessage}</p>}
                </div>
                {file.status === 'uploading' && (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <div className="gba:animate-spin gba:rounded-full gba:h-4 gba:w-4 gba:border-b-2 gba:border-blue-600"></div>
                    <span className="gba:text-xs gba:text-blue-600">Uploading...</span>
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
