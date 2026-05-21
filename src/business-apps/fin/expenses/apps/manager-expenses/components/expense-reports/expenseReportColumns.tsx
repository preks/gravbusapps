/** Manager expense report table/export columns (Fluent `managerT` keys). */
import type { ColumnDef } from '@tanstack/react-table'
import {
  createCurrencyColumn,
  createDateColumn,
  createFormatCurrency,
  createStatusBadgeColumn
} from '../../common/columns/expenseColumnHelpers'
import type { StatusDisplayConfig } from '../../utils'
import {
  getAdvancePaymentStatusDisplayT,
  getExpenseItemStatusDisplayT,
  getExpensePlanStatusDisplayT,
  getExpenseRequestStatusDisplayT
} from '../../utils'
import type {
  AdvancePaymentReport,
  ExpenseItemReport,
  ExpensePlanReport,
  ExpenseRequestReport,
  ReportItem
} from '../../hooks/useExpenseReportData'
import { ReportType } from '../../hooks/useExpenseReportData'
import { formatPaymentMethodForExpenseTables } from '../../../../common/utils/paymentMethodListDisplay'

const sortOff = { enableSorting: false as const }

/** Empty / missing values in manager expense *reports* only (not other tables). */
const REPORT_DASH = '-'

function createReportFormatDate() {
  return (v: string | null | undefined) => {
    if (v == null || !String(v).trim()) {
      return REPORT_DASH
    }
    const d = new Date(v)
    if (Number.isNaN(d.getTime())) {
      return REPORT_DASH
    }
    return d.toLocaleDateString(undefined, { day: '2-digit', month: '2-digit', year: '2-digit' })
  }
}

function renderReportTitleCell(title: string | null | undefined, testId: string) {
  const text = title?.trim() ? title : REPORT_DASH
  return (
    <span
      className="gba:font-medium gba:text-sm gba:min-w-0 gba:truncate gba:block"
      data-testid={testId}
      title={text === REPORT_DASH ? undefined : text}
    >
      {text}
    </span>
  )
}

function renderReportCodeCell(code: string | null | undefined, dataTestId?: string) {
  const v = code?.trim() ? code : REPORT_DASH
  return (
    <span
      className="gba:text-sm gba:min-w-0 gba:truncate gba:block"
      data-testid={dataTestId}
      title={v === REPORT_DASH ? undefined : v}
    >
      {v}
    </span>
  )
}

function createReportEmployeeNameColumn<T extends { id: string; employeeName?: string }>(
  id: string,
  header: string
): ColumnDef<T> {
  return {
    id,
    accessorFn: (row: T) => row.employeeName ?? null,
    header,
    ...sortOff,
    /** Kept moderate; `ExpenseDataTable` uses `tableLayout="auto"` on reports so width follows content. */
    minSize: 100,
    size: 120,
    maxSize: 200,
    meta: { className: 'gba:min-w-0' },
    cell: ({ row }) => {
      const name = row.original.employeeName?.trim()
      if (!name) {
        return <span className="gba:text-sm gba:text-muted-foreground">{REPORT_DASH}</span>
      }
      return (
        <span
          className="gba:block gba:min-w-0 gba:truncate gba:font-medium gba:text-sm"
          data-testid={`expense-reports-employee-${row.original.id}`}
          title={name}
        >
          {name}
        </span>
      )
    }
  }
}

type ReportTestIdGroup = 'item' | 'plan' | 'request' | 'advance'

function createManagerReportTitleColumn<Row extends { id: string; title?: string | null }>(
  testGroup: ReportTestIdGroup,
  titleHeader: string
): ColumnDef<Row> {
  return {
    id: 'title',
    accessorKey: 'title',
    header: titleHeader,
    ...sortOff,
    minSize: 160,
    maxSize: 320,
    size: 200,
    meta: { className: 'gba:min-w-0' },
    cell: ({ row }) =>
      renderReportTitleCell(row.original.title, `expense-reports-${testGroup}-title-${row.original.id}`)
  }
}

type CodeColumnSize = { minSize: number; size: number; maxSize?: number }

function createManagerReportStringCodeColumn<Row, K extends string>({
  id,
  accessorKey,
  header,
  getCode,
  getTestId,
  size
}: {
  id: K
  accessorKey: K
  header: string
  getCode: (row: Row) => string | null | undefined
  getTestId: (rowId: string) => string
  size: CodeColumnSize
}): ColumnDef<Row> {
  return {
    id,
    accessorKey,
    header,
    ...sortOff,
    minSize: size.minSize,
    size: size.size,
    ...(size.maxSize != null ? { maxSize: size.maxSize } : {}),
    meta: { className: 'gba:min-w-0' },
    cell: ({ row }) => {
      const original = row.original as Row
      return renderReportCodeCell(getCode(original), getTestId((original as { id: string }).id))
    }
  }
}

function createManagerReportStatusColumn<Row extends { id: string; status?: string }>(
  statusHeader: string,
  resolveStatus: (status: string) => StatusDisplayConfig
): ColumnDef<Row> {
  return createStatusBadgeColumn<Row>(
    'status',
    statusHeader,
    row => {
      const raw = row.status?.trim()
      if (!raw) {
        return { label: REPORT_DASH, type: 'draft', badgeVariant: 'outline' }
      }
      return resolveStatus(raw)
    },
    sortOff
  )
}

const DEFAULT_CODE_SIZES: CodeColumnSize = { minSize: 100, size: 120, maxSize: 180 }

/** "Submission Date" and similar: extra width so the header does not run under sort/pin controls. */
const MANAGER_REPORT_SUBMISSION_DATE_SIZES = {
  minSize: 156,
  size: 176,
  maxSize: 260,
  meta: { className: 'gba:min-w-0' }
} as const

export function createExpenseReportTableColumns(
  reportType: ReportType,
  managerT: (key: string) => string
): ColumnDef<ReportItem>[] {
  const formatDate = createReportFormatDate()
  const formatCurrency = createFormatCurrency(null)
  const titleHeader = managerT('expense-reports-column-title')
  const statusHeader = managerT('filter-status-group-title')
  const employeeHeader = managerT('expense-reports-column-employee')
  const submissionHeader = managerT('expense-reports-column-submission-date')
  const requestNumberHeader = managerT('expense-reports-column-request-number')
  const codeHeader = managerT('expense-reports-column-code')
  const amountHeader = managerT('expense-reports-column-amount')
  const totalAmountHeader = managerT('expense-reports-column-total-amount')
  const categoryHeader = managerT('expense-reports-column-category')
  const startDateHeader = managerT('expense-reports-column-start-date')
  const endDateHeader = managerT('expense-reports-column-end-date')
  const paymentMethodHeader = managerT('expense-reports-column-payment-method')
  const costCenterHeader = managerT('expense-reports-column-cost-center')

  const asItemColumns = (cols: ColumnDef<ExpenseItemReport>[]) => cols as ColumnDef<ReportItem>[]
  const asPlanColumns = (cols: ColumnDef<ExpensePlanReport>[]) => cols as ColumnDef<ReportItem>[]
  const asRequestColumns = (cols: ColumnDef<ExpenseRequestReport>[]) => cols as ColumnDef<ReportItem>[]
  const asAdvanceColumns = (cols: ColumnDef<AdvancePaymentReport>[]) => cols as ColumnDef<ReportItem>[]

  switch (reportType) {
    case ReportType.EXPENSE_ITEM:
      return asItemColumns([
        createManagerReportTitleColumn<ExpenseItemReport>('item', titleHeader),
        createManagerReportStringCodeColumn<ExpenseItemReport, 'code'>({
          id: 'code',
          accessorKey: 'code',
          header: requestNumberHeader,
          getCode: r => r.code,
          getTestId: id => `expense-reports-item-code-${id}`,
          size: DEFAULT_CODE_SIZES
        }),
        createReportEmployeeNameColumn<ExpenseItemReport>('employeeName', employeeHeader),
        createDateColumn<ExpenseItemReport>('date', submissionHeader, 'date', {
          formatDate,
          ...sortOff,
          ...MANAGER_REPORT_SUBMISSION_DATE_SIZES
        }),
        createCurrencyColumn<ExpenseItemReport>(
          'amount',
          amountHeader,
          row => (typeof row.amount === 'number' ? row.amount : 0),
          row => row.currency ?? 'EUR',
          formatCurrency,
          {
            ...sortOff,
            getRowTestId: r => `expense-reports-cell-amount-${r.id}`,
            alignAmountHeaderWithTextColumns: true
          }
        ),
        {
          id: 'category',
          accessorKey: 'category',
          header: categoryHeader,
          ...sortOff,
          cell: ({ row }) => {
            const text = row.original.category?.trim() || REPORT_DASH
            return (
              <span
                className="gba:text-sm gba:min-w-0 gba:truncate gba:block"
                data-testid={`expense-reports-cell-category-${row.original.id}`}
                title={text === REPORT_DASH ? undefined : text}
              >
                {text}
              </span>
            )
          }
        },
        createManagerReportStatusColumn<ExpenseItemReport>(statusHeader, s => getExpenseItemStatusDisplayT(managerT, s))
      ])
    case ReportType.EXPENSE_PLAN:
      return asPlanColumns([
        createManagerReportTitleColumn<ExpensePlanReport>('plan', titleHeader),
        createManagerReportStringCodeColumn<ExpensePlanReport, 'code'>({
          id: 'code',
          accessorKey: 'code',
          header: codeHeader,
          getCode: r => r.code,
          getTestId: id => `expense-reports-plan-code-${id}`,
          size: DEFAULT_CODE_SIZES
        }),
        createManagerReportStringCodeColumn<ExpensePlanReport, 'expenseRequestCode'>({
          id: 'expenseRequestCode',
          accessorKey: 'expenseRequestCode',
          header: requestNumberHeader,
          getCode: r => r.expenseRequestCode,
          getTestId: id => `expense-reports-plan-request-code-${id}`,
          size: { minSize: 100, size: 120 }
        }),
        createCurrencyColumn<ExpensePlanReport>(
          'totalAmount',
          totalAmountHeader,
          row => (typeof row.totalAmount === 'number' ? row.totalAmount : 0),
          row => row.currency ?? 'EUR',
          formatCurrency,
          {
            ...sortOff,
            getRowTestId: r => `expense-reports-plan-total-amount-${r.id}`,
            alignAmountHeaderWithTextColumns: true
          }
        ),
        createReportEmployeeNameColumn<ExpensePlanReport>('employeeName', employeeHeader),
        createDateColumn<ExpensePlanReport>('createdAt', submissionHeader, 'createdAt', {
          formatDate,
          ...sortOff,
          ...MANAGER_REPORT_SUBMISSION_DATE_SIZES
        }),
        createManagerReportStatusColumn<ExpensePlanReport>(statusHeader, s =>
          getExpensePlanStatusDisplayT(managerT, s)
        ),
        createDateColumn<ExpensePlanReport>('startDate', startDateHeader, 'startDate', { formatDate, ...sortOff }),
        createDateColumn<ExpensePlanReport>('endDate', endDateHeader, 'endDate', { formatDate, ...sortOff })
      ])
    case ReportType.EXPENSE_REQUEST:
      return asRequestColumns([
        createManagerReportTitleColumn<ExpenseRequestReport>('request', titleHeader),
        createManagerReportStringCodeColumn<ExpenseRequestReport, 'code'>({
          id: 'code',
          accessorKey: 'code',
          header: requestNumberHeader,
          getCode: r => r.code,
          getTestId: id => `expense-reports-request-code-${id}`,
          size: { minSize: 110, size: 130, maxSize: 180 }
        }),
        createManagerReportStringCodeColumn<ExpenseRequestReport, 'planCode'>({
          id: 'planCode',
          accessorKey: 'planCode',
          header: codeHeader,
          getCode: r => r.planCode,
          getTestId: id => `expense-reports-request-plancode-${id}`,
          size: { minSize: 100, size: 120 }
        }),
        createReportEmployeeNameColumn<ExpenseRequestReport>('employeeName', employeeHeader),
        createDateColumn<ExpenseRequestReport>('createdAt', submissionHeader, 'createdAt', {
          formatDate,
          ...sortOff,
          ...MANAGER_REPORT_SUBMISSION_DATE_SIZES
        }),
        createManagerReportStatusColumn<ExpenseRequestReport>(statusHeader, s =>
          getExpenseRequestStatusDisplayT(managerT, s)
        ),
        createCurrencyColumn<ExpenseRequestReport>(
          'totalAmount',
          totalAmountHeader,
          row => (typeof row.totalAmount === 'number' ? row.totalAmount : 0),
          row => row.currency ?? 'EUR',
          formatCurrency,
          {
            ...sortOff,
            getRowTestId: r => `expense-reports-cell-totalAmount-${r.id}`,
            alignAmountHeaderWithTextColumns: true
          }
        )
      ])
    case ReportType.ADVANCE_PAYMENT:
      return asAdvanceColumns([
        createManagerReportTitleColumn<AdvancePaymentReport>('advance', titleHeader),
        createManagerReportStringCodeColumn<AdvancePaymentReport, 'code'>({
          id: 'code',
          accessorKey: 'code',
          header: codeHeader,
          getCode: r => r.code,
          getTestId: id => `expense-reports-advance-code-${id}`,
          size: DEFAULT_CODE_SIZES
        }),
        createReportEmployeeNameColumn<AdvancePaymentReport>('employeeName', employeeHeader),
        createDateColumn<AdvancePaymentReport>('requestDate', submissionHeader, 'requestDate', {
          formatDate,
          ...sortOff,
          ...MANAGER_REPORT_SUBMISSION_DATE_SIZES
        }),
        createManagerReportStatusColumn<AdvancePaymentReport>(statusHeader, s =>
          getAdvancePaymentStatusDisplayT(managerT, s)
        ),
        createCurrencyColumn<AdvancePaymentReport>(
          'amount',
          amountHeader,
          row => (typeof row.amount === 'number' ? row.amount : 0),
          row => row.currency ?? 'EUR',
          formatCurrency,
          {
            ...sortOff,
            getRowTestId: r => `expense-reports-cell-amount-${r.id}`,
            alignAmountHeaderWithTextColumns: true
          }
        ),
        {
          id: 'paymentMethod',
          accessorKey: 'paymentMethod',
          header: paymentMethodHeader,
          ...sortOff,
          cell: ({ row }) => {
            const label = formatPaymentMethodForExpenseTables(row.original.paymentMethod, REPORT_DASH)
            return (
              <span
                className="gba:text-sm gba:min-w-0 gba:truncate gba:block"
                data-testid={`expense-reports-cell-paymentMethod-${row.original.id}`}
                title={label === REPORT_DASH ? undefined : label}
              >
                {label}
              </span>
            )
          }
        },
        {
          id: 'costCenter',
          accessorKey: 'costCenter',
          header: costCenterHeader,
          ...sortOff,
          cell: ({ row }) => (
            <span className="gba:text-sm" data-testid={`expense-reports-cell-costCenter-${row.original.id}`}>
              {row.original.costCenter?.trim() ? row.original.costCenter : REPORT_DASH}
            </span>
          )
        }
      ])
    default:
      return []
  }
}

type ExportField = { key: string; title: string }

/**
 * Field keys and CSV headers for export, aligned with {@link createExpenseReportTableColumns}
 * where the table uses combined title+code: export uses separate `title` and `code` columns.
 */
export function getExportFieldsForReportType(
  reportType: ReportType | null,
  managerT: (key: string) => string
): ExportField[] {
  if (!reportType) return []
  const statusColumnTitle = managerT('filter-status-group-title')
  const titleHeader = managerT('expense-reports-column-title')
  const requestNumberHeader = managerT('expense-reports-column-request-number')
  const codeHeader = managerT('expense-reports-column-code')
  const employeeHeader = managerT('expense-reports-column-employee')
  const submissionHeader = managerT('expense-reports-column-submission-date')
  const amountHeader = managerT('expense-reports-column-amount')
  const totalAmountHeader = managerT('expense-reports-column-total-amount')
  const categoryHeader = managerT('expense-reports-column-category')
  const startDateHeader = managerT('expense-reports-column-start-date')
  const endDateHeader = managerT('expense-reports-column-end-date')
  const paymentMethodHeader = managerT('expense-reports-column-payment-method')
  const costCenterHeader = managerT('expense-reports-column-cost-center')
  const currencyHeader = managerT('expense-reports-column-currency')
  const insertCurrencyAfter = (rows: ExportField[], afterKey: string): ExportField[] => {
    if (rows.some(f => f.key === 'currency')) {
      return rows
    }
    const idx = rows.findIndex(f => f.key === afterKey)
    if (idx === -1) {
      return rows
    }
    const next = [...rows]
    next.splice(idx + 1, 0, {
      key: 'currency',
      title: currencyHeader
    })
    return next
  }

  switch (reportType) {
    case ReportType.EXPENSE_ITEM: {
      const base: ExportField[] = [
        { key: 'title', title: titleHeader },
        { key: 'code', title: requestNumberHeader },
        { key: 'employeeName', title: employeeHeader },
        { key: 'date', title: submissionHeader },
        { key: 'amount', title: amountHeader },
        { key: 'category', title: categoryHeader },
        { key: 'status', title: statusColumnTitle }
      ]
      return insertCurrencyAfter(base, 'amount')
    }
    case ReportType.EXPENSE_PLAN: {
      const base: ExportField[] = [
        { key: 'title', title: titleHeader },
        { key: 'code', title: codeHeader },
        { key: 'expenseRequestCode', title: requestNumberHeader },
        { key: 'totalAmount', title: totalAmountHeader },
        { key: 'employeeName', title: employeeHeader },
        { key: 'createdAt', title: submissionHeader },
        { key: 'status', title: statusColumnTitle },
        { key: 'startDate', title: startDateHeader },
        { key: 'endDate', title: endDateHeader }
      ]
      return insertCurrencyAfter(base, 'totalAmount')
    }
    case ReportType.EXPENSE_REQUEST: {
      const base: ExportField[] = [
        { key: 'title', title: titleHeader },
        { key: 'code', title: requestNumberHeader },
        { key: 'planCode', title: codeHeader },
        { key: 'employeeName', title: employeeHeader },
        { key: 'createdAt', title: submissionHeader },
        { key: 'status', title: statusColumnTitle },
        { key: 'totalAmount', title: totalAmountHeader }
      ]
      return insertCurrencyAfter(base, 'totalAmount')
    }
    case ReportType.ADVANCE_PAYMENT: {
      const base: ExportField[] = [
        { key: 'title', title: titleHeader },
        { key: 'employeeName', title: employeeHeader },
        { key: 'code', title: codeHeader },
        { key: 'requestDate', title: submissionHeader },
        { key: 'status', title: statusColumnTitle },
        { key: 'amount', title: amountHeader },
        { key: 'paymentMethod', title: paymentMethodHeader },
        { key: 'costCenter', title: costCenterHeader }
      ]
      return insertCurrencyAfter(base, 'amount')
    }
    default:
      return []
  }
}
