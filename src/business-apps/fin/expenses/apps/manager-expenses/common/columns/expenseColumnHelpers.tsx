import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ensureShortDateFormat } from '../../utils/dateUtils'
import { formatCurrencyDisplay } from '../../../personal-expenses/utils'

const NOT_AVAILABLE = 'lowcoder:common.not_available'
const NOT_AVAILABLE_LABEL = 'N/A'

export const naLabel = () => getTranslationFromI18nKeyAndLabel(NOT_AVAILABLE, NOT_AVAILABLE_LABEL)

export function createFormatDate() {
  return (v: string | null | undefined) => (v ? ensureShortDateFormat(v) : naLabel())
}

export function createFormatCurrency(currencyFilter: string | null) {
  return (amount: number, currency: string) => formatCurrencyDisplay(amount, currencyFilter ?? currency ?? 'EUR')
}

export function renderTitleCodeCell(
  title: string | null | undefined,
  code: string | null | undefined,
  testId: string,
  titleFallback?: string
): React.ReactElement {
  return (
    <div>
      <div className="gba:font-medium gba:text-sm gba:whitespace-nowrap gba:truncate" data-testid={testId}>
        {title ?? titleFallback ?? naLabel()}
      </div>
      <div className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap gba:truncate">
        {code ?? naLabel()}
      </div>
    </div>
  )
}

export function renderCodeCell(code: string | null | undefined): React.ReactElement {
  return <span className="gba:text-sm">{code ?? naLabel()}</span>
}

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info'
  | 'offline'

export interface StatusDisplayConfig {
  label: string
  badgeVariant?: BadgeVariant
}

export interface EmployeeLike {
  displayName?: string | null
  fullName?: string
  pictureThumbnail?: string | null
}

export interface DateColumnOptions {
  formatDate?: (value: string | null | undefined) => string
}

const defaultFormatDate = (v: string | null | undefined): string =>
  v
    ? new Date(v).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })
    : getTranslationFromI18nKeyAndLabel(NOT_AVAILABLE, NOT_AVAILABLE_LABEL)

/**
 * Creates a date column that displays formatted dates with a consistent fallback.
 */
export function createDateColumn<T extends object>(
  id: string,
  header: string,
  accessor: (keyof T & string) | ((row: T) => string | null | undefined),
  options?: DateColumnOptions
): ColumnDef<T> {
  const formatDate = options?.formatDate ?? defaultFormatDate
  const hasFn = typeof accessor === 'function'
  return {
    id,
    ...(hasFn ? { accessorFn: accessor as (row: T) => string | null | undefined } : { accessorKey: accessor }),
    header,
    enableSorting: true,
    size: 110,
    minSize: 90,
    maxSize: 150,
    cell: ({ row }) => {
      const value = hasFn
        ? (accessor as (row: T) => string | null | undefined)(row.original)
        : (row.original as Record<string, string | null | undefined>)[accessor]
      return (
        <span className="gba:text-sm" data-testid={`${id}-${(row.original as { id?: string }).id ?? row.index}`}>
          {formatDate(value ?? null)}
        </span>
      )
    }
  }
}

/**
 * Creates an employee column with avatar and display name.
 */
export function createEmployeeColumn<T extends object>(
  id: string,
  header: string,
  getEmployee: (row: T) => EmployeeLike | null | undefined
): ColumnDef<T> {
  return {
    id,
    accessorFn: getEmployee,
    header,
    enableSorting: true,
    size: 200,
    minSize: 160,
    maxSize: 280,
    cell: ({ row }) => {
      const employee = getEmployee(row.original)
      if (!employee) {
        return (
          <span className="gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel(NOT_AVAILABLE, NOT_AVAILABLE_LABEL)}
          </span>
        )
      }
      const imageUrl = employee.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined
      const displayName =
        employee.displayName ??
        employee.fullName ??
        getTranslationFromI18nKeyAndLabel(NOT_AVAILABLE, NOT_AVAILABLE_LABEL)
      const initial = displayName.charAt(0).toUpperCase()
      return (
        <div className="gba:flex gba:items-center gba:gap-2">
          <Avatar className="gba:h-6 gba:w-6">
            <AvatarImage src={imageUrl} alt={displayName} />
            <AvatarFallback>{initial}</AvatarFallback>
          </Avatar>
          <span className="gba:font-medium gba:text-sm">{displayName}</span>
        </div>
      )
    }
  }
}

/**
 * Creates a currency column. Pass formatCurrency to use app-specific formatting.
 */
export function createCurrencyColumn<T extends object>(
  id: string,
  header: string,
  getAmount: (row: T) => number,
  getCurrency: (row: T) => string,
  formatCurrency: (amount: number, currency: string) => string
): ColumnDef<T> {
  return {
    id,
    accessorFn: getAmount,
    header,
    enableSorting: true,
    size: 130,
    minSize: 100,
    maxSize: 180,
    meta: { align: 'right' as const },
    cell: ({ row }) => (
      <span className="gba:font-medium gba:text-sm gba:text-right gba:block">
        {formatCurrency(getAmount(row.original), getCurrency(row.original))}
      </span>
    )
  }
}

/**
 * Creates a status column that renders a Badge from a status display config.
 * Width aligned with personal expenses: narrow default, min/max for long translations (e.g. German).
 */
export function createStatusBadgeColumn<T extends object>(
  id: string,
  header: string,
  getStatusDisplay: (row: T) => StatusDisplayConfig
): ColumnDef<T> {
  return {
    id,
    accessorFn: (row: T) => getStatusDisplay(row).label,
    header,
    enableSorting: true,
    size: 150,
    minSize: 160,
    maxSize: 250,
    cell: ({ row }) => {
      const display = getStatusDisplay(row.original)
      return (
        <span className="gba:inline-block gba:whitespace-nowrap">
          <Badge
            variant={display.badgeVariant ?? 'outline'}
            data-testid={`status-pill-${String(display.label).toLowerCase().replace(/\s/g, '-')}`}
          >
            {display.label}
          </Badge>
        </span>
      )
    }
  }
}
