import type { ColumnDef } from '@tanstack/react-table'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  createCurrencyColumn,
  createDateColumn,
  createFormatCurrency,
  createStatusBadgeColumn
} from '../../common/columns/expenseColumnHelpers'
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

function buildStatusLabelConfig(label: string | undefined) {
  return { label: label && label.trim() ? label : REPORT_DASH, badgeVariant: 'outline' as const }
}

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
    minSize: 120,
    size: 200,
    maxSize: 280,
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

export function createExpenseReportTableColumns(reportType: ReportType): ColumnDef<ReportItem>[] {
  const formatDate = createReportFormatDate()
  const formatCurrency = createFormatCurrency(null)

  switch (reportType) {
    case ReportType.EXPENSE_ITEM: {
      const c = (cols: ColumnDef<ExpenseItemReport>[]) => cols as ColumnDef<ReportItem>[]
      return c([
        {
          id: 'title',
          accessorKey: 'title',
          header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
          ...sortOff,
          minSize: 160,
          maxSize: 320,
          size: 200,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) => renderReportTitleCell(row.original.title, `expense-reports-item-title-${row.original.id}`)
        },
        {
          id: 'code',
          accessorKey: 'code',
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Expense Code'
          ),
          ...sortOff,
          minSize: 100,
          size: 120,
          maxSize: 180,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) => renderReportCodeCell(row.original.code, `expense-reports-item-code-${row.original.id}`)
        },
        createReportEmployeeNameColumn<ExpenseItemReport>(
          'employeeName',
          getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
        ),
        createDateColumn<ExpenseItemReport>(
          'date',
          getTranslationFromI18nKeyAndLabel('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date'),
          'date',
          { formatDate, ...sortOff }
        ),
        createCurrencyColumn<ExpenseItemReport>(
          'amount',
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount'),
          row => (typeof row.amount === 'number' ? row.amount : 0),
          row => row.currency ?? 'EUR',
          formatCurrency,
          { ...sortOff, getRowTestId: r => `expense-reports-cell-amount-${r.id}` }
        ),
        {
          id: 'category',
          accessorKey: 'category',
          header: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.dashboard_tab.category', 'Category'),
          ...sortOff,
          cell: ({ row }) => {
            // `category` from `getExpenseItemCategoryLabel` / getCatalogValue (not ref)
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
        createStatusBadgeColumn<ExpenseItemReport>(
          'status',
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
          row => buildStatusLabelConfig(row.status),
          sortOff
        )
      ])
    }
    case ReportType.EXPENSE_PLAN: {
      const c = (cols: ColumnDef<ExpensePlanReport>[]) => cols as ColumnDef<ReportItem>[]
      return c([
        {
          id: 'title',
          accessorKey: 'title',
          header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
          ...sortOff,
          minSize: 160,
          maxSize: 320,
          size: 200,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) => renderReportTitleCell(row.original.title, `expense-reports-plan-title-${row.original.id}`)
        },
        {
          id: 'code',
          accessorKey: 'code',
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_table.code',
            'Plan Code'
          ),
          ...sortOff,
          minSize: 100,
          size: 120,
          maxSize: 180,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) => renderReportCodeCell(row.original.code, `expense-reports-plan-code-${row.original.id}`)
        },
        {
          id: 'expenseRequestCode',
          accessorKey: 'expenseRequestCode',
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Request Code'
          ),
          ...sortOff,
          minSize: 100,
          size: 120,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) =>
            renderReportCodeCell(
              row.original.expenseRequestCode,
              `expense-reports-plan-request-code-${row.original.id}`
            )
        },
        createReportEmployeeNameColumn<ExpensePlanReport>(
          'employeeName',
          getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
        ),
        createDateColumn<ExpensePlanReport>(
          'createdAt',
          getTranslationFromI18nKeyAndLabel('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date'),
          'createdAt',
          { formatDate, ...sortOff }
        ),
        createStatusBadgeColumn<ExpensePlanReport>(
          'status',
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
          row => buildStatusLabelConfig(row.status),
          sortOff
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
    }
    case ReportType.EXPENSE_REQUEST: {
      const c = (cols: ColumnDef<ExpenseRequestReport>[]) => cols as ColumnDef<ReportItem>[]
      return c([
        {
          id: 'title',
          accessorKey: 'title',
          header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
          ...sortOff,
          minSize: 160,
          maxSize: 320,
          size: 200,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) =>
            renderReportTitleCell(row.original.title, `expense-reports-request-title-${row.original.id}`)
        },
        {
          id: 'code',
          accessorKey: 'code',
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_request_list.expense_request_filter.request_number_input',
            'Request Number'
          ),
          ...sortOff,
          minSize: 110,
          size: 130,
          maxSize: 180,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) => renderReportCodeCell(row.original.code, `expense-reports-request-code-${row.original.id}`)
        },
        {
          id: 'planCode',
          accessorKey: 'planCode',
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_table.code',
            'Plan Code'
          ),
          ...sortOff,
          minSize: 100,
          size: 120,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) =>
            renderReportCodeCell(row.original.planCode, `expense-reports-request-plancode-${row.original.id}`)
        },
        createReportEmployeeNameColumn<ExpenseRequestReport>(
          'employeeName',
          getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
        ),
        createDateColumn<ExpenseRequestReport>(
          'createdAt',
          getTranslationFromI18nKeyAndLabel('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date'),
          'createdAt',
          { formatDate, ...sortOff }
        ),
        createStatusBadgeColumn<ExpenseRequestReport>(
          'status',
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
          row => buildStatusLabelConfig(row.status),
          sortOff
        ),
        createCurrencyColumn<ExpenseRequestReport>(
          'totalAmount',
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Total Amount'),
          row => (typeof row.totalAmount === 'number' ? row.totalAmount : 0),
          row => row.currency ?? 'EUR',
          formatCurrency,
          { ...sortOff, getRowTestId: r => `expense-reports-cell-totalAmount-${r.id}` }
        )
      ])
    }
    case ReportType.ADVANCE_PAYMENT: {
      const c = (cols: ColumnDef<AdvancePaymentReport>[]) => cols as ColumnDef<ReportItem>[]
      return c([
        {
          id: 'title',
          accessorKey: 'title',
          header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.title', 'Title'),
          ...sortOff,
          minSize: 160,
          maxSize: 320,
          size: 200,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) =>
            renderReportTitleCell(row.original.title, `expense-reports-advance-title-${row.original.id}`)
        },
        {
          id: 'code',
          accessorKey: 'code',
          header: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_table.code',
            'Plan Code'
          ),
          ...sortOff,
          minSize: 100,
          size: 120,
          maxSize: 180,
          meta: { className: 'gba:min-w-0' },
          cell: ({ row }) => renderReportCodeCell(row.original.code, `expense-reports-advance-code-${row.original.id}`)
        },
        createReportEmployeeNameColumn<AdvancePaymentReport>(
          'employeeName',
          getTranslationFromI18nKeyAndLabel('lowcoder:hr_absences.create_absence.employee', 'Employee')
        ),
        createDateColumn<AdvancePaymentReport>(
          'requestDate',
          getTranslationFromI18nKeyAndLabel('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date'),
          'requestDate',
          { formatDate, ...sortOff }
        ),
        createStatusBadgeColumn<AdvancePaymentReport>(
          'status',
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
          row => buildStatusLabelConfig(row.status),
          sortOff
        ),
        createCurrencyColumn<AdvancePaymentReport>(
          'amount',
          getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.amount', 'Amount'),
          row => (typeof row.amount === 'number' ? row.amount : 0),
          row => row.currency ?? 'EUR',
          formatCurrency,
          { ...sortOff, getRowTestId: r => `expense-reports-cell-amount-${r.id}` }
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
    }
    default:
      return []
  }
}

type ExportField = { key: string; title: string }

/**
 * Field keys and CSV headers for export, aligned with {@link createExpenseReportTableColumns}
 * where the table uses combined title+code: export uses separate `title` and `code` columns.
 */
export function getExportFieldsForReportType(reportType: ReportType | null): ExportField[] {
  if (!reportType) return []
  const t = (key: string, fallback: string) => getTranslationFromI18nKeyAndLabel(key, fallback)
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
        { key: 'status', title: t('lowcoder:expense_request_list.expense_plan_table.status', 'Status') }
      ]
      return insertCurrencyAfter(base, 'amount')
    }
    case ReportType.EXPENSE_PLAN:
      return [
        { key: 'title', title: t('lowcoder:expense_request_list.expense_plan_table.title', 'Title') },
        { key: 'code', title: t('lowcoder:expense_calculation_rule.expense_table.code', 'Plan Code') },
        {
          key: 'expenseRequestCode',
          title: t('lowcoder:expense_request_list.expense_request_filter.request_number_input', 'Request Code')
        },
        { key: 'employeeName', title: t('lowcoder:hr_absences.create_absence.employee', 'Employee') },
        { key: 'createdAt', title: t('lowcoder:acknowledge_sick_leave.submission_date', 'Submission Date') },
        { key: 'status', title: t('lowcoder:expense_request_list.expense_plan_table.status', 'Status') },
        { key: 'startDate', title: t('lowcoder:hr_absences.create_absence.start_date', 'Start Date') },
        { key: 'endDate', title: t('lowcoder:hr_absences.create_absence.end_date', 'End Date') }
      ]
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
        { key: 'status', title: t('lowcoder:expense_request_list.expense_plan_table.status', 'Status') },
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
        { key: 'status', title: t('lowcoder:expense_request_list.expense_plan_table.status', 'Status') },
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
