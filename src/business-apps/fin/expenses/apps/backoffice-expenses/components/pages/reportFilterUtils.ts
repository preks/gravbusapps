import { ReportType, type ReportItem } from '../../hooks/useBackofficeExpenseReportData'
import { normalizeFilterValues } from '../../hooks/queryFilterUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export type ReportFilters = { status: string[]; employeeName: string[]; departmentName: string[] }
export type ReportSnapshot = { rows: ReportItem[]; totalCount: number }
export const EMPTY_REPORT_FILTERS: ReportFilters = { status: [], employeeName: [], departmentName: [] }

export const TRANSFER_REQUIRED_LABEL = 'Transfer Required'

export const normalizeReportFilters = (filters: Record<string, unknown> | undefined | null): ReportFilters => {
  const raw = filters ?? {}
  return {
    status: normalizeFilterValues(raw.status),
    employeeName: normalizeFilterValues(raw.employeeName),
    departmentName: normalizeFilterValues(raw.departmentName)
  }
}

export const areReportFiltersEqual = (left: ReportFilters, right: ReportFilters): boolean =>
  left.status.length === right.status.length &&
  left.employeeName.length === right.employeeName.length &&
  left.departmentName.length === right.departmentName.length &&
  left.status.every((v, i) => v === right.status[i]) &&
  left.employeeName.every((v, i) => v === right.employeeName[i]) &&
  left.departmentName.every((v, i) => v === right.departmentName[i])

export const hasAnyReportFilters = (filters: ReportFilters): boolean =>
  filters.status.length > 0 || filters.employeeName.length > 0 || filters.departmentName.length > 0

export const toFilterText = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value).trim()
  return ''
}

export const buildTransferRequiredAliases = (): Set<string> =>
  new Set([
    TRANSFER_REQUIRED_LABEL,
    'VERIFIED',
    'BOOKED',
    'TRANSFERRED',
    getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.verified', 'Verified'),
    getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booked', 'Booked'),
    getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.transferred', 'Transferred'),
    getTranslationFromI18nKeyAndLabel('lowcoder:expense_statuses.booking_required', 'Booking Required')
  ])

export const normalizeStatusFilterValue = (value: unknown, aliases: Set<string>): string => {
  const normalized = toFilterText(value)
  if (!normalized) return ''
  if (aliases.has(normalized) || aliases.has(normalized.toUpperCase())) {
    return TRANSFER_REQUIRED_LABEL
  }
  return normalized
}

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
