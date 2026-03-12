import type { SortingState } from '@tanstack/react-table'
import { ReportType } from '../types/reportTypes'

const DEFAULT_EXPENSE_ITEM_ORDER: any[] = [{ createdAt: 'DESC' }]
export const DEFAULT_EXPENSE_REQUEST_ORDER: any[] = [{ createdAt: 'DESC' }]
export const DEFAULT_EXPENSE_PLAN_ORDER: any[] = [{ createdAt: 'DESC' }]
export const DEFAULT_ADVANCE_PAYMENT_ORDER: any[] = [{ createdAt: 'DESC' }]
const DEFAULT_APPROVAL_PAYOUT_ORDER: any[] = [{ createdAt: 'DESC' }]

export function mapSortingToOrderBy(selectedReportType: ReportType | null, sorting: SortingState): any[] {
  const primarySort = Array.isArray(sorting) && sorting.length > 0 ? sorting[0] : undefined
  const sortDirection = primarySort?.desc ? 'DESC' : 'ASC'
  const sortField = String(primarySort?.id || '').trim()

  switch (selectedReportType) {
    case ReportType.EXPENSE_ITEM: {
      const fieldMap: Record<string, string> = {
        title: 'title',
        date: 'expenseDate',
        amount: 'reimbursableAmount',
        status: 'status'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_EXPENSE_ITEM_ORDER
    }
    case ReportType.EXPENSE_REQUEST: {
      const fieldMap: Record<string, string> = {
        title: 'title',
        code: 'code',
        createdAt: 'createdAt',
        status: 'status',
        totalAmount: 'reimbursableAmount',
        requestDate: 'createdAt',
        startDate: 'startDate',
        endDate: 'endDate'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_EXPENSE_REQUEST_ORDER
    }
    case ReportType.EXPENSE_PLAN: {
      const fieldMap: Record<string, string> = {
        title: 'title',
        code: 'code',
        createdAt: 'createdAt',
        status: 'status',
        totalAmount: 'totalAmount',
        startDate: 'startDate',
        endDate: 'endDate'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_EXPENSE_PLAN_ORDER
    }
    case ReportType.ADVANCE_PAYMENT: {
      const fieldMap: Record<string, string> = {
        createdAt: 'createdAt',
        status: 'status',
        amount: 'amount',
        paymentMethod: 'paymentMethod'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_ADVANCE_PAYMENT_ORDER
    }
    case ReportType.APPROVAL_PAYOUT_CYCLE: {
      const fieldMap: Record<string, string> = {
        title: 'title',
        code: 'code',
        status: 'status',
        totalAmount: 'reimbursableAmount'
      }
      const mappedField = fieldMap[sortField]
      return mappedField ? [{ [mappedField]: sortDirection }] : DEFAULT_APPROVAL_PAYOUT_ORDER
    }
    default:
      return [{ createdAt: 'DESC' }]
  }
}
