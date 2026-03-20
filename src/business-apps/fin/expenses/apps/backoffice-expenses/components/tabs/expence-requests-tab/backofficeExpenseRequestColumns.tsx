import type { Key, ReactElement } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Checkbox } from '@newwork/nw-design-system'
import {
  createCurrencyColumn,
  createDateColumn,
  createFormatDate,
  createStatusBadgeColumn
} from '../../../common/columns/expenseColumnHelpers'
import type { ExpenseData } from '../../../types'
import type { ExpenseRequestActionHandlers } from '../../../types/expenseRequestActionHandlers'
import { formatCurrency } from '../../../utils/currencyUtils'
import { extractCurrencyCode } from '../../../utils/sharedUtils'
import { getExpenseRequestStatusDisplay, type TranslateFn } from '../../../utils/utils'
import ExpenseRequestTableActions from './components/ExpenseRequestTableActions'

export const BACKOFFICE_EXPENSE_REQUEST_TABLE_COLUMN_IDS = [
  'select',
  'actions',
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

export interface BackofficeExpenseRequestTableChrome extends ExpenseRequestActionHandlers {
  accessToken: string
  bookableRecordsCount: number
  allBookableSelected: boolean
  onSelectAllRecords: (checked: boolean) => void
  selectedRowKeys: Key[]
  onSelectRecord: (record: ExpenseData, checked: boolean) => void
  isTransferInProgress: (id: string) => boolean
}

/**
 * Renders a single-line truncated cell (matches legacy ExpenseRequestTableRow ellipsis behavior).
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
      accessorKey: 'employee',
      header: t('header-employee'),
      enableSorting: true,
      size: 200,
      minSize: 160,
      maxSize: 280,
      cell: ({ row }) => renderTruncatedCell(row.original.employee, `expense-request-employee-${row.original.id}`, na)
    },
    {
      id: 'employeeCode',
      accessorKey: 'employeeCode',
      header: t('header-employee-code'),
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
      header: t('header-sap-number'),
      enableSorting: false,
      size: 140,
      minSize: 100,
      maxSize: 180,
      cell: ({ row }) =>
        renderTruncatedCell(row.original.sapNumber, `expense-request-sap-number-${row.original.id}`, na)
    },
    {
      id: 'requestNumber',
      accessorKey: 'code',
      header: t('header-request-number'),
      enableSorting: true,
      size: 140,
      minSize: 100,
      maxSize: 200,
      cell: ({ row }) => renderTruncatedCell(row.original.code, `expense-request-code-${row.original.id}`, na)
    },
    {
      id: 'title',
      accessorKey: 'title',
      header: t('header-title'),
      enableSorting: true,
      size: 200,
      minSize: 160,
      maxSize: 320,
      cell: ({ row }) => renderTruncatedCell(row.original.title, `expense-request-title-${row.original.id}`, na)
    },
    createDateColumn<ExpenseData>('startDate', t('header-start-date'), 'startDate', { formatDate }),
    createDateColumn<ExpenseData>('endDate', t('header-end-date'), 'endDate', { formatDate }),
    createDateColumn<ExpenseData>('createdAt', t('header-creation-date'), row => row.creationDate, { formatDate }),
    createStatusBadgeColumn<ExpenseData>(
      'status',
      t('header-status'),
      row => getExpenseRequestStatusDisplay(row.status, t),
      {
        getRowTestId: row => `expense-request-status-${row.id}`,
        cellWrapperClassName:
          'gba:overflow-hidden gba:text-ellipsis gba:whitespace-nowrap gba:w-full gba:flex gba:justify-center'
      }
    ),
    {
      id: 'totalRemainingAmount',
      accessorKey: 'totalRemainingAmount',
      header: t('header-remaining-amount'),
      enableSorting: true,
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
      row => row.reimbursableAmount ?? 0,
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

/**
 * Full column set: bulk-select, row actions, then data columns (for {@link ExpenseDataTable}).
 */
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
        <div className="gba:flex gba:items-center gba:justify-center" onClick={e => e.stopPropagation()}>
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

  const actionsColumn: ColumnDef<ExpenseData> = {
    id: 'actions',
    header: t('header-actions'),
    enableSorting: false,
    size: 60,
    minSize: 60,
    maxSize: 60,
    cell: ({ row }) => (
      <ExpenseRequestTableActions
        record={row.original}
        accessToken={chrome.accessToken}
        transferInProgress={chrome.isTransferInProgress(row.original.id)}
        onNavigateToExpenseRequest={chrome.onNavigateToExpenseRequest}
        onDownloadAccountingNote={chrome.onDownloadAccountingNote}
        onTriggerCSV={chrome.onTriggerCSV}
        onPrintExpenseRequest={chrome.onPrintExpenseRequest}
        onTransferPayment={chrome.onTransferPayment}
      />
    )
  }

  return [selectColumn, actionsColumn, ...createBackofficeExpenseRequestDataColumns(t)]
}
