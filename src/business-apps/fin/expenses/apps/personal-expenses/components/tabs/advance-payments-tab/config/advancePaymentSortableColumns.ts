import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { ColumnConfig } from '../../../../../../common/types/columnTypes'

export const advancePaymentSortableColumns: ColumnConfig[] = [
  {
    id: 'createdAt',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.created_at', 'Created')
  },
  {
    id: 'code',
    label: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_request_filter.plan_number_input',
      'Plan Number'
    )
  },
  {
    id: 'status',
    label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_table.status', 'Status')
  },
  {
    id: 'amount',
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
