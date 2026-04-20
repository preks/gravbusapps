import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

export const advancePaymentDefaultVisibleColumnIds: string[] = [
  'expensePlan',
  'planNumber',
  'status',
  'amount',
  'advance',
  'paymentMethod'
]

export const advancePaymentAvailableColumns: ColumnConfig[] = [
  {
    id: 'expensePlan',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:create_expense_request.initial_expense_plan_select_label',
      'Expense Plan'
    )
  },
  {
    id: 'planNumber',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
      'Plan Number'
    )
  },
  { id: 'status', label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status') },
  {
    id: 'amount',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_plan_list.expense_plan_table.amount', 'Amount')
  },
  {
    id: 'advance',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:manager_expense_request_list.expense_table.advance', 'Advance')
  },
  {
    id: 'paymentMethod',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:create_expense_request.add_request_trip_details.payment_method',
      'Payment Method'
    )
  }
]

export type { ColumnConfig as AvailableColumn } from '../../../../../../common/types/columnTypes'
