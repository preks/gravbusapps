import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { Trash2, X, Download } from 'lucide-react'

export interface DriveBulkActionsProps {
  selectedCount: number
  onTrash: () => void
  onDownload?: () => void
  onClearSelection: () => void
  t: (key: string, args?: Record<string, string | number>) => string
  'data-testid'?: string
}

export const DriveBulkActions: React.FC<DriveBulkActionsProps> = ({
  selectedCount,
  onTrash,
  onDownload,
  onClearSelection,
  t,
  'data-testid': testId = 'drive-bulk-actions'
}) => {
  if (selectedCount === 0) return null

  return (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:px-5 gba:py-2.5 gba:bg-card gba:border gba:border-border gba:rounded-xl"
      data-testid={testId}
    >
      <span className="gba:text-sm gba:font-medium gba:text-foreground gba:mr-1">
        {t('bulk-actions-selected', { count: selectedCount })}
      </span>

      <div className="gba:flex gba:items-center gba:gap-1 gba:ml-auto">
        {onDownload && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDownload}
            className="gba:gap-1.5"
            data-testid={`${testId}-download`}
          >
            <Download className="gba:w-4 gba:h-4" />
            {t('bulk-actions-download')}
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={onTrash}
          className="gba:gap-1.5 gba:text-destructive gba:hover:text-destructive"
          data-testid={`${testId}-trash`}
        >
          <Trash2 className="gba:w-4 gba:h-4" />
          {t('bulk-actions-trash')}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="gba:gap-1"
          data-testid={`${testId}-clear`}
        >
          <X className="gba:w-4 gba:h-4" />
        </Button>
      </div>
    </div>
  )
}
