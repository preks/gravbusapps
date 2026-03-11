import { ReportType, type ReportItem } from '../../hooks/useBackofficeExpenseReportData'
import { normalizeFilterValues } from '../../hooks/queryFilterUtils'

export type ReportFilters = {
  status: string[]
  employeeName: string[]
  departmentName: string[]
  // Expense Items: expenseDate range
  dateFrom?: string
  dateTo?: string
  // Plans & Requests: effective/request/plan date ranges
  effectiveDateFrom?: string
  effectiveDateTo?: string
  requestDateFrom?: string
  requestDateTo?: string
  planDateFrom?: string
  planDateTo?: string
}
export type ReportSnapshot = { rows: ReportItem[]; totalCount: number }
export const EMPTY_REPORT_FILTERS: ReportFilters = { status: [], employeeName: [], departmentName: [] }

const pickString = (raw: unknown): string | undefined => (typeof raw === 'string' && raw ? raw : undefined)

export const normalizeReportFilters = (filters: Record<string, unknown> | undefined | null): ReportFilters => {
  const raw = filters ?? {}
  return {
    status: normalizeFilterValues(raw.status),
    employeeName: normalizeFilterValues(raw.employeeName),
    departmentName: normalizeFilterValues(raw.departmentName),
    dateFrom: pickString(raw.dateFrom),
    dateTo: pickString(raw.dateTo),
    effectiveDateFrom: pickString(raw.effectiveDateFrom),
    effectiveDateTo: pickString(raw.effectiveDateTo),
    requestDateFrom: pickString(raw.requestDateFrom),
    requestDateTo: pickString(raw.requestDateTo),
    planDateFrom: pickString(raw.planDateFrom),
    planDateTo: pickString(raw.planDateTo)
  }
}

export const areReportFiltersEqual = (left: ReportFilters, right: ReportFilters): boolean =>
  left.status.length === right.status.length &&
  left.employeeName.length === right.employeeName.length &&
  left.departmentName.length === right.departmentName.length &&
  left.dateFrom === right.dateFrom &&
  left.dateTo === right.dateTo &&
  left.effectiveDateFrom === right.effectiveDateFrom &&
  left.effectiveDateTo === right.effectiveDateTo &&
  left.requestDateFrom === right.requestDateFrom &&
  left.requestDateTo === right.requestDateTo &&
  left.planDateFrom === right.planDateFrom &&
  left.planDateTo === right.planDateTo &&
  left.status.every((v, i) => v === right.status[i]) &&
  left.employeeName.every((v, i) => v === right.employeeName[i]) &&
  left.departmentName.every((v, i) => v === right.departmentName[i])

export const hasAnyReportFilters = (filters: ReportFilters): boolean =>
  filters.status.length > 0 ||
  filters.employeeName.length > 0 ||
  filters.departmentName.length > 0 ||
  !!filters.dateFrom ||
  !!filters.dateTo ||
  !!filters.effectiveDateFrom ||
  !!filters.effectiveDateTo ||
  !!filters.requestDateFrom ||
  !!filters.requestDateTo ||
  !!filters.planDateFrom ||
  !!filters.planDateTo

export const REPORT_TYPE_DEFINITIONS: Array<{
  key: ReportType
  nameKey: string
  nameFallback: string
  descKey: string
  descFallback: string
}> = [
  {
    key: ReportType.APPROVAL_PAYOUT_CYCLE,
    nameKey: 'lowcoder:team_expenses_page.dashboard_tab.approval_payout_cycle',
    nameFallback: 'Approval & Payout Cycle',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.approval_payout_cycle_subheader',
    descFallback: 'Pending to approved to paid cycle durations'
  },
  {
    key: ReportType.EXPENSE_ITEM,
    nameKey: 'lowcoder:personal_expenses.expense_items',
    nameFallback: 'Expense Items',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.individual_expense_transactions',
    descFallback: 'Individual expense items and transactions'
  },
  {
    key: ReportType.EXPENSE_PLAN,
    nameKey: 'lowcoder:team_expenses_page.dashboard_tab.expense_plans',
    nameFallback: 'Expense Plans',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.expense_plans_subheader',
    descFallback: 'Budget plans and allocations'
  },
  {
    key: ReportType.EXPENSE_REQUEST,
    nameKey: 'lowcoder:employee_list.flows_button.expense_requests',
    nameFallback: 'Expense Requests',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.expense_requests_subheader',
    descFallback: 'Submitted expense requests and approvals'
  },
  {
    key: ReportType.ADVANCE_PAYMENT,
    nameKey: 'lowcoder:backoffice_expense_landing_page.advance_title',
    nameFallback: 'Advance Payments',
    descKey: 'lowcoder:team_expenses_page.dashboard_tab.advance_payments_subheader',
    descFallback: 'Cash advances and prepayments'
  }
]
