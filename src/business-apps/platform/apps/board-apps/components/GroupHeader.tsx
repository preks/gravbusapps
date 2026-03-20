/**
 * GroupHeader - collapsible group header for Monday-style row grouping.
 */

import React, { useCallback } from 'react'
import { Button, Badge } from '@newwork/nw-design-system'
import { ChevronDown, ChevronRight, Plus, GripVertical } from 'lucide-react'
import type { BoardGroup } from '../types'

export interface GroupHeaderProps {
  group: BoardGroup
  rowCount: number
  isCollapsed: boolean
  onToggleCollapse: (groupId: string) => void
  onAddRow?: (groupId: string) => void
  'data-testid'?: string
}

const TOKEN_TO_CLASS: Record<string, string> = {
  primary: 'gba:bg-primary/10 gba:text-primary',
  success: 'gba:bg-success-secondary gba:text-success-secondary-foreground',
  info: 'gba:bg-info-secondary gba:text-info-secondary-foreground',
  warning: 'gba:bg-warning-secondary gba:text-warning-secondary-foreground',
  destructive: 'gba:bg-destructive-secondary gba:text-destructive-secondary-foreground',
  muted: 'gba:bg-muted gba:text-muted-foreground'
}

export const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  rowCount,
  isCollapsed,
  onToggleCollapse,
  onAddRow,
  'data-testid': testId = 'group-header'
}) => {
  const handleToggle = useCallback(() => onToggleCollapse(group.id), [group.id, onToggleCollapse])
  const handleAddRow = useCallback(() => onAddRow?.(group.id), [group.id, onAddRow])

  const colorClass = group.colorToken ? TOKEN_TO_CLASS[group.colorToken] || TOKEN_TO_CLASS.muted : TOKEN_TO_CLASS.muted

  return (
    <div
      className={`gba:flex gba:items-center gba:gap-1.5 gba:px-2 gba:py-1.5 gba:select-none gba:group ${colorClass}`}
      data-testid={`${testId}-${group.id}`}
    >
      <button
        className="gba:opacity-0 gba:group-hover:opacity-50 gba:cursor-grab gba:p-0.5"
        tabIndex={-1}
        data-testid={`${testId}-grip-${group.id}`}
      >
        <GripVertical className="gba:w-3 gba:h-3" />
      </button>

      <button
        onClick={handleToggle}
        className="gba:flex gba:items-center gba:gap-1 gba:font-medium gba:text-xs"
        data-testid={`${testId}-toggle-${group.id}`}
      >
        {isCollapsed ? (
          <ChevronRight className="gba:w-3.5 gba:h-3.5" />
        ) : (
          <ChevronDown className="gba:w-3.5 gba:h-3.5" />
        )}
        {group.name}
      </button>

      <Badge variant="secondary" className="gba:text-xs gba:px-1.5 gba:py-0 gba:h-4">
        {rowCount}
      </Badge>

      {onAddRow && (
        <Button
          variant="ghost"
          size="icon"
          className="gba:h-5 gba:w-5 gba:opacity-0 gba:group-hover:opacity-100 gba:ml-auto"
          onClick={handleAddRow}
          data-testid={`${testId}-add-row-${group.id}`}
        >
          <Plus className="gba:w-3 gba:h-3" />
        </Button>
      )}
    </div>
  )
}
