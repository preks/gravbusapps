/**
 * Bulk actions toolbar for plan selection
 * Shows selection count and action buttons
 */

import React from 'react'
import { CheckSquare, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@newwork/nw-design-system'

export interface BulkActionsToolbarProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClear: () => void
  onDeleteSelected: () => void
  isDeleting: boolean
}

export const BulkActionsToolbar: React.FC<BulkActionsToolbarProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClear,
  onDeleteSelected,
  isDeleting
}) => {
  return (
    <div className="gba:bg-primary/10 gba:border gba:border-primary/20 gba:rounded-lg gba:p-4 gba:flex gba:items-center gba:justify-between gba:gap-4">
      <div className="gba:flex gba:items-center gba:gap-3">
        <CheckSquare className="gba:w-5 gba:h-5 gba:text-primary" />
        <span className="gba:text-sm gba:font-medium">
          {selectedCount} of {totalCount} selected
        </span>
      </div>
      <div className="gba:flex gba:items-center gba:gap-2">
        <Button onClick={onSelectAll} variant="outline" size="sm" disabled={selectedCount === totalCount || isDeleting}>
          Select All
        </Button>
        <Button onClick={onClear} variant="outline" size="sm" disabled={selectedCount === 0 || isDeleting}>
          Clear
        </Button>
        <Button
          onClick={onDeleteSelected}
          variant="destructive"
          size="sm"
          disabled={selectedCount === 0 || isDeleting}
          className="gba:gap-2"
        >
          {isDeleting ? (
            <>
              <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin" />
              Deleting...
            </>
          ) : (
            <>
              <Trash2 className="gba:w-4 gba:h-4" />
              Delete Selected ({selectedCount})
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
