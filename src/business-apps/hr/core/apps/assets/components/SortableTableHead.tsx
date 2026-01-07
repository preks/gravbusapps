import React from 'react'
import { TableHead } from '@newwork/nw-design-system'
import { CaretUp, CaretDown } from '@phosphor-icons/react'

interface SortableTableHeadProps {
  children: React.ReactNode
  field: string
  currentSortField?: string
  currentSortOrder?: 'ASC' | 'DESC'
  onSort?: (field: string, order: 'ASC' | 'DESC' | '') => void
  className?: string
}

export const SortableTableHead: React.FC<SortableTableHeadProps> = ({
  children,
  field,
  currentSortField,
  currentSortOrder,
  onSort,
  className
}) => {
  if (!onSort) {
    return <TableHead className={className}>{children}</TableHead>
  }

  const isSorted = currentSortField === field
  const nextOrder = isSorted ? (currentSortOrder === 'ASC' ? 'DESC' : '') : 'ASC'

  return (
    <TableHead
      className={`gba:cursor-pointer gba:select-none gba:hover:gba:bg-muted gba:transition-colors ${className || ''}`}
      onClick={() => onSort(field, nextOrder)}
    >
      <div className="gba:flex gba:items-center gba:gap-1">
        {children}
        {isSorted &&
          (currentSortOrder === 'ASC' ? (
            <CaretUp className="gba:w-4 gba:h-4" />
          ) : (
            <CaretDown className="gba:w-4 gba:h-4" />
          ))}
      </div>
    </TableHead>
  )
}
