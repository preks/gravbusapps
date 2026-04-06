import React from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay, DEFAULT_CURRENCY_CODE } from '../utils/formatCurrency'

const NOT_AVAILABLE = 'lowcoder:common.not_available'
const NOT_AVAILABLE_LABEL = 'N/A'

export const naLabel = () => getTranslationFromI18nKeyAndLabel(NOT_AVAILABLE, NOT_AVAILABLE_LABEL)

export function createFormatDate(
  formatFn?: (value: string | null | undefined) => string
): (v: string | null | undefined) => string {
  if (formatFn) return formatFn
  return (v: string | null | undefined) =>
    v ? new Date(v).toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' }) : naLabel()
}

export function createFormatCurrency(currencyFilter: string | null) {
  return (amount: number, currency: string) => {
    const code = currencyFilter ?? currency ?? DEFAULT_CURRENCY_CODE
    return formatCurrencyDisplay(amount, code)
  }
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
  sortDescFirst?: boolean
}

export function createDateColumn<T extends object>(
  id: string,
  header: string,
  accessor: (keyof T & string) | ((row: T) => string | null | undefined),
  options?: DateColumnOptions
): ColumnDef<T> {
  const formatDate = options?.formatDate ?? createFormatDate()
  const hasFn = typeof accessor === 'function'
  const accessorFn = hasFn
    ? (accessor as (row: T) => string | null | undefined)
    : (row: T) => (row as Record<string, string | null | undefined>)[accessor] ?? null

  return {
    id,
    accessorFn,
    header,
    enableSorting: true,
    ...(options?.sortDescFirst === undefined ? {} : { sortDescFirst: options.sortDescFirst }),
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

type NotAvailableFn = () => string

export function createEmployeeColumn<T extends object>(
  id: string,
  header: string,
  getEmployee: (row: T) => EmployeeLike | null | undefined,
  notAvailableLabel?: NotAvailableFn
): ColumnDef<T> {
  const emptyLabel = notAvailableLabel ?? naLabel
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
        return <span className="gba:text-sm gba:text-muted-foreground">{emptyLabel()}</span>
      }
      const imageUrl = employee.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined
      const displayName = employee.displayName ?? employee.fullName ?? emptyLabel()
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

export interface CurrencyColumnOptions<T> {
  getRowTestId?: (row: T) => string
  size?: number
  minSize?: number
  maxSize?: number
}

export function createCurrencyColumn<T extends object>(
  id: string,
  header: string,
  getAmount: (row: T) => number,
  getCurrency: (row: T) => string,
  formatCurrency: (amount: number, currency: string) => string,
  options?: CurrencyColumnOptions<T>
): ColumnDef<T> {
  return {
    id,
    accessorFn: getAmount,
    header,
    enableSorting: true,
    size: options?.size ?? 130,
    minSize: options?.minSize ?? 100,
    maxSize: options?.maxSize ?? 180,
    meta: { align: 'right' as const },
    cell: ({ row }) => {
      const testId = options?.getRowTestId?.(row.original)
      return (
        <span
          className="gba:font-medium gba:text-sm gba:text-right gba:block"
          {...(testId ? { 'data-testid': testId } : {})}
        >
          {formatCurrency(getAmount(row.original), getCurrency(row.original))}
        </span>
      )
    }
  }
}

export interface StatusBadgeColumnOptions<T> {
  getRowTestId?: (row: T) => string
  cellWrapperClassName?: string
}

export function createStatusBadgeColumn<T extends object>(
  id: string,
  header: string,
  getStatusDisplay: (row: T) => StatusDisplayConfig,
  options?: StatusBadgeColumnOptions<T>
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
      const defaultTestId = `status-pill-${String(display.label).toLowerCase().replace(/\s/g, '-')}`
      const testId = options?.getRowTestId?.(row.original) ?? defaultTestId
      const badge = (
        <Badge variant={display.badgeVariant ?? 'outline'} data-testid={testId}>
          {display.label}
        </Badge>
      )
      if (options?.cellWrapperClassName) {
        return <div className={options.cellWrapperClassName}>{badge}</div>
      }
      return <span className="gba:inline-block gba:whitespace-nowrap">{badge}</span>
    }
  }
}
