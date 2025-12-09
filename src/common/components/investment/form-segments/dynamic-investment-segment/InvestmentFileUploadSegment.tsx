import React, { useCallback, useState } from 'react'
import { AiButton, Button, FormLabel, Spinner } from '@newwork/nw-design-system'
import { File, X, Upload } from 'lucide-react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

const prefixDataTestId = 'InvestmentForm-FileUpload'

export interface InvestmentFileUploadSegmentProps {
  file: File | null
  onFileChange: (file: File | null) => void
  isLoading?: boolean
  label?: string
  description?: string
}

const InvestmentFileUploadSegment: React.FC<InvestmentFileUploadSegmentProps> = ({
  file,
  onFileChange,
  isLoading = false,
  label,
  description
}) => {
  const [dragActive, setDragActive] = useState(false)

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = event.target.files?.[0] || null
      onFileChange(selectedFile)
    },
    [onFileChange]
  )

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return
      const selectedFile = files[0]
      onFileChange(selectedFile)
    },
    [onFileChange]
  )

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      setDragActive(false)
      if (isLoading) return
      handleFiles(event.dataTransfer.files)
    },
    [isLoading, handleFiles]
  )

  const handleDragOver = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault()
      event.stopPropagation()
      if (!isLoading) {
        setDragActive(true)
      }
    },
    [isLoading]
  )

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    setDragActive(false)
  }, [])

  const handleClearFile = useCallback(() => {
    if (isLoading) return
    onFileChange(null)
    const input = document.getElementById('investment-ai-file-input') as HTMLInputElement | null
    if (input) {
      input.value = ''
    }
  }, [isLoading, onFileChange])

  const effectiveLabel = label || 'AI Source Document'
  const effectiveDescription =
    description || 'Upload a document that AI can use to pre-fill investment details. This is optional.'

  return (
    <div className="gba:space-y-2 gba:w-full gba:max-w-full" data-testid={prefixDataTestId}>
      <div className="gba:flex gba:flex-col gba:gap-1">
        <FormLabel>{effectiveLabel}</FormLabel>
        <p className="gba:m-0 gba:text-xs gba:text-muted-foreground">{effectiveDescription}</p>
      </div>

      {/* Hidden native file input */}
      <input
        id="investment-ai-file-input"
        type="file"
        className="gba:hidden"
        onChange={handleFileChange}
        disabled={isLoading}
        data-testid={formatDataTestId(prefixDataTestId, 'Input')}
      />

      {/* Drag and drop area */}
      <div
        role="button"
        tabIndex={0}
        aria-label="File upload drop zone. Click or drag and drop files here."
        className={`gba:relative gba:w-full gba:max-w-full gba:overflow-hidden gba:border-2 gba:border-dashed gba:rounded-lg gba:transition-colors gba:box-border ${
          dragActive
            ? 'gba:border-primary gba:bg-primary/5'
            : 'gba:border-muted-foreground/25 gba:hover:border-muted-foreground/50'
        } ${isLoading ? 'gba:opacity-50 gba:cursor-not-allowed' : 'gba:cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !isLoading && !file && document.getElementById('investment-ai-file-input')?.click()}
        onKeyDown={e => {
          if ((e.key === 'Enter' || e.key === ' ') && !isLoading && !file) {
            e.preventDefault()
            document.getElementById('investment-ai-file-input')?.click()
          }
        }}
        data-testid={formatDataTestId(prefixDataTestId, 'DropZone')}
      >
        {/* Loading overlay */}
        {isLoading && (
          <div className="gba:absolute gba:inset-0 gba:flex gba:items-center gba:justify-center gba:bg-background/80 gba:rounded-lg gba:z-10">
            <div className="gba:flex gba:flex-col gba:items-center gba:gap-2">
              <Spinner className="gba:h-6 gba:w-6" />
              <span className="gba:text-sm gba:text-muted-foreground">Processing document...</span>
            </div>
          </div>
        )}

        {/* Content */}
        {file ? (
          <div className="gba:p-4 gba:flex gba:items-center gba:gap-3 gba:w-full gba:min-w-0 gba:box-border">
            <File className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:flex-shrink-0" />
            <div className="gba:flex gba:flex-col gba:flex-1 gba:min-w-0 gba:overflow-hidden">
              <span className="gba:text-sm gba:font-medium gba:truncate gba:block" title={file.name}>
                {file.name}
              </span>
              <span className="gba:text-xs gba:text-muted-foreground gba:truncate gba:block">
                {(file.size / 1024).toFixed(1)} KB
              </span>
            </div>
            {!isLoading && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gba:flex-shrink-0"
                onClick={e => {
                  e.stopPropagation()
                  handleClearFile()
                }}
                data-testid={formatDataTestId(prefixDataTestId, 'ClearButton')}
              >
                <X className="gba:h-4 gba:w-4 gba:mr-1" />
                Remove
              </Button>
            )}
          </div>
        ) : (
          <div className="gba:p-8 gba:flex gba:flex-col gba:items-center gba:justify-center gba:gap-4 gba:min-h-[120px]">
            <AiButton
              variant="default"
              showIcon={true}
              icon={<Upload size={16} />}
              iconPosition="before"
              onClick={e => {
                e.stopPropagation()
                document.getElementById('investment-ai-file-input')?.click()
              }}
              disabled={isLoading}
              data-testid={formatDataTestId(prefixDataTestId, 'SelectButton')}
            >
              Upload File
            </AiButton>
            <p className="gba:text-xs gba:text-muted-foreground gba:text-center gba:max-w-full gba:px-4">
              Drag and drop a file here, or click to browse
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default InvestmentFileUploadSegment
