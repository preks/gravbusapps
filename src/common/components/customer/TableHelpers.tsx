import React from 'react'
import { TableHead, TableCell, Button } from '@newwork/nw-design-system'
import { CalendarIcon, ArrowUpIcon, ArrowDownIcon } from '@phosphor-icons/react'
/**
 * Shared table helper components for customer-related tables
 * Used across campaigns, leads, accounts, contacts, opportunities to eliminate duplication
 */

/**
 * Hook for table sorting logic - eliminates duplication across tables
 */
export const useTableSorting = (
  currentSortField: string,
  currentSortOrder: 'ASC' | 'DESC' | '',
  onSortingChange: (field: string, order: 'ASC' | 'DESC' | '') => void
) => {
  // Handle column sorting - cycle through ASC -> DESC -> clear
  const handleSort = (field: string) => {
    if (currentSortField === field) {
      if (currentSortOrder === 'ASC') {
        onSortingChange(field, 'DESC')
      } else if (currentSortOrder === 'DESC') {
        onSortingChange('', '')
      } else {
        onSortingChange(field, 'ASC')
      }
    } else {
      onSortingChange(field, 'ASC')
    }
  }

  // Render sort icon based on current state
  const renderSortIcon = (field: string) => {
    if (currentSortField !== field || !currentSortField) return null
    if (currentSortOrder === 'ASC') return <ArrowUpIcon className="gba:inline gba:ml-1" size={12} />
    if (currentSortOrder === 'DESC') return <ArrowDownIcon className="gba:inline gba:ml-1" size={12} />
    return null
  }

  return { handleSort, renderSortIcon }
}

// Sortable table header component
export interface SortableHeaderProps {
  field: string
  label: string
  width?: string
  onSort: (field: string) => void
  renderSortIcon: (field: string) => React.ReactNode
  testIdPrefix: string
  testIdSuffix: string
}

export const SortableHeader: React.FC<SortableHeaderProps> = ({
  field,
  label,
  width,
  onSort,
  renderSortIcon,
  testIdPrefix,
  testIdSuffix
}) => (
  <TableHead
    className={`${width || ''} gba:font-semibold gba:text-gray-700 gba:py-4 gba:px-6 gba:cursor-pointer gba:select-none hover:gba:bg-gray-100`}
    onClick={() => onSort(field)}
    data-testid={`${testIdPrefix}-${testIdSuffix}`}
  >
    <div className="gba:flex gba:items-center">
      {label}
      {renderSortIcon(field)}
    </div>
  </TableHead>
)

// Date cell component with calendar icon
export interface DateCellProps {
  dateString?: string
  testId: string
}

export const DateCell: React.FC<DateCellProps> = ({ dateString, testId }) => {
  const formattedDate = dateString
    ? new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    : '-'

  return (
    <TableCell className="gba:py-4 gba:px-6" data-testid={testId}>
      <div className="gba:flex gba:items-center gba:gap-2">
        <CalendarIcon size={14} style={{ color: 'var(--color-text-secondary)' }} />
        <span className="gba:text-sm">{formattedDate}</span>
      </div>
    </TableCell>
  )
}

// Pagination button component
export interface PaginationButtonProps {
  onClick: () => void
  disabled: boolean
  testId: string
  label: string
  symbol: string
}

export const PaginationButton: React.FC<PaginationButtonProps> = ({ onClick, disabled, testId, label, symbol }) => (
  <Button
    variant="outline"
    className="gba:h-8 gba:w-8 gba:p-0"
    onClick={onClick}
    disabled={disabled}
    data-testid={testId}
  >
    <span className="gba:sr-only">{label}</span>
    {symbol}
  </Button>
)

// Icon cell component for displaying content with an icon
export interface IconCellProps {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>
  iconSize?: number
  iconColor: string
  content: React.ReactNode
  testId: string
}

export const IconCell: React.FC<IconCellProps> = ({ icon: Icon, iconSize = 14, iconColor, content, testId }) => (
  <TableCell className="gba:py-4 gba:px-6" data-testid={testId}>
    <div className="gba:flex gba:items-center gba:gap-2">
      <Icon size={iconSize} style={{ color: iconColor }} />
      {content}
    </div>
  </TableCell>
)
