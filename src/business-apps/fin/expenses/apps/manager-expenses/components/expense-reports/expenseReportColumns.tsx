import type { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
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
  const t = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(key, fallback)
  const titleHeader = t('lowcoder:expense_request_list.expense_plan_table.title', 'Title')
  const statusHeader = managerT('filter-status-group-title')
  const employeeHeader = t('lowcoder:hr_absences.create_absence.employee', 'Employee')
  const submissionHeader = t('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date')

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
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Expense Code'
          ),
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
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount'),
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
          header: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.category', 'Category'),
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
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_table.code',
            'Plan Code'
          ),
          getCode: r => r.code,
          getTestId: id => `expense-reports-plan-code-${id}`,
          size: DEFAULT_CODE_SIZES
        }),
        createManagerReportStringCodeColumn<ExpensePlanReport, 'expenseRequestCode'>({
          id: 'expenseRequestCode',
          accessorKey: 'expenseRequestCode',
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Request Code'
          ),
          getCode: r => r.expenseRequestCode,
          getTestId: id => `expense-reports-plan-request-code-${id}`,
          size: { minSize: 100, size: 120 }
        }),
        createCurrencyColumn<ExpensePlanReport>(
          'totalAmount',
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_table.total_amount', 'Total amount'),
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
        createDateColumn<ExpensePlanReport>(
          'startDate',
          getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.start_date', 'Start Date'),
          'startDate',
          { formatDate, ...sortOff }
        ),
        createDateColumn<ExpensePlanReport>(
          'endDate',
          getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.end_date', 'End Date'),
          'endDate',
          { formatDate, ...sortOff }
        )
      ])
    case ReportType.EXPENSE_REQUEST:
      return asRequestColumns([
        createManagerReportTitleColumn<ExpenseRequestReport>('request', titleHeader),
        createManagerReportStringCodeColumn<ExpenseRequestReport, 'code'>({
          id: 'code',
          accessorKey: 'code',
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Request Number'
          ),
          getCode: r => r.code,
          getTestId: id => `expense-reports-request-code-${id}`,
          size: { minSize: 110, size: 130, maxSize: 180 }
        }),
        createManagerReportStringCodeColumn<ExpenseRequestReport, 'planCode'>({
          id: 'planCode',
          accessorKey: 'planCode',
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_table.code',
            'Plan Code'
          ),
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
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Total Amount'),
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
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_table.code',
            'Plan Code'
          ),
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
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount'),
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
          header: getTranslationFromI18nKeyAndLabel('lowcoder:payment_method', 'Payment Method'),
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
          header: getTranslationFromI18nKeyAndLabel('lowcoder:cost_center', 'Cost Center'),
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
  const t = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(key, fallback)
  const statusColumnTitle = managerT('filter-status-group-title')
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
      title: t('lowcoder:personal_expenses.currency', 'Currency')
    })
    return next
  }

  switch (reportType) {
    case ReportType.EXPENSE_ITEM: {
      const base: ExportField[] = [
        { key: 'title', title: t('lowcoder:expense_request_list.expense_plan_table.title', 'Title') },
        {
          key: 'code',
          title: t('lowcoder:expense_request_list.expense_request_filter.request_number_input', 'Expense Code')
        },
        { key: 'employeeName', title: t('lowcoder:hr_absences.create_absence.employee', 'Employee') },
        { key: 'date', title: t('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date') },
        { key: 'amount', title: t('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount') },
        { key: 'category', title: t('lowcoder:team_expenses_page.dashboard_tab.category', 'Category') },
        { key: 'status', title: statusColumnTitle }
      ]
      return insertCurrencyAfter(base, 'amount')
    }
    case ReportType.EXPENSE_PLAN: {
      const base: ExportField[] = [
        { key: 'title', title: t('lowcoder:expense_request_list.expense_plan_table.title', 'Title') },
        { key: 'code', title: t('lowcoder:expense_calculation_rule.expense_table.code', 'Plan Code') },
        {
          key: 'expenseRequestCode',
          title: t('lowcoder:expense_request_list.expense_request_filter.request_number_input', 'Request Code')
        },
        { key: 'totalAmount', title: t('lowcoder:expense_plan_table.total_amount', 'Total amount') },
        { key: 'employeeName', title: t('lowcoder:hr_absences.create_absence.employee', 'Employee') },
        { key: 'createdAt', title: t('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date') },
        { key: 'status', title: statusColumnTitle },
        { key: 'startDate', title: t('lowcoder:hr_absences.create_absence.start_date', 'Start Date') },
        { key: 'endDate', title: t('lowcoder:hr_absences.create_absence.end_date', 'End Date') }
      ]
      return insertCurrencyAfter(base, 'totalAmount')
    }
    case ReportType.EXPENSE_REQUEST: {
      const base: ExportField[] = [
        { key: 'title', title: t('lowcoder:expense_request_list.expense_plan_table.title', 'Title') },
        {
          key: 'code',
          title: t('lowcoder:expense_request_list.expense_request_filter.request_number_input', 'Request Code')
        },
        { key: 'planCode', title: t('lowcoder:expense_calculation_rule.expense_table.code', 'Plan Code') },
        { key: 'employeeName', title: t('lowcoder:hr_absences.create_absence.employee', 'Employee') },
        { key: 'createdAt', title: t('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date') },
        { key: 'status', title: statusColumnTitle },
        { key: 'totalAmount', title: t('lowcoder:expense_request_list.expense_plan_table.amount', 'Total Amount') }
      ]
      return insertCurrencyAfter(base, 'totalAmount')
    }
    case ReportType.ADVANCE_PAYMENT: {
      const base: ExportField[] = [
        { key: 'title', title: t('lowcoder:expense_request_list.expense_plan_table.title', 'Title') },
        { key: 'employeeName', title: t('lowcoder:hr_absences.create_absence.employee', 'Employee') },
        { key: 'code', title: t('lowcoder:expense_calculation_rule.expense_table.code', 'Plan Code') },
        { key: 'requestDate', title: t('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date') },
        { key: 'status', title: statusColumnTitle },
        { key: 'amount', title: t('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount') },
        { key: 'paymentMethod', title: t('lowcoder:payment_method', 'Payment Method') },
        { key: 'costCenter', title: t('lowcoder:cost_center', 'Cost Center') }
      ]
      return insertCurrencyAfter(base, 'amount')
    }
    default:
      return []
  }
}
