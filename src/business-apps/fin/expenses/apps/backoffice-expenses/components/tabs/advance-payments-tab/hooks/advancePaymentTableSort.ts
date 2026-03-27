import type { SortingState } from '@tanstack/react-table'
import type { OrderByClause } from '../../../../hooks/useAdvancePayment'

export type AdvancePaymentVisibleColumnId =
  | 'title'
  | 'employee'
  | 'orgUnit'
  | 'costCenter'
  | 'planId'
  | 'status'
  | 'amount'
  | 'advance'
  | 'paymentMethod'

export const DEFAULT_ADVANCE_PAYMENT_SORTING_STATE: SortingState = [{ id: 'createdAt', desc: true }]

export const DEFAULT_ADVANCE_PAYMENT_VISIBLE_COLUMNS: AdvancePaymentVisibleColumnId[] = [
  'title',
  'employee',
  'orgUnit',
  'costCenter',
  'planId',
  'status',
  'amount',
  'advance',
  'paymentMethod'
]

export function buildAdvancePaymentOrderBy(sortingState: SortingState): OrderByClause {
  const [primarySort] = sortingState
  const sortDirection = primarySort?.desc ? 'DESC' : 'ASC'
  const sortId = primarySort?.id

  switch (sortId) {
    case 'title':
      return [{ expensePlan: { title: sortDirection } }]
    case 'employee':
      return [{ expensePlan: { employee: { fullName: sortDirection } } }]
    case 'planId':
      return [{ expensePlan: { code: sortDirection } }]
    case 'status':
      return [{ status: sortDirection }]
    case 'amount':
      return [{ expensePlan: { totalAmount: sortDirection } }]
    case 'advance':
      return [{ amount: sortDirection }]
    case 'orgUnit':
      return [{ expensePlan: { employee: { employeePosition: { organizationalUnit: { name: sortDirection } } } } }]
    case 'costCenter':
      return [{ costCenter: { name: sortDirection } }]
    case 'paymentMethod':
      return [{ paymentMethod: sortDirection }]
    case 'createdAt':
    default:
      return [{ createdAt: sortDirection }]
  }
}
