import { DeleteButton } from '@/business-apps/mdm/apps/generic-components/delete-button/DeleteButton.tsx'
import { Button, Badge } from '@newwork/nw-design-system'
import { ArrowsDownUpIcon, EyeIcon, PencilSimpleLineIcon } from '@phosphor-icons/react'
import { Column } from '@tanstack/react-table'
import { ReactNode } from 'react'

interface SortableHeaderProps {
  column: Column<any, any>
  children: ReactNode
}

/**
 * Reusable sortable header component for DataTable columns
 * Provides consistent styling and behavior across all table implementations
 */
export function SortableHeader({ column, children }: Readonly<SortableHeaderProps>) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
    >
      {children}
      <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
    </Button>
  )
}

/**
 * Standard actions column header with consistent width
 */
export const ActionsColumnHeader = () => <div className="gba:w-[115px]">Actions</div>

// ─── Cell Renderers ────────────────────────────────────────────────────────

/**
 * Badge cell renderer for displaying values in badges
 */
interface BadgeCellProps {
  value?: { name: string } | string | null
  variant?: 'info' | 'secondary' | 'outline' | 'success' | 'destructive'
}

export function BadgeCell({ value, variant = 'info' }: Readonly<BadgeCellProps>) {
  if (!value) {
    return <span className="gba:text-muted-foreground gba:text-sm">—</span>
  }

  const displayText = typeof value === 'string' ? value : value.name
  return <Badge variant={variant}>{displayText}</Badge>
}

/**
 * Simple text cell renderer
 */
interface TextCellProps {
  value: string | number
  className?: string
}

export function TextCell({ value, className = 'gba:font-normal' }: Readonly<TextCellProps>) {
  return <span className={className}>{value}</span>
}

/**
 * Description cell renderer with truncation and tooltip
 */
interface DescriptionCellProps {
  value?: string | null
}

export function DescriptionCell({ value }: Readonly<DescriptionCellProps>) {
  return value ? (
    <span className="gba:text-sm gba:text-muted-foreground gba:truncate gba:max-w-xs gba:block" title={value}>
      {value}
    </span>
  ) : (
    <span className="gba:text-muted-foreground gba:text-sm">—</span>
  )
}

/**
 * Status cell renderer for displaying active/inactive status
 */
interface StatusCellProps {
  isActive: boolean
  activeText?: string
  inactiveText?: string
}

export function StatusCell({ isActive, activeText = 'Active', inactiveText = 'Inactive' }: Readonly<StatusCellProps>) {
  return isActive ? <Badge variant="success">{activeText}</Badge> : <Badge variant="destructive">{inactiveText}</Badge>
}

/**
 * Hierarchy order cell renderer for job levels
 */
interface HierarchyOrderCellProps {
  value: number
}

export function HierarchyOrderCell({ value }: Readonly<HierarchyOrderCellProps>) {
  return (
    <div
      className="gba:text-center gba:font-mono gba:text-sm gba:w-[70px] gba:overflow-hidden"
      data-hierarchy-order-cell="true"
    >
      {value}
    </div>
  )
}

/**
 * Currency cell renderer for formatted currency display
 */
interface CurrencyCellProps {
  amount: number
  currencyCode?: string
  formatCurrency: (amount: number, currencyCode?: string) => string
}

export function CurrencyCell({ amount, currencyCode, formatCurrency }: Readonly<CurrencyCellProps>) {
  return <span>{formatCurrency(amount, currencyCode)}</span>
}

/**
 * Actions cell renderer with view, edit, and delete buttons
 */
interface ActionsCellProps {
  record: any
  dataTestId: string
  onView: (record: any) => void
  onEdit: (id: string) => void
  onDelete: (record: any) => Promise<any>
  itemNameGetter: (record: any) => string
  itemTitle: string
}

export function ActionsCell({
  record,
  dataTestId,
  onView,
  onEdit,
  onDelete,
  itemNameGetter,
  itemTitle
}: Readonly<ActionsCellProps>) {
  return (
    <div className="gba:flex gba:items-center gba:gap-1">
      <Button variant="ghost" size="sm" onClick={() => onView(record)} data-testid={`${dataTestId}-view-${record.id}`}>
        <EyeIcon className="gba:h-4 gba:w-4" />
      </Button>
      <Button
        size="sm"
        variant="ghost"
        onClick={e => {
          e.stopPropagation()
          onEdit(record.id)
        }}
        data-testid={`${dataTestId}-edit-${record.id}`}
      >
        <PencilSimpleLineIcon className="gba:h-4 gba:w-4" />
      </Button>
      <DeleteButton onDelete={() => onDelete(record)} itemName={itemNameGetter(record)} itemTitle={itemTitle} />
    </div>
  )
}
