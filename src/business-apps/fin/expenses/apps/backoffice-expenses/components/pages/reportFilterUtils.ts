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
  descKey: string
}> = [
  {
    key: ReportType.APPROVAL_PAYOUT_CYCLE,
    nameKey: 'report-approval-payout-cycle',
    descKey: 'report-approval-payout-cycle-desc'
  },
  {
    key: ReportType.EXPENSE_ITEM,
    nameKey: 'report-expense-item',
    descKey: 'report-expense-item-desc'
  },
  {
    key: ReportType.EXPENSE_PLAN,
    nameKey: 'report-expense-plan',
    descKey: 'report-expense-plan-desc'
  },
  {
    key: ReportType.EXPENSE_REQUEST,
    nameKey: 'report-expense-request',
    descKey: 'report-expense-request-desc'
  },
  {
    key: ReportType.ADVANCE_PAYMENT,
    nameKey: 'report-advance-payment',
    descKey: 'report-advance-payment-desc'
  }
]
