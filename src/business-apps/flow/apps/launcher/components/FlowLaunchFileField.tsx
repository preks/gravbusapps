import React, { useRef } from 'react'
import { Button, Input } from '@newwork/nw-design-system'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import type { FileInfo } from '@/common/types/FileTypes'

interface FlowLaunchFileFieldProps extends Partial<BusinessAppContextProps> {
  value?: File | FileInfo
  onChange: (value: File | undefined) => void
  disabled?: boolean
  'data-testid'?: string
}

function formatFileSize(bytes?: number): string | null {
  if (typeof bytes !== 'number' || Number.isNaN(bytes) || bytes <= 0) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function getFileSummary(value?: File | FileInfo): { name: string; details?: string } | null {
  if (!value) return null

  if (typeof File !== 'undefined' && value instanceof File) {
    return {
      name: value.name,
      details: formatFileSize(value.size) || value.type || undefined
    }
  }

  const fileInfo = value as FileInfo
  const name = String(fileInfo.fileMetadata?.originalFileName || fileInfo.fileId || fileInfo.path || '').trim()
  if (!name) return null

  return {
    name,
    details: String(fileInfo.fileMetadata?.mimeType || fileInfo.path || '').trim() || undefined
  }
}

export const FlowLaunchFileField: React.FC<FlowLaunchFileFieldProps> = ({
  value,
  onChange,
  disabled = false,
  'data-testid': testId = 'flow-launch-file-field'
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null)
  const summary = getFileSummary(value)

  return (
    <div className="gba:flex gba:flex-col gba:gap-3" data-testid={testId}>
      <Input
        ref={inputRef}
        type="file"
        disabled={disabled}
        onChange={event => {
          const file = event.target.files?.[0]
          onChange(file || undefined)
          event.target.value = ''
        }}
        data-testid={`${testId}-input`}
      />
      {summary ? (
        <div
          className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-md gba:border gba:border-border gba:bg-muted gba:p-3"
          data-testid={`${testId}-selected`}
        >
          <div className="gba:flex gba:min-w-0 gba:flex-col gba:gap-0.5">
            <span className="gba:truncate gba:text-sm gba:font-medium">{summary.name}</span>
            {summary.details ? <span className="gba:text-xs gba:text-muted-foreground">{summary.details}</span> : null}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={() => {
              onChange(undefined)
              if (inputRef.current) inputRef.current.value = ''
            }}
            data-testid={`${testId}-remove-button`}
          >
            Remove
          </Button>
        </div>
      ) : null}
      <div className="gba:text-xs gba:text-muted-foreground" data-testid={`${testId}-hint`}>
        Files are uploaded when you launch the flow.
      </div>
    </div>
  )
}
