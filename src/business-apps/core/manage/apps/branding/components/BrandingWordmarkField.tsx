import React, { useCallback, useRef, useState } from 'react'
import { Button, Spinner } from '@newwork/nw-design-system'
import { UploadSimpleIcon } from '@phosphor-icons/react'

interface BrandingWordmarkFieldProps {
  accept: string
  buttonLabel: string
  disabled?: boolean
  isLoading?: boolean
  onFileSelect: (file: File) => void
  previewAlt: string
  previewUrl: string
}

export const BrandingWordmarkField: React.FC<BrandingWordmarkFieldProps> = ({
  accept,
  buttonLabel,
  disabled = false,
  isLoading = false,
  onFileSelect,
  previewAlt,
  previewUrl
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragging, setIsDragging] = useState(false)

  const openFileDialog = useCallback(() => {
    if (disabled) return
    fileInputRef.current?.click()
  }, [disabled])

  const handleFileSelection = useCallback(
    (fileList: FileList | null) => {
      const selectedFile = fileList?.[0]
      if (!selectedFile) return
      onFileSelect(selectedFile)
    },
    [onFileSelect]
  )

  return (
    <div className="gba:space-y-3">
      <div
        className={[
          'gba:rounded-xl gba:border-2 gba:border-dashed gba:bg-muted/20 gba:p-5 gba:space-y-5 gba:transition-colors',
          isDragging ? 'gba:border-primary gba:bg-primary/5' : 'gba:border-border',
          disabled ? 'gba:opacity-60' : 'gba:cursor-pointer'
        ].join(' ')}
        onClick={openFileDialog}
        onDragOver={event => {
          event.preventDefault()
          if (disabled) return
          setIsDragging(true)
        }}
        onDragLeave={event => {
          event.preventDefault()
          setIsDragging(false)
        }}
        onDrop={event => {
          event.preventDefault()
          setIsDragging(false)
          if (disabled) return
          handleFileSelection(event.dataTransfer.files)
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          className="gba:hidden"
          disabled={disabled}
          onChange={event => {
            handleFileSelection(event.target.files)
            event.currentTarget.value = ''
          }}
        />

        <div className="gba:min-h-40 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:flex gba:items-center gba:justify-center gba:p-6">
          {isLoading ? (
            <Spinner size="lg" />
          ) : (
            <img src={previewUrl} alt={previewAlt} className="gba:max-h-20 gba:w-full gba:object-contain" />
          )}
        </div>

        <div className="gba:flex gba:justify-center">
          <Button
            type="button"
            variant="secondary"
            onClick={event => {
              event.stopPropagation()
              openFileDialog()
            }}
            disabled={disabled}
          >
            <UploadSimpleIcon className="gba:h-4 gba:w-4 gba:mr-2" />
            {buttonLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
