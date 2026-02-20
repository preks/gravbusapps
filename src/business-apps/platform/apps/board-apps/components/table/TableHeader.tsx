/**
 * TableHeader - sticky column headers with sort indicators and column management menus.
 */

import React from 'react'
import { Plus } from 'lucide-react'
import type { BoardColumn } from '../../types'
import { AddColumnPopover } from '../columns/AddColumnPopover'
import { ColumnHeaderMenu } from './ColumnHeaderMenu'
import { SortIndicator } from './SortRow'

interface TableHeaderProps {
  columns: BoardColumn[]
  sortMap: Map<string, { direction: 'asc' | 'desc'; priority: number }>
  sortCount: number
  onToggleSort: (colName: string) => void
  onUpdateColumn?: (updated: BoardColumn) => void
  onDeleteColumn?: (columnId: string) => void
  onAddColumn?: (column: BoardColumn) => void
  onOpenSettings: (col: BoardColumn) => void
  testId: string
}

export const TableHeader: React.FC<TableHeaderProps> = ({
  columns,
  sortMap,
  sortCount,
  onToggleSort,
  onUpdateColumn,
  onDeleteColumn,
  onAddColumn,
  onOpenSettings,
  testId
}) => {
  return (
    <thead className="gba:sticky gba:top-0 gba:z-10">
      <tr className="gba:bg-muted/60">
        {columns.map(col => {
          const sortInfo = sortMap.get(col.name)
          return (
            <th
              key={col.id || col.name}
              className="gba:px-2.5 gba:py-1.5 gba:text-left gba:font-medium gba:text-muted-foreground gba:border-b gba:border-r gba:whitespace-nowrap gba:w-40 gba:group/header"
            >
              <div className="gba:flex gba:items-center gba:gap-1">
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
        })}
        {onAddColumn && (
          <th className="gba:px-1 gba:py-1.5 gba:border-b gba:w-10">
            <AddColumnPopover existingColumns={columns} onAdd={onAddColumn} data-testid={`${testId}-add-col-popover`}>
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
    </thead>
  )
}
