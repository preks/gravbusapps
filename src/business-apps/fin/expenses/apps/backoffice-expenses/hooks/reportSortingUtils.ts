import type { SortingState } from '@tanstack/react-table'
import { ReportType } from '../types/reportTypes'

const DEFAULT_SORT_ORDER: any[] = [{ createdAt: 'DESC' }]
export const DEFAULT_EXPENSE_REQUEST_ORDER = DEFAULT_SORT_ORDER
export const DEFAULT_EXPENSE_PLAN_ORDER = DEFAULT_SORT_ORDER
export const DEFAULT_ADVANCE_PAYMENT_ORDER = DEFAULT_SORT_ORDER

type NullableAmountOrder = 'ASC_NULLS_LAST' | 'DESC_NULLS_LAST'

function amountOrderBy(desc: boolean | undefined): NullableAmountOrder {
  return desc ? 'DESC_NULLS_LAST' : 'ASC_NULLS_LAST'
}

/** Shared orderBy for expense request / plan reports (amount columns + null-stable direction). */
function tryExpenseReportAmountSort(
  sortField: string,
  desc: boolean | undefined,
  buildAdvanceClause: (dir: NullableAmountOrder) => Record<string, unknown>
): any[] | undefined {
  const d = amountOrderBy(desc)
  if (sortField === 'advancePaidAmount') {
    return [buildAdvanceClause(d)]
  }
  if (sortField === 'remainingAmount') {
    return [{ totalRemainingAmount: d }]
  }
  if (sortField === 'totalAmount') {
    return [{ totalAmount: d }]
  }
  return undefined
}

function mapSimpleFieldSort(
  sortField: string,
  sortDirection: string,
  fieldMap: Record<string, string>,
  defaultOrder: any[]
): any[] {
  const mappedField = fieldMap[sortField]
  return mappedField ? [{ [mappedField]: sortDirection }] : defaultOrder
}

const EXPENSE_PLAN_TEXT_SORT_MAP: Record<string, string> = {
  title: 'title',
  code: 'code',
  createdAt: 'createdAt',
  status: 'status',
  startDate: 'startDate',
  endDate: 'endDate'
}

const EXPENSE_REQUEST_TEXT_SORT_MAP: Record<string, string> = {
  ...EXPENSE_PLAN_TEXT_SORT_MAP,
  requestDate: 'createdAt'
}

export function mapSortingToOrderBy(selectedReportType: ReportType | null, sorting: SortingState): any[] {
  const primarySort = Array.isArray(sorting) && sorting.length > 0 ? sorting[0] : undefined
  const sortDirection = primarySort?.desc ? 'DESC' : 'ASC'
  const sortField = String(primarySort?.id || '').trim()

  switch (selectedReportType) {
    case ReportType.EXPENSE_ITEM:
      return mapSimpleFieldSort(
        sortField,
        sortDirection,
        {
          title: 'title',
          date: 'expenseDate',
          amount: 'reimbursableAmount',
          status: 'status'
        },
        DEFAULT_SORT_ORDER
      )
    case ReportType.EXPENSE_REQUEST: {
      const amountSort = tryExpenseReportAmountSort(sortField, primarySort?.desc, dir => ({
        expensePlan: { advancePaymentPaidAmount: dir }
      }))
      if (amountSort) {
        return amountSort
      }
      return mapSimpleFieldSort(sortField, sortDirection, EXPENSE_REQUEST_TEXT_SORT_MAP, DEFAULT_EXPENSE_REQUEST_ORDER)
    }
    case ReportType.EXPENSE_PLAN: {
      const amountSort = tryExpenseReportAmountSort(sortField, primarySort?.desc, dir => ({
        advancePaymentPaidAmount: dir
      }))
      if (amountSort) {
        return amountSort
      }
      return mapSimpleFieldSort(sortField, sortDirection, EXPENSE_PLAN_TEXT_SORT_MAP, DEFAULT_EXPENSE_PLAN_ORDER)
    }
    case ReportType.ADVANCE_PAYMENT:
      return mapSimpleFieldSort(
        sortField,
        sortDirection,
        {
          createdAt: 'createdAt',
          status: 'status',
          amount: 'amount',
          paymentMethod: 'paymentMethod'
        },
        DEFAULT_ADVANCE_PAYMENT_ORDER
      )
    case ReportType.APPROVAL_PAYOUT_CYCLE:
      return mapSimpleFieldSort(
        sortField,
        sortDirection,
        {
          title: 'title',
          code: 'code',
          status: 'status',
          totalAmount: 'totalAmount'
        },
        DEFAULT_SORT_ORDER
      )
    default:
      return DEFAULT_SORT_ORDER
  }
}
