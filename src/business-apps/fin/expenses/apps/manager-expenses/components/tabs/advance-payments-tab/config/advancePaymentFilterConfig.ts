import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  createExpenseAmountRangeFilterGroup,
  createStatusFilterGroup
} from '../../../../common/config/filterConfigHelpers'

export interface AdvancePaymentFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
}

export function createAdvancePaymentFilterConfig({
  statusOptions,
  filterLabelMap
}: AdvancePaymentFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))

  return {
    id: 'advance-payments-filters',
    name: getTranslationFromI18nKeyAndLabel(
      'lowcoder:backoffice_expense_landing_page.advance_title',
      'Advance Payments Filters'
    ),
    groups: [
      createStatusFilterGroup(statusFilters, 'lowcoder:expense_item_list.expense_table.status', 'Status'),
      createExpenseAmountRangeFilterGroup(
        'advance-payment-amount',
        'amount',
        'lowcoder:advance_payment_table.amount_label',
        'Amount'
      )
    ]
  }
}
