import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { ArrowsClockwise, Plus } from '@phosphor-icons/react'

interface EntityDataTableToolbarProps {
  rowCount: number
  loading: boolean
  mutating: boolean
  onRefresh: () => void
  onAddRow: () => void
  testId: string
}

export const EntityDataTableToolbar: React.FC<EntityDataTableToolbarProps> = ({
  rowCount,
  loading,
  mutating,
  onRefresh,
  onAddRow,
  testId
}) => (
  <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
    <div>
      <h3 className="gba:text-sm gba:font-semibold">Data ({rowCount} rows)</h3>
      <p className="gba:text-xs gba:text-muted-foreground">Inline-edit rows and save changed records.</p>
    </div>
    <div className="gba:flex gba:items-center gba:gap-2">
      <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} data-testid={`${testId}-refresh`}>
        <ArrowsClockwise className={`gba:h-4 gba:w-4 ${loading ? 'gba:animate-spin' : ''}`} />
      </Button>
      <Button variant="default" size="sm" onClick={onAddRow} disabled={mutating} data-testid={`${testId}-add-row`}>
        <Plus className="gba:mr-1 gba:h-4 gba:w-4" />
        Add Row
      </Button>
    </div>
  </div>
)
