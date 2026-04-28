import type { ReactElement } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@newwork/nw-design-system'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import type { AdvancePaymentItem } from '../../../../types'
import { getAdvancePaymentStatusDisplay, type StatusDisplayConfig, type TranslateFn } from '../../../../utils/utils'

function renderTruncatedCell(value: string | undefined, testId: string, notAvailableLabel: string): ReactElement {
  const display = value?.trim() ? value : notAvailableLabel
  const title = value?.trim() ? value : ''
  return (
    <div className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap" title={title} data-testid={testId}>
      {display}
    </div>
  )
}

function getPaymentMethodLabel(paymentMethod: string | undefined, t: TranslateFn): string {
  if (paymentMethod === 'DIRECT_DEPOSIT') {
    return t('advance-payment-direct-deposit')
  }
  if (paymentMethod) {
    return t('advance-payment-cash')
  }
  return t('common-not-available')
}

function getRowCurrencyCode(row: AdvancePaymentItem): string {
  return row.currency?.code || row.expensePlan?.currency?.code || ''
}

/**
 * Prefer HR organizational unit name when present; otherwise fall back to position cost center so the column is not all N/A when OU is unset in master data.
 */
function getAdvancePaymentOrgUnitLabel(row: AdvancePaymentItem): string | undefined {
  const position = row.expensePlan?.employee?.employeePosition
  const ouName = position?.organizationalUnit?.name?.trim()
  if (ouName) {
    return ouName
  }
  const ccName = position?.costCenter?.name?.trim()
  return ccName || undefined
}

/** Data columns for backoffice advance payments (TanStack / DataTable). Row actions are wired via DataTable `actions`. */
export function createBackofficeAdvancePaymentDataColumns(t: TranslateFn): ColumnDef<AdvancePaymentItem>[] {
  const na = t('common-not-available')

  return [
    {
      id: 'title',
      accessorFn: (row: AdvancePaymentItem) => row.title ?? row.description ?? null,
      header: t('header-title'),
      enableSorting: true,
      size: 200,
      minSize: 160,
      maxSize: 320,
      cell: ({ row }) => (
        <div data-testid="advance-payment-title-cell">
          {renderTruncatedCell(
            row.original.title || row.original.description,
            `advance-payment-title-${row.original.id}`,
            na
          )}
        </div>
      )
    },
    {
      id: 'employee',
      accessorFn: (row: AdvancePaymentItem) => row.employeeFullName ?? null,
      header: t('header-employee'),
      enableSorting: true,
      size: 200,
      minSize: 160,
      maxSize: 280,
      cell: ({ row }) => (
        <div data-testid="advance-payment-reporter-cell">
          {renderTruncatedCell(row.original.employeeFullName, `advance-payment-employee-${row.original.id}`, na)}
        </div>
      )
    },
    {
      id: 'orgUnit',
      accessorKey: 'id',
      header: t('header-org-unit'),
      enableSorting: true,
      sortDescFirst: false,
      size: 240,
      minSize: 200,
      maxSize: 360,
      cell: ({ row }) => (
        <div data-testid="advance-payment-org-unit-cell">
          {renderTruncatedCell(
            getAdvancePaymentOrgUnitLabel(row.original),
            `advance-payment-org-unit-${row.original.id}`,
            na
          )}
        </div>
      )
    },
    {
      id: 'costCenter',
      accessorFn: (row: AdvancePaymentItem) => row.costCenter?.name ?? null,
      header: t('header-cost-center'),
      enableSorting: true,
      size: 160,
      minSize: 120,
      maxSize: 240,
      cell: ({ row }) => (
        <div data-testid="advance-payment-cost-center-cell">
          {renderTruncatedCell(row.original.costCenter?.name, `advance-payment-cost-center-${row.original.id}`, na)}
        </div>
      )
    },
    {
      id: 'planId',
      accessorFn: (row: AdvancePaymentItem) => row.expensePlan?.code ?? null,
      header: t('header-plan-id'),
      enableSorting: true,
      size: 140,
      minSize: 100,
      maxSize: 200,
      cell: ({ row }) => (
        <div data-testid="advance-payment-plan-id-cell">
          {renderTruncatedCell(row.original.expensePlan?.code, `advance-payment-plan-id-${row.original.id}`, na)}
        </div>
      )
    },
    {
      id: 'status',
      accessorFn: (row: AdvancePaymentItem) => row.status,
      header: t('header-status'),
      enableSorting: true,
      size: 140,
      minSize: 120,
      maxSize: 200,
      cell: ({ row }) => {
        const status = getAdvancePaymentStatusDisplay(row.original.status || na, t)
        return (
          <div data-testid="advance-payment-status-cell">
            <Badge variant={(status as StatusDisplayConfig).badgeVariant || 'outline'}>{status.label}</Badge>
          </div>
        )
      }
    },
    {
      id: 'amount',
      accessorFn: (row: AdvancePaymentItem) => row.expensePlan?.totalAmount ?? null,
      header: t('header-amount'),
      enableSorting: true,
      sortDescFirst: false,
      size: 140,
      minSize: 120,
      maxSize: 200,
      cell: ({ row }) => {
        const code = getRowCurrencyCode(row.original)
        return (
          <span data-testid="advance-payment-amount-cell" className="gba:block gba:text-right">
            {formatNumberFunction(String(row.original.expensePlan?.totalAmount ?? '0'))} {code}
          </span>
        )
      }
    },
    {
      id: 'advance',
      accessorFn: (row: AdvancePaymentItem) => row.amount ?? null,
      header: t('header-advance'),
      enableSorting: true,
      sortDescFirst: false,
      size: 140,
      minSize: 120,
      maxSize: 200,
      cell: ({ row }) => {
        const code = getRowCurrencyCode(row.original)
        return (
          <span data-testid="advance-payment-advance-cell" className="gba:block gba:text-right">
            {formatNumberFunction(String(row.original.amount ?? '0'))} {code}
          </span>
        )
      }
    },
    {
      id: 'paymentMethod',
      accessorFn: (row: AdvancePaymentItem) => row.paymentMethod ?? null,
      header: t('header-payment-method'),
      enableSorting: true,
      size: 160,
      minSize: 120,
      maxSize: 220,
      cell: ({ row }) => (
        <div data-testid="advance-payment-method-cell">{getPaymentMethodLabel(row.original.paymentMethod, t)}</div>
      )
    }
  ]
}
