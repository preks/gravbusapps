import React, { useCallback, useRef, useState } from 'react'
import { Button, Input } from '@newwork/nw-design-system'

type UploadedFileMeta = { name: string; size: number; type: string }

export type FlowProposalFileUploadHints = {
  endpoint?: string
  flowProposalIdParam?: string
  fieldKeyParam?: string
  sessionIdParam?: string
  fileParam?: string
}

interface FlowProposalFileFieldProps {
  controlId: string
  label: string
  required: boolean
  disabled?: boolean
  value: UploadedFileMeta[] | null | undefined
  onChange: (value: UploadedFileMeta[]) => void
  onUpload: (
    files: File[],
    binding: { flowProposalId: string; fieldKey: string; hints?: FlowProposalFileUploadHints }
  ) => Promise<void>
  flowProposalId: string
  fieldKey: string
  hints?: FlowProposalFileUploadHints
}

function fileToMeta(f: File): UploadedFileMeta {
  return { name: f.name, size: f.size, type: f.type }
}

export const FlowProposalFileField: React.FC<FlowProposalFileFieldProps> = props => {
  const { controlId, label, required, disabled, value, onChange, onUpload, flowProposalId, fieldKey, hints } = props

  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploaded = Array.isArray(value) ? value : []

  const clearSelection = useCallback(() => {
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const handlePick = useCallback(() => {
    if (disabled) return
    inputRef.current?.click()
  }, [disabled])

  const handleClearUploaded = useCallback(() => {
    onChange([])
  }, [onChange])

  return (
    <div className="gba:space-y-2" data-testid={`everyai-form-file-field-${controlId}`}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
        <label htmlFor={controlId} className="gba:text-sm gba:font-medium gba:text-foreground">
          {label}
          {required && <span className="gba:text-destructive gba:ml-1">*</span>}
        </label>
        {uploaded.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gba:h-8"
            onClick={handleClearUploaded}
            disabled={disabled || isUploading}
            data-testid={`everyai-form-file-clear-${controlId}`}
          >
            Clear
          </Button>
        )}
      </div>

      {uploaded.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-2" data-testid={`everyai-form-file-uploaded-${controlId}`}>
          {uploaded.map((f, idx) => (
            <div
              key={`${f.name}-${idx}`}
              className="gba:flex gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-border gba:bg-muted gba:px-2.5 gba:py-1 gba:text-xs"
              title={f.name}
            >
              <span className="gba:max-w-xs gba:truncate">{f.name}</span>
            </div>
          ))}
        </div>
      )}

      <div className="gba:flex gba:flex-col gba:gap-2">
        <Input
          ref={inputRef}
          id={controlId}
          type="file"
          multiple
          className="gba:hidden"
          onChange={async e => {
            const files = Array.from(e.target.files || [])
            if (files.length === 0) return
            if (disabled || isUploading) {
              clearSelection()
              return
            }

            setError(null)
            setIsUploading(true)
            try {
              await onUpload(files, { flowProposalId, fieldKey, hints })
              const metas = files.map(fileToMeta)
              onChange([...uploaded, ...metas])
            } catch (err) {
              const message = err instanceof Error ? err.message : 'Upload failed'
              setError(message)
            } finally {
              setIsUploading(false)
              // Always clear so selecting the same file again triggers onChange.
              clearSelection()
            }
          }}
          disabled={disabled}
          data-testid={`everyai-form-file-input-${controlId}`}
        />

        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handlePick}
            disabled={disabled || isUploading}
            data-testid={`everyai-form-file-pick-${controlId}`}
          >
            {isUploading ? 'Uploading…' : 'Attach file'}
          </Button>
          <span className="gba:text-xs gba:text-muted-foreground">
            {uploaded.length > 0 ? `${uploaded.length} file(s) attached` : 'No file attached'}
          </span>
        </div>

        {error && (
          <div className="gba:text-xs gba:text-destructive" data-testid={`everyai-form-file-error-${controlId}`}>
            {error}
          </div>
        )}
      </div>
    </div>
  )
}
