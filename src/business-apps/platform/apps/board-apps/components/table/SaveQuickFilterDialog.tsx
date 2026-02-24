/**
 * SaveQuickFilterDialog - small dialog to name a filter before saving it as a quick filter.
 */

import React, { useCallback, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label
} from '@newwork/nw-design-system'
import type { BoardColumn, BoardQuickFilter, ViewFilter } from '../../types'

export interface SaveQuickFilterDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filter: ViewFilter
  columns: BoardColumn[]
  onSave: (qf: BoardQuickFilter) => void
  'data-testid'?: string
}

export const SaveQuickFilterDialog: React.FC<SaveQuickFilterDialogProps> = ({
  open,
  onOpenChange,
  filter,
  columns,
  onSave,
  'data-testid': testId = 'save-quick-filter-dialog'
}) => {
  const col = columns.find(c => c.name === filter.column)
  const defaultName = col ? `${col.label} ${filter.operator.replace(/_/g, ' ')}` : 'Quick filter'
  const [name, setName] = useState(defaultName)

  const handleSave = useCallback(() => {
    const qf: BoardQuickFilter = {
      id: `qf-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      name: name.trim() || defaultName,
      column: filter.column,
      operator: filter.operator,
      value: filter.value,
      ...(filter.secondValue !== undefined ? { secondValue: filter.secondValue } : {})
    }
    onSave(qf)
    onOpenChange(false)
  }, [name, defaultName, filter, onSave, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gba:max-w-sm" data-testid={testId}>
        <DialogHeader>
          <DialogTitle>Save as quick filter</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-3 gba:py-2">
          <div>
            <Label className="gba:text-xs">Name</Label>
            <Input
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave()
              }}
              placeholder="Filter name..."
              className="gba:h-8 gba:text-xs"
              autoFocus
              data-testid={`${testId}-name`}
            />
          </div>
          <p className="gba:text-xs gba:text-muted-foreground">
            {col?.label || filter.column} {filter.operator.replace(/_/g, ' ')}{' '}
            {filter.value != null && filter.value !== '' ? String(filter.value) : ''}
          </p>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} data-testid={`${testId}-cancel`}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={!name.trim()} data-testid={`${testId}-save`}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
