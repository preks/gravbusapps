/**
 * TableHeader - sticky column headers with sort indicators, column management
 * menus, and @dnd-kit/sortable horizontal column reorder.
 */

import React, { useMemo } from 'react'
import { Plus, GripVertical } from 'lucide-react'
import { useSortable } from '@dnd-kit/sortable'
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { BoardColumn } from '../../types'
import { AddColumnPopover } from '../columns/AddColumnPopover'
import { ColumnHeaderMenu } from './ColumnHeaderMenu'
import { SortIndicator } from './SortRow'

export const COL_PREFIX = 'col:'

interface TableHeaderProps {
  columns: BoardColumn[]
  boardId: string
  sheetId: string
  sortMap: Map<string, { direction: 'asc' | 'desc'; priority: number }>
  sortCount: number
  onToggleSort: (colName: string) => void
  onUpdateColumn?: (updated: BoardColumn) => void
  onDeleteColumn?: (columnId: string) => void
  onAddColumn?: (column: BoardColumn) => void
  onOpenSettings: (col: BoardColumn) => void
  reorderEnabled?: boolean
  columnReorderEnabled?: boolean
  testId: string
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  boardId,
  sheetId,
  sortMap,
  sortCount,
  onToggleSort,
  onUpdateColumn,
  onDeleteColumn,
  onAddColumn,
  reorderEnabled,
  columnReorderEnabled,
  onOpenSettings,
  testId
}) => {
  const columnSortableIds = useMemo(
    () => (columnReorderEnabled ? columns.map(c => `${COL_PREFIX}${c.id}`) : []),
    [columns, columnReorderEnabled]
  )

  return (
    <SortableContext items={columnSortableIds} strategy={horizontalListSortingStrategy}>
      <tr className="gba:bg-muted/60">
        {reorderEnabled && <th className="gba:w-7 gba:p-0 gba:border-0 gba:bg-transparent" />}
        {columns.map(col => (
          <SortableColumnHeader
            key={col.id || col.name}
            col={col}
            columns={columns}
            sortInfo={sortMap.get(col.name)}
            sortCount={sortCount}
            onToggleSort={onToggleSort}
            onUpdateColumn={onUpdateColumn}
            onDeleteColumn={onDeleteColumn}
            onOpenSettings={onOpenSettings}
            columnReorderEnabled={columnReorderEnabled}
            testId={testId}
          />
        ))}
        {onAddColumn && (
          <th className="gba:px-1 gba:py-1.5 gba:border-b gba:w-10">
            <AddColumnPopover
              existingColumns={columns}
              boardId={boardId}
              sheetId={sheetId}
              onAdd={onAddColumn}
              data-testid={`${testId}-add-col-popover`}
            >
              <button
                className="gba:w-7 gba:h-7 gba:flex gba:items-center gba:justify-center gba:rounded gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
                data-testid={`${testId}-add-col`}
              >
                <Plus className="gba:w-3.5 gba:h-3.5" />
              </button>
            </AddColumnPopover>
          </th>
        )}
      </tr>
    </SortableContext>
  )
}

function SortableColumnHeader({
  col,
  columns,
  sortInfo,
  sortCount,
  onToggleSort,
  onUpdateColumn,
  onDeleteColumn,
  onOpenSettings,
  columnReorderEnabled,
  testId
}: {
  col: BoardColumn
  columns: BoardColumn[]
  sortInfo?: { direction: 'asc' | 'desc'; priority: number }
  sortCount: number
  onToggleSort: (colName: string) => void
  onUpdateColumn?: (updated: BoardColumn) => void
  onDeleteColumn?: (columnId: string) => void
  onOpenSettings: (col: BoardColumn) => void
  columnReorderEnabled?: boolean
  testId: string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `${COL_PREFIX}${col.id}`,
    disabled: !columnReorderEnabled
  })

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined
  }

  return (
    <th
      ref={setNodeRef}
      style={style}
      className="gba:px-2.5 gba:py-1.5 gba:text-left gba:font-medium gba:text-muted-foreground gba:border-b gba:border-r gba:whitespace-nowrap gba:w-40 gba:group/header"
    >
      <div className="gba:flex gba:items-center gba:gap-1">
        {columnReorderEnabled && (
          <button
            type="button"
            className="gba:flex-shrink-0 gba:p-0.5 gba:cursor-grab gba:opacity-0 gba:group-hover/header:opacity-100 gba:transition-opacity gba:text-muted-foreground gba:hover:text-foreground active:gba:cursor-grabbing"
            data-testid={`${testId}-col-grip-${col.id}`}
            {...(attributes as any)}
            {...(listeners as any)}
          >
            <GripVertical className="gba:w-3 gba:h-3" />
          </button>
        )}
        <div className="gba:flex-1 gba:min-w-0">
          {onUpdateColumn && onDeleteColumn ? (
            <ColumnHeaderMenu
              column={col}
              onRename={(colId, newLabel) => {
                const updated = columns.find(c => c.id === colId)
                if (updated) onUpdateColumn({ ...updated, label: newLabel })
              }}
              onOpenSettings={onOpenSettings}
              onHide={colId => {
                const updated = columns.find(c => c.id === colId)
                if (updated) onUpdateColumn({ ...updated, isVisible: false })
              }}
              onDelete={onDeleteColumn}
              data-testid={`${testId}-col-menu-${col.id}`}
            />
          ) : (
            <span className="gba:flex gba:items-center gba:gap-1.5">{col.label}</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onToggleSort(col.name)}
          className="gba:flex-shrink-0 gba:p-0.5 gba:rounded gba:hover:bg-muted/60 gba:transition-colors"
          data-testid={`${testId}-sort-${col.name}`}
        >
          <SortIndicator
            direction={sortInfo?.direction || null}
            priority={sortCount > 1 ? sortInfo?.priority : undefined}
          />
        </button>
      </div>
    </th>
  )
}
