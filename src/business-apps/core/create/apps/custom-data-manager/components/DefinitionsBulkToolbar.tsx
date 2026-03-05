import React from 'react'
import { Alert, AlertDescription, Button } from '@newwork/nw-design-system'
import { Rocket, Download, Trash2, X } from 'lucide-react'

interface DefinitionsBulkToolbarProps {
  selectedCount: number
  promotableCount: number
  onClearSelection: () => void
  onPromote?: () => void
  onExport: () => void
  onDelete: () => void
  'data-testid'?: string
}

export const DefinitionsBulkToolbar: React.FC<DefinitionsBulkToolbarProps> = ({
  selectedCount,
  promotableCount,
  onClearSelection,
  onPromote,
  onExport,
  onDelete,
  'data-testid': testId = 'definitions-bulk-toolbar'
}) => {
  return (
    <Alert className="gba:bg-primary/5 gba:border-primary/20" data-testid={testId}>
      <AlertDescription>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div className="gba:flex gba:items-center gba:gap-3">
            <span className="gba:font-medium">
              {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearSelection}
              className="gba:h-7 gba:text-xs"
              data-testid={`${testId}-clear-selection`}
            >
              <X className="gba:h-3 gba:w-3 gba:mr-1" />
              Clear
            </Button>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            {promotableCount > 0 && onPromote && (
              <Button
                variant="default"
                size="sm"
                onClick={onPromote}
                className="gba:h-8"
                data-testid={`${testId}-bulk-promote`}
              >
                <Rocket className="gba:h-4 gba:w-4 gba:mr-1" />
                Promote ({promotableCount})
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onExport}
              className="gba:h-8"
              data-testid={`${testId}-bulk-export`}
            >
              <Download className="gba:h-4 gba:w-4 gba:mr-1" />
              Export
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={onDelete}
              className="gba:h-8"
              data-testid={`${testId}-bulk-delete`}
            >
              <Trash2 className="gba:h-4 gba:w-4 gba:mr-1" />
              Delete
            </Button>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}
