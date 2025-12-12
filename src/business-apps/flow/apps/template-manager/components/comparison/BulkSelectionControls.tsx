/**
 * BulkSelectionControls Component
 * Controls for bulk template selection and actions
 */

import React from 'react'
import { Button, Card, CardContent } from '@newwork/nw-design-system'
import { CheckSquare, Square, X, ArrowRight } from 'lucide-react'

interface BulkSelectionControlsProps {
  selectedCount: number
  totalCount: number
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkSync: () => void
  disabled?: boolean
}

export const BulkSelectionControls: React.FC<BulkSelectionControlsProps> = ({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkSync,
  disabled = false
}) => {
  if (selectedCount === 0) return null

  const allSelected = selectedCount === totalCount

  return (
    <Card className="gba:border-primary gba:bg-primary-secondary">
      <CardContent className="gba:p-4">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-4">
          {/* Selection Info */}
          <div className="gba:flex gba:items-center gba:gap-3">
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-primary">
              <CheckSquare className="gba:h-5 gba:w-5" />
              <span className="gba:font-semibold">
                {selectedCount} template{selectedCount !== 1 ? 's' : ''} selected
              </span>
            </div>

            <div className="gba:h-4 gba:w-px gba:bg-border" />

            <span className="gba:text-sm gba:text-muted-foreground">
              {selectedCount} of {totalCount} templates
            </span>
          </div>

          {/* Actions */}
          <div className="gba:flex gba:items-center gba:gap-2">
            {!allSelected && (
              <Button variant="outline" size="sm" onClick={onSelectAll} disabled={disabled}>
                <Square className="gba:mr-2 gba:h-4 gba:w-4" />
                Select All
              </Button>
            )}

            <Button variant="outline" size="sm" onClick={onClearSelection} disabled={disabled}>
              <X className="gba:mr-2 gba:h-4 gba:w-4" />
              Clear Selection
            </Button>

            <Button variant="default" size="sm" onClick={onBulkSync} disabled={disabled}>
              <ArrowRight className="gba:mr-2 gba:h-4 gba:w-4" />
              Bulk Sync ({selectedCount})
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
