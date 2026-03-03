/**
 * SortRow - a single sort condition with column selector and direction toggle.
 */

import React from 'react'
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import { ArrowUpDown, ArrowUp, ArrowDown, X, GripVertical } from 'lucide-react'
import type { BoardColumn, ViewSort } from '../../types'

interface SortRowProps {
  sort: ViewSort
  columns: BoardColumn[]
  index: number
  onUpdate: (id: string, updates: Partial<ViewSort>) => void
  onRemove: (id: string) => void
  'data-testid'?: string
}

export const SortRow: React.FC<SortRowProps> = ({
  sort,
  columns,
  index,
  onUpdate,
  onRemove,
  'data-testid': testId = 'sort-row'
}) => {
  return (
    <div className="gba:flex gba:items-center gba:gap-1.5 gba:group" data-testid={testId}>
      <GripVertical className="gba:w-3 gba:h-3 gba:text-muted-foreground/40 gba:flex-shrink-0" />

      <span className="gba:text-xs gba:text-muted-foreground gba:w-10 gba:text-right gba:flex-shrink-0">
        {index === 0 ? 'Sort' : 'then'}
      </span>

      <Select value={sort.column} onValueChange={col => onUpdate(sort.id, { column: col })}>
        <SelectTrigger className="gba:h-7 gba:text-xs gba:w-36 gba:flex-shrink-0" data-testid={`${testId}-col`}>
          <SelectValue placeholder="Column" />
        </SelectTrigger>
        <SelectContent>
          {columns.map(c => (
            <SelectItem key={c.name} value={c.name}>
              {c.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        className="gba:h-7 gba:text-xs gba:gap-1 gba:px-2 gba:flex-shrink-0"
        onClick={() => onUpdate(sort.id, { direction: sort.direction === 'asc' ? 'desc' : 'asc' })}
        data-testid={`${testId}-dir`}
      >
        {sort.direction === 'asc' ? (
          <>
            <ArrowUp className="gba:w-3 gba:h-3" /> Ascending
          </>
        ) : (
          <>
            <ArrowDown className="gba:w-3 gba:h-3" /> Descending
          </>
        )}
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="gba:h-6 gba:w-6 gba:flex-shrink-0 gba:opacity-0 gba:group-hover:opacity-100 gba:transition-opacity"
        onClick={() => onRemove(sort.id)}
        data-testid={`${testId}-remove`}
      >
        <X className="gba:w-3 gba:h-3" />
      </Button>
    </div>
  )
}

export const SortIndicator: React.FC<{ direction: 'asc' | 'desc' | null; priority?: number }> = ({
  direction,
  priority
}) => {
  if (!direction)
    return (
      <ArrowUpDown className="gba:w-3 gba:h-3 gba:text-muted-foreground/40 gba:opacity-0 gba:group-hover/header:opacity-100 gba:transition-opacity" />
    )

  return (
    <span className="gba:flex gba:items-center gba:gap-0.5 gba:text-primary">
      {direction === 'asc' ? <ArrowUp className="gba:w-3 gba:h-3" /> : <ArrowDown className="gba:w-3 gba:h-3" />}
      {priority != null && priority > 0 && (
        <span className="gba:text-[10px] gba:font-semibold gba:leading-none">{priority + 1}</span>
      )}
    </span>
  )
}
