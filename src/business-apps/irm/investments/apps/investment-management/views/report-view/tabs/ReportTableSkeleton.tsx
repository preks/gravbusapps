import React from 'react'
import { TableRow, TableCell, Skeleton } from '@newwork/nw-design-system'

export interface ReportTableSkeletonProps {
  /**
   * Number of skeleton rows to display (default: 10)
   */
  rowCount?: number
  /**
   * Number of columns per row (default: 4)
   */
  columnCount?: number
}

/**
 * Simple skeleton rows for report tables
 * Returns TableRow elements that can be inserted into TableBody
 */
export const ReportTableSkeleton: React.FC<ReportTableSkeletonProps> = ({ rowCount = 10, columnCount = 4 }) => {
  // Generate stable keys for skeleton rows - these are static placeholders, not dynamic data
  const rows = React.useMemo(() => Array.from({ length: rowCount }, (_, i) => `skeleton-row-${i}`), [rowCount])
  const cols = React.useMemo(() => Array.from({ length: columnCount }, (_, i) => i), [columnCount])

  return (
    <>
      {rows.map(rowKey => (
        <TableRow key={rowKey}>
          {cols.map(colIndex => (
            <TableCell key={`${rowKey}-col-${colIndex}`} style={{ padding: 'var(--nw-spacing-3) var(--nw-spacing-4)' }}>
              <Skeleton className="gba:h-4 gba:w-24" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  )
}

export default ReportTableSkeleton
