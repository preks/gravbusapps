import type { Key, ReactElement } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@newwork/nw-design-system'
import {
  createCurrencyColumn,
  createDateColumn,
  createFormatDate,
  createStatusBadgeColumn,
  expenseTableColumnHeader
} from '../../../../common/columns/expenseColumnHelpers'
import type { ExpenseData } from '../../../../types'
import { formatCurrency } from '../../../../utils/currencyUtils'
import { extractCurrencyCode } from '../../../../utils/sharedUtils'
import { getExpenseRequestStatusDisplay, type TranslateFn } from '../../../../utils/utils'

export const BACKOFFICE_EXPENSE_REQUEST_TABLE_COLUMN_IDS = [
  'select',
  'employee',
  'employeeCode',
  'sapNumber',
  'requestNumber',
  'title',
  'startDate',
  'endDate',
  'createdAt',
  'status',
  'totalRemainingAmount',
  'totalAmount'
] as const

export interface BackofficeExpenseRequestTableChrome {
  bookableRecordsCount: number
  allBookableSelected: boolean
  onSelectAllRecords: (checked: boolean) => void
  selectedRowKeys: Key[]
  onSelectRecord: (record: ExpenseData, checked: boolean) => void
}

/**
 * Renders a single-line truncated cell for table text fields.
 */
function renderTruncatedCell(value: string | undefined, testId: string, notAvailableLabel: string): ReactElement {
  const display = value?.trim() ? value : notAvailableLabel
  const title = value?.trim() ? value : ''
  return (
    <div className="gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap" title={title} data-testid={testId}>
      {display}
    </div>
  )
}

function getRowCurrencyCode(row: ExpenseData): string {
  return extractCurrencyCode(row.currency?.code ?? '') ?? 'EUR'
}

/** Wider tracks so date headers (and values) are not clipped next to sort/pin controls. */
const EXPENSE_REQUEST_DATE_COLUMN_WIDTH = {
  size: 168,
  minSize: 152,
  maxSize: 240
} as const

/**
 * Data columns for the backoffice expense requests list (TanStack / DataTable).
 * Selection and row-action columns are composed in the table when wiring DataTable.
 */
export function createBackofficeExpenseRequestDataColumns(t: TranslateFn): ColumnDef<ExpenseData>[] {
  const formatDate = createFormatDate(t)
  const na = t('common-not-available')

  return [
    {
      id: 'employee',
      accessorFn: (row: ExpenseData) => row.employee,
      header: expenseTableColumnHeader(t('header-employee')),
      enableSorting: true,
      size: 200,
      minSize: 160,
      maxSize: 280,
      cell: ({ row }) => renderTruncatedCell(row.original.employee, `expense-request-employee-${row.original.id}`, na)
    },
    {
      id: 'employeeCode',
      accessorFn: (row: ExpenseData) => row.employeeCode,
      header: expenseTableColumnHeader(t('header-employee-code')),
      enableSorting: true,
      size: 140,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) =>
        renderTruncatedCell(row.original.employeeCode, `expense-request-employee-code-${row.original.id}`, na)
    },
    {
      id: 'sapNumber',
      accessorKey: 'sapNumber',
      header: expenseTableColumnHeader(t('header-sap-number')),
      enableSorting: false,
      size: 140,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) =>
        renderTruncatedCell(row.original.sapNumber, `expense-request-sap-number-${row.original.id}`, na)
    },
    {
      id: 'requestNumber',
      accessorFn: (row: ExpenseData) => row.code,
      header: expenseTableColumnHeader(t('header-request-number')),
      enableSorting: true,
      size: 140,
      minSize: 100,
      maxSize: 200,
      cell: ({ row }) => renderTruncatedCell(row.original.code, `expense-request-code-${row.original.id}`, na)
    },
    {
      id: 'title',
      accessorFn: (row: ExpenseData) => row.title,
      header: expenseTableColumnHeader(t('header-title')),
      enableSorting: true,
      size: 200,
      minSize: 160,
      maxSize: 320,
      cell: ({ row }) => renderTruncatedCell(row.original.title, `expense-request-title-${row.original.id}`, na)
    },
    createDateColumn<ExpenseData>('startDate', t('header-start-date'), 'startDate', {
      formatDate,
      ...EXPENSE_REQUEST_DATE_COLUMN_WIDTH
    }),
    createDateColumn<ExpenseData>('endDate', t('header-end-date'), 'endDate', {
      formatDate,
      ...EXPENSE_REQUEST_DATE_COLUMN_WIDTH
    }),
    createDateColumn<ExpenseData>('createdAt', t('header-creation-date'), row => row.creationDate, {
      formatDate,
      sortDescFirst: true,
      ...EXPENSE_REQUEST_DATE_COLUMN_WIDTH
    }),
    createStatusBadgeColumn<ExpenseData>(
      'status',
      t('header-status'),
      row => getExpenseRequestStatusDisplay(row.status, t),
      {
        getRowTestId: row => `expense-request-status-${row.id}`,
        cellWrapperClassName:
          'gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap gba:w-full gba:flex gba:items-center',
        size: 200,
        minSize: 180,
        maxSize: 320
      }
    ),
    {
      id: 'totalRemainingAmount',
      accessorFn: (row: ExpenseData) => row.totalRemainingAmount,
      header: expenseTableColumnHeader(t('header-remaining-amount')),
      enableSorting: true,
      sortDescFirst: false,
      size: 150,
      minSize: 120,
      maxSize: 200,
      meta: { align: 'right' as const },
      cell: ({ row }) => {
        const remainingAmount = Number(row.original.totalRemainingAmount) || 0
        const currencyCode = getRowCurrencyCode(row.original)
        const content = remainingAmount > 0 ? formatCurrency(remainingAmount, currencyCode) : '-'
        return (
          <span
            className="gba:text-right gba:block"
            data-testid={`expense-request-remaining-amount-${row.original.id}`}
          >
            {content}
          </span>
        )
      }
    },
    createCurrencyColumn<ExpenseData>(
      'totalAmount',
      t('header-total-amount'),
      row => row.totalAmount ?? 0,
      getRowCurrencyCode,
      (amount, currency) => formatCurrency(amount, currency),
      {
        getRowTestId: row => `expense-request-total-amount-${row.id}`,
        size: 160,
        minSize: 120,
        maxSize: 220
      }
    )
  ]
}

/** Full column set: bulk-select + data columns. Row actions are wired via DataTable `actions` prop. */
export function createBackofficeExpenseRequestColumns(
  t: TranslateFn,
  chrome: BackofficeExpenseRequestTableChrome
): ColumnDef<ExpenseData>[] {
  const selectColumn: ColumnDef<ExpenseData> = {
    id: 'select',
    header: () =>
      chrome.bookableRecordsCount > 0 ? (
        <div className="gba:flex gba:items-center gba:justify-center">
          <Checkbox
            checked={chrome.allBookableSelected}
            onCheckedChange={value => chrome.onSelectAllRecords(value === true)}
            data-testid="select-all-records-checkbox"
            className="gba:cursor-pointer"
          />
        </div>
      ) : null,
    enableSorting: false,
    size: 50,
    minSize: 50,
    maxSize: 50,
    cell: ({ row }) => {
      const record = row.original
      if (record.status !== 'BOOKED') {
        return <span className="gba:block gba:w-6" />
      }
      return (
        <div
          className="gba:flex gba:items-center gba:justify-center"
          onClick={e => e.stopPropagation()}
          onKeyDown={e => e.stopPropagation()}
        >
          <Checkbox
            checked={chrome.selectedRowKeys.includes(record.id)}
            onCheckedChange={value => chrome.onSelectRecord(record, value === true)}
            data-testid={`select-record-checkbox-${record.id}`}
            className="gba:cursor-pointer"
          />
        </div>
      )
    }
  }

  return [selectColumn, ...createBackofficeExpenseRequestDataColumns(t)]
}
