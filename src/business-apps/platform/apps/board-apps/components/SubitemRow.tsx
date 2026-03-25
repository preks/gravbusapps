/**
 * SubitemRow - renders a nested subitem with indentation.
 */

import React from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import type { BoardRow, BoardColumn } from '../types'

export interface SubitemRowProps {
  row: BoardRow
  columns: BoardColumn[]
  depth?: number
  hasChildren: boolean
  isExpanded: boolean
  onToggleExpand: (rowId: string) => void
  onRowClick?: (row: BoardRow) => void
  'data-testid'?: string
}

export const SubitemRow: React.FC<SubitemRowProps> = ({
  row,
  columns,
  depth = 0,
  hasChildren,
  isExpanded,
  onToggleExpand,
  onRowClick,
  'data-testid': testId = 'subitem-row'
}) => {
  const indentClass =
    depth <= 0
      ? 'gba:pl-0'
      : depth === 1
        ? 'gba:pl-5'
        : depth === 2
          ? 'gba:pl-10'
          : depth === 3
            ? 'gba:pl-14'
            : 'gba:pl-16'

  return (
    <tr
      className="gba:hover:bg-muted/20 gba:transition-colors gba:cursor-pointer"
      onClick={() => onRowClick?.(row)}
      data-testid={`${testId}-${row.id}`}
    >
      {columns.map((col, idx) => (
        <td key={col.id} className="gba:px-2.5 gba:py-1.5 gba:border-b gba:border-r gba:text-xs gba:truncate gba:w-40">
          {idx === 0 ? (
            <div className={`gba:flex gba:items-center gba:gap-1 ${indentClass}`}>
              {hasChildren && (
                <button
                  onClick={e => {
                    e.stopPropagation()
                    onToggleExpand(row.id)
                  }}
                  className="gba:flex-shrink-0 gba:p-0.5 gba:rounded gba:hover:bg-muted"
                  data-testid={`${testId}-expand-${row.id}`}
                >
                  {isExpanded ? (
                    <ChevronDown className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                  ) : (
                    <ChevronRight className="gba:w-3 gba:h-3 gba:text-muted-foreground" />
                  )}
                </button>
              )}
              {!hasChildren && depth > 0 && <span className="gba:w-4" />}
              <span className="gba:truncate">{formatCell(row.data[col.name])}</span>
            </div>
          ) : (
            formatCell(row.data[col.name])
          )}
        </td>
      ))}
    </tr>
  )
}

function formatCell(value: unknown): React.ReactNode {
  if (value === null || value === undefined || value === '') {
    return <span className="gba:text-muted-foreground/40">--</span>
  }
  if (typeof value === 'object') {
    try { return JSON.stringify(value) } catch { return '' }
  }
  return String(value)
}
