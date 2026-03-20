/**
 * TableFields - form fields for the table widget type.
 * Extracted from AddWidgetLegacyFields for file size management.
 */

import React from 'react'
import {
  Label,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Checkbox
} from '@newwork/nw-design-system'
import type { BoardColumn } from '../../types'
import { Hint, HINTS } from './widgetFieldHelpers'

export interface TableFieldsProps {
  columns: BoardColumn[]
  tableColumns: string[]
  onToggleTableColumn: (name: string) => void
  tableLimit: number
  onTableLimitChange: (v: number) => void
  sortBy: string
  onSortByChange: (v: string) => void
  sortDir: string
  onSortDirChange: (v: string) => void
  testId: string
}

export const TableFields: React.FC<TableFieldsProps> = ({
  columns,
  tableColumns,
  onToggleTableColumn,
  tableLimit,
  onTableLimitChange,
  sortBy,
  onSortByChange,
  sortDir,
  onSortDirChange,
  testId
}) => (
  <>
    <div>
      <Label className="gba:text-xs gba:mb-1 gba:block">Columns to show</Label>
      <div className="gba:max-h-32 gba:overflow-auto gba:space-y-1 gba:border gba:rounded gba:p-2 gba:border-border">
        {columns.map(c => (
          <label key={c.id || c.name} className="gba:flex gba:items-center gba:gap-2 gba:text-xs gba:cursor-pointer">
            <Checkbox
              checked={tableColumns.includes(c.name)}
              onCheckedChange={() => onToggleTableColumn(c.name)}
              data-testid={`${testId}-table-col-${c.name}`}
            />
            {c.label}
          </label>
        ))}
      </div>
      <Hint>{HINTS.tableCols}</Hint>
    </div>
    <div className="gba:grid gba:grid-cols-3 gba:gap-2">
      <div>
        <Label className="gba:text-xs">Max rows</Label>
        <Input
          type="number"
          value={tableLimit}
          onChange={e => onTableLimitChange(Math.max(1, Number(e.target.value) || 10))}
          className="gba:h-8 gba:text-xs gba:w-full"
          min={1}
          max={100}
          data-testid={`${testId}-table-limit`}
        />
        <Hint>{HINTS.tableLimit}</Hint>
      </div>
      <div>
        <Label className="gba:text-xs">Sort by</Label>
        <Select value={sortBy || '_none'} onValueChange={v => onSortByChange(v === '_none' ? '' : v)}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-table-sort`}>
            <SelectValue placeholder="None" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_none">None</SelectItem>
            {columns.map(c => (
              <SelectItem key={c.name} value={c.name}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Hint>{HINTS.tableSort}</Hint>
      </div>
      <div>
        <Label className="gba:text-xs">Direction</Label>
        <Select value={sortDir || 'asc'} onValueChange={onSortDirChange}>
          <SelectTrigger className="gba:h-8 gba:text-xs" data-testid={`${testId}-table-sort-dir`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
        <Hint>{HINTS.tableSortDir}</Hint>
      </div>
    </div>
  </>
)
