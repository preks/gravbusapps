import React from 'react'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, Skeleton } from '@newwork/nw-design-system'

const DEFAULT_ROW_COUNT = 10
const DEFAULT_COLUMN_COUNT = 6

interface TableSkeletonProps {
  rowCount?: number
  columnCount?: number
  className?: string
}

/**
 * Full-page table skeleton for initial load only. Use when isLoading && data.length === 0.
 */
export const TableSkeleton: React.FC<TableSkeletonProps> = ({
  rowCount = DEFAULT_ROW_COUNT,
  columnCount = DEFAULT_COLUMN_COUNT,
  className
}) => {
  const rows = React.useMemo(() => Array.from({ length: rowCount }, (_, i) => `skeleton-row-${i}`), [rowCount])
  const cols = React.useMemo(() => Array.from({ length: columnCount }, (_, i) => i), [columnCount])

  return (
    <div className={`gba:flex gba:flex-col gba:h-full gba:overflow-auto gba:border gba:rounded-lg ${className ?? ''}`}>
      <Table className="gba:table-fixed gba:w-full">
        <TableHeader>
          <TableRow>
            {cols.map(i => (
              <TableHead key={i} className="gba:px-2">
                <Skeleton className="gba:h-4 gba:w-20" />
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map(rowKey => (
            <TableRow key={rowKey}>
              {cols.map(colIndex => (
                <TableCell key={`${rowKey}-${colIndex}`} className="gba:px-2">
                  <Skeleton className="gba:h-4 gba:w-full gba:max-w-[200px]" />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
