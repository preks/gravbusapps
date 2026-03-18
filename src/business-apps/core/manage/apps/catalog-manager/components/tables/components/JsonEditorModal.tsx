import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, Button } from '@newwork/nw-design-system'
import { CatalogEntry } from '@/common/data/catalog'

interface JsonEditorModalProps {
  isOpen: boolean
  entry: CatalogEntry | null
  jsonText: string
  isValid: boolean
  error: string | null
  hasChanges: boolean
  onJsonChange: (newJsonText: string) => void
  onSave: () => void
  onClose: () => void
  dataTestId: string
}

export const JsonEditorModal: React.FC<JsonEditorModalProps> = ({
  isOpen,
  entry,
  jsonText,
  isValid,
  error,
  hasChanges,
  onJsonChange,
  onSave,
  onClose,
  dataTestId
}) => {
  if (!isOpen || !entry) return null

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent
        className="gba:max-w-4xl gba:max-h-[80vh] gba:overflow-hidden"
        data-testid={`${dataTestId}-JsonEditorModal`}
      >
        <DialogHeader>
          <DialogTitle>JSON Editor - {entry.value || entry.code}</DialogTitle>
          <DialogDescription>Edit the object value as JSON. The JSON will be validated as you type.</DialogDescription>
        </DialogHeader>

        <div className="gba:flex gba:flex-col gba:gap-4 gba:flex-1">
          <div className="gba:flex-1 gba:overflow-hidden">
            <textarea
              value={jsonText}
              onChange={e => onJsonChange(e.target.value)}
              className="gba:w-full gba:h-64 gba:p-3 gba:border gba:rounded gba:font-mono gba:text-sm gba:resize-none"
              style={{
                backgroundColor: error ? 'var(--nw-color-danger-50)' : 'var(--nw-color-surface-primary)',
                borderColor: error ? 'var(--nw-color-danger-300)' : 'var(--nw-color-border-default)',
                color: 'var(--nw-color-text-primary)'
              }}
              placeholder="Enter valid JSON..."
              data-testid={`${dataTestId}-JsonTextarea`}
            />
          </div>

          {error && (
            <div
              className="gba:p-3 gba:rounded gba:text-sm"
              style={{
                backgroundColor: 'var(--nw-color-danger-50)',
                borderColor: 'var(--nw-color-danger-200)',
                color: 'var(--nw-color-danger-700)',
                border: '1px solid'
              }}
              data-testid={`${dataTestId}-JsonError`}
            >
              <strong>JSON Error:</strong> {error}
            </div>
          )}

          <div className="gba:flex gba:justify-between gba:items-center gba:pt-4 gba:border-t">
            <div className="gba:text-sm" style={{ color: 'var(--nw-color-text-secondary)' }}>
              {isValid ? (hasChanges ? '✓ Valid JSON (unsaved changes)' : '✓ Valid JSON') : '✗ Invalid JSON'}
            </div>

            <div className="gba:flex gba:gap-2">
              <Button variant="outline" onClick={onClose} data-testid={`${dataTestId}-JsonCancelButton`}>
                Cancel
              </Button>
              <Button
                onClick={onSave}
                disabled={!isValid}
                data-testid={`${dataTestId}-JsonSaveButton`}
                style={{
                  backgroundColor: isValid ? 'var(--nw-color-success)' : undefined,
                  color: isValid ? 'white' : undefined
                }}
              >
                Save JSON
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default JsonEditorModal
