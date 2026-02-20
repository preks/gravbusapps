/**
 * TableWidget - mini data table widget showing top N rows with selected columns.
 */

import React, { useMemo } from 'react'
import type { BoardRow, BoardColumn, TableWidgetConfig } from '../../types'

export interface TableWidgetProps {
  config: TableWidgetConfig
  columns: BoardColumn[]
  rows: BoardRow[]
  testId: string
}

export const TableWidget: React.FC<TableWidgetProps> = ({ config, columns, rows, testId }) => {
  const displayColumns = useMemo(() => {
    if (config.columns.length === 0) return columns.slice(0, 4)
    return config.columns
      .map(ref => {
        return (
          columns.find(c => c.name === ref) ||
          columns.find(c => c.id === ref) ||
          columns.find(c => c.label.toLowerCase() === ref.toLowerCase()) ||
          columns.find(c => c.name.toLowerCase().includes(ref.toLowerCase()))
        )
      })
      .filter(Boolean) as BoardColumn[]
  }, [config.columns, columns])

  const displayRows = useMemo(() => {
    const limit = config.limit || 10
    return rows.slice(0, limit)
  }, [rows, config.limit])

  if (displayColumns.length === 0) {
    return (
      <div
        className="gba:flex gba:items-center gba:justify-center gba:h-full gba:text-xs gba:text-muted-foreground"
        data-testid={testId}
      >
        No columns configured
      </div>
    )
  }

  return (
    <div className="gba:overflow-auto gba:max-h-[250px]" data-testid={testId}>
      <table className="gba:w-full gba:text-xs gba:border-collapse">
        <thead className="gba:sticky gba:top-0">
          <tr className="gba:bg-muted/60">
            {displayColumns.map(col => (
              <th
                key={col.id || col.name}
                className="gba:px-2 gba:py-1.5 gba:text-left gba:font-medium gba:text-muted-foreground gba:border-b gba:whitespace-nowrap"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayRows.map(row => (
            <tr key={row.id} className="gba:hover:bg-muted/20">
              {displayColumns.map((col, colIdx) => (
                <td
                  key={col.id || col.name}
                  className={`gba:px-2 gba:py-1 gba:border-b gba:truncate gba:max-w-32 ${
                    colIdx === 0 ? 'gba:font-medium' : ''
                  }`}
                >
                  {row.data[col.name] != null ? String(row.data[col.name]) : ''}
                </td>
              ))}
            </tr>
          ))}
          {displayRows.length === 0 && (
            <tr>
              <td
                colSpan={displayColumns.length}
                className="gba:px-2 gba:py-4 gba:text-center gba:text-muted-foreground"
              >
                No data
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
