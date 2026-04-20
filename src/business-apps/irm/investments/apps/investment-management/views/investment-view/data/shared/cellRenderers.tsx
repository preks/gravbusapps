import React from 'react'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import type { CellContext } from '@tanstack/react-table'
import type { Investment } from '@/common/data/investment/types/investmentTypes.new'
import { BuildingsIcon, CalendarIcon } from '@phosphor-icons/react'
import { navigateTo } from '@/common/utils/navigationUtils'
import { formatDate } from '@/common/data/investment/utils/formatters'
import { getInvestmentStatusBadgeVariant } from '../utils/statusBadgeHelpers'

export { getPerformanceColorClass, getPerformanceSign } from './investmentPerformanceDisplay'

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get owner display name from investment data
 */
export const getOwnerName = (investment: Investment): string => {
  if (investment.ownerEmployee?.displayName) {
    return investment.ownerEmployee.displayName
  }
  if (investment.ownerEmployee?.firstName || investment.ownerEmployee?.lastName) {
    return `${investment.ownerEmployee.firstName || ''} ${investment.ownerEmployee.lastName || ''}`.trim()
  }
  return '-'
}

/**
 * Get initials from owner name
 */
export const getOwnerInitials = (ownerName: string): string => {
  if (ownerName === '-') return 'O'
  const initials = ownerName
    .split(' ')
    .map(n => n[0] || '')
    .join('')
    .toUpperCase()
  return initials || 'O'
}

/**
 * Currency helper to render amounts
 */
export const renderAmount = (amount: number | undefined, currencyCode?: string) => {
  if (typeof amount !== 'number') {
    return <div className="gba:text-right gba:text-sm gba:text-muted-foreground">-</div>
  }

  const formattedValue = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: currencyCode || 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)

  return <div className="gba:text-right gba:text-sm gba:font-mono gba:truncate">{formattedValue}</div>
}

// ============================================================================
// Cell Renderers
// ============================================================================

/**
 * Cell renderer: Name cell with truncation
 */
export const NameCell = ({ row }: CellContext<Investment, unknown>) => {
  const name = row.original.name || 'Untitled Investment'
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-0">
      <BuildingsIcon className="gba:w-4 gba:h-4 gba:text-gray-500 gba:flex-shrink-0" />
      <span className="gba:font-medium gba:truncate gba:block" title={name}>
        {name}
      </span>
    </div>
  )
}

/**
 * Cell renderer: Investment Type cell
 * @param defaultLabel - Fallback label if investment type is not set
 */
export const createInvestmentTypeCell = (defaultLabel: string) => {
  return ({ row }: CellContext<Investment, unknown>) => {
    const typeValue = row.original.investmentType?.value || defaultLabel
    return (
      <span className="gba:text-sm gba:truncate gba:block" title={typeValue}>
        {typeValue}
      </span>
    )
  }
}

/**
 * Cell renderer: Total Investment Amount cell
 */
export const TotalInvestmentAmountCell = ({ row }: CellContext<Investment, unknown>) =>
  renderAmount(row.original.totalInvestmentAmount || 0, row.original.currency?.code)

/**
 * Cell renderer: Owner Employee cell with truncation
 */
export const OwnerEmployeeCell = ({ row }: CellContext<Investment, unknown>) => {
  if (!row.original.ownerEmployee) {
    return <span className="gba:text-sm gba:text-muted-foreground">No owner</span>
  }

  const ownerName = getOwnerName(row.original)

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    const empId = row.original.ownerEmployee?.id
    if (empId) {
      navigateTo(`/platform/employee-record?employeeId=${empId}`)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="gba:flex gba:items-center gba:gap-3 gba:cursor-pointer gba:group gba:bg-transparent gba:border-0 gba:p-0 gba:w-full gba:text-left gba:min-w-0"
      data-testid={`owner-link-${row.original.id}`}
    >
      <Avatar className="gba:w-8 gba:h-8 gba:flex-shrink-0 gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:transition-all">
        {row.original.ownerEmployee.pictureThumbnail && (
          <AvatarImage src={`data:image/gif;base64,${row.original.ownerEmployee.pictureThumbnail}`} alt={ownerName} />
        )}
        <AvatarFallback>{getOwnerInitials(ownerName)}</AvatarFallback>
      </Avatar>
      <div className="gba:min-w-0 gba:flex-1">
        <div
          className="gba:font-medium gba:truncate gba:text-sm gba:group-hover:gba:text-primary gba:transition-colors"
          title={ownerName}
        >
          {ownerName}
        </div>
      </div>
    </button>
  )
}

/**
 * Cell renderer: Investment Status cell
 */
export const InvestmentStatusCell = ({ row }: CellContext<Investment, unknown>) => (
  <Badge variant={getInvestmentStatusBadgeVariant(row.original.investmentStatus?.type)}>
    {row.original.investmentStatus?.value || 'Unknown'}
  </Badge>
)

/**
 * Cell renderer: Created At cell (uses acquisitionDate or createdAt)
 */
export const CreatedAtCell = ({ row }: CellContext<Investment, unknown>) => {
  const dateValue = row.original.acquisitionDate || (row.original as { createdAt?: string }).createdAt
  if (!dateValue) {
    return <span className="gba:text-sm gba:text-muted-foreground">No date</span>
  }
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:truncate">
      <CalendarIcon className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
      <span className="gba:text-sm gba:truncate">{formatDate(dateValue)}</span>
    </div>
  )
}

/**
 * Cell renderer: Acquisition Date cell
 */
export const AcquisitionDateCell = ({ row }: CellContext<Investment, unknown>) => {
  if (!row.original.acquisitionDate) {
    return <span className="gba:text-sm gba:text-muted-foreground">No date</span>
  }
  return (
    <div className="gba:flex gba:items-center gba:gap-2 gba:truncate">
      <CalendarIcon className="gba:h-4 gba:w-4 gba:text-gray-400 gba:shrink-0" />
      <span className="gba:text-sm gba:truncate">{formatDate(row.original.acquisitionDate)}</span>
    </div>
  )
}
