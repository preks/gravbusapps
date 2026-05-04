import dayjs from 'dayjs'
import { ExpenseStatus } from '../../../../utils'
import type { ExpenseRequestWhereClause, ExpenseRequestWhereFragment } from './expenseRequestWhereClause.types'
import { EXPENSE_REQUEST_FILTER_STATUSES } from './expenseRequestFilterConstants'
import {
  addNestedScalarNumericRangeConditions,
  addScalarNumericRangeConditions,
  type ExpenseAmountRangeValue
} from '@/business-apps/fin/expenses/common/utils/amountRangeFilterUtils'

type DateRangeState = [Date | null, Date | null] | null | undefined

function formatFilterDayStart(date: Date): string {
  return dayjs(date).startOf('day').format('YYYY-MM-DD HH:mm:ss')
}

function formatFilterDayEnd(date: Date): string {
  return dayjs(date).endOf('day').format('YYYY-MM-DD HH:mm:ss')
}

function pushFieldDateRangeConditions(
  conditions: ExpenseRequestWhereFragment[],
  range: DateRangeState,
  fieldName: 'startDate' | 'endDate' | 'requestDate'
): void {
  if (range?.[0]) {
    conditions.push({ [fieldName]: { _gte: formatFilterDayStart(range[0]) } })
  }
  if (range?.[1]) {
    conditions.push({ [fieldName]: { _lte: formatFilterDayEnd(range[1]) } })
  }
}

function pushEffectiveDateConditions(
  conditions: ExpenseRequestWhereFragment[],
  effectiveDateRange: DateRangeState
): void {
  if (!effectiveDateRange?.[0] && !effectiveDateRange?.[1]) {
    return
  }
  const start = effectiveDateRange?.[0] ? formatFilterDayStart(effectiveDateRange[0]) : undefined
  const end = effectiveDateRange?.[1] ? formatFilterDayEnd(effectiveDateRange[1]) : undefined
  const tripAnd: Record<string, unknown>[] = []
  const expenseAnd: Record<string, unknown>[] = []
  if (start) {
    tripAnd.push({ startDate: { _gte: start } })
    expenseAnd.push({ expenseItem: { expenseDate: { _gte: start } } })
  }
  if (end) {
    tripAnd.push({ startDate: { _lte: end } })
    expenseAnd.push({ expenseItem: { expenseDate: { _lte: end } } })
  }
  const effectiveDateOr: Record<string, unknown> = {
    _or: [
      { _and: [{ requestTypeRef: { _eq: 'ExpenseRequestType:v1:TRIP' } }, ...tripAnd] },
      { _and: [{ requestTypeRef: { _eq: 'ExpenseRequestType:v1:EXPENSES' } }, ...expenseAnd] }
    ]
  }
  conditions.push(effectiveDateOr)
}

/**
 * Maps UI expense-request filters to GraphQL `where`-style conditions.
 * Extracted to keep `useExpenseRequestFilters.getFilters` cognitive complexity low (Sonar S3776).
 */
export function buildExpenseRequestWhereConditions(
  search: string,
  selectedFilters: string[],
  startDateRange: DateRangeState,
  endDateRange: DateRangeState,
  requestDateRange: DateRangeState,
  effectiveDateRange: DateRangeState,
  reimbursableAmountRange: ExpenseAmountRangeValue = null,
  advanceTotalAmountRange: ExpenseAmountRangeValue = null
): ExpenseRequestWhereClause {
  const conditions: ExpenseRequestWhereFragment[] = []

  if (search?.trim()) {
    const q = search.trim()
    conditions.push({
      _or: [{ code: { _ilike: `%${q}%` } }, { title: { _ilike: `%${q}%` } }]
    })
  }

  const statusFilters = selectedFilters.filter(f => EXPENSE_REQUEST_FILTER_STATUSES.includes(f))
  const requestTypeFilters = selectedFilters.filter(f => f.startsWith('ExpenseRequestType:'))

  if (statusFilters.length > 0) {
    conditions.push({ status: { _in: statusFilters } })
  } else {
    conditions.push({ status: { _neq: ExpenseStatus.DISCARDED } })
  }

  if (requestTypeFilters.length > 0) {
    conditions.push({ requestTypeRef: { _eq: requestTypeFilters[0] } })
  }

  pushFieldDateRangeConditions(conditions, startDateRange, 'startDate')
  pushFieldDateRangeConditions(conditions, endDateRange, 'endDate')
  pushFieldDateRangeConditions(conditions, requestDateRange, 'requestDate')
  pushEffectiveDateConditions(conditions, effectiveDateRange)

  addScalarNumericRangeConditions(
    conditions as Record<string, unknown>[],
    reimbursableAmountRange,
    'reimbursableAmount'
  )
  addNestedScalarNumericRangeConditions(
    conditions as Record<string, unknown>[],
    advanceTotalAmountRange,
    'expensePlan',
    'advancePaymentTotalAmount'
  )

  return { _and: conditions.length > 0 ? conditions : [{}] }
}
