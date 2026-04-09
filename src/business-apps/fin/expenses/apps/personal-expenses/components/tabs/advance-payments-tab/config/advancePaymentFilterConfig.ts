import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { createStatusFilterGroup } from '../../../../../../common/config/filterConfigHelpers'

export interface PersonalAdvancePaymentFilterConfigOptions {
  filterLabelMap: Record<string, string>
}

export function createPersonalAdvancePaymentFilterConfig({
  filterLabelMap
}: PersonalAdvancePaymentFilterConfigOptions): FilterConfiguration {
  const statusFilters = Object.keys(filterLabelMap)
    .filter(k => !k.startsWith('currency:') && k !== 'amountRange' && k !== 'advanceRange')
    .map(s => ({ id: s, label: filterLabelMap[s] || s }))

  const groups: FilterConfiguration['groups'] = [
    createStatusFilterGroup(statusFilters, 'lowcoder:expense_table.status', 'Status'),
    {
      id: 'amount-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range', 'Amount Range'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'amount',
          field: 'amount',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.amount_range', 'Amount Range'),
          type: 'number',
          config: {
            mode: 'range',
            min: 0,
            max: 1000000,
            step: 100,
            placeholderMin: 'Min Amount',
            placeholderMax: 'Max Amount'
          }
        }
      ]
    },
    {
      id: 'advance-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.advance_range_filter', 'Advance Range'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'advance',
          field: 'advance',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.advance_range_filter', 'Advance Range'),
          type: 'number',
          config: {
            mode: 'range',
            min: 0,
            max: 1000000,
            step: 100,
            placeholderMin: 'Min Advance',
            placeholderMax: 'Max Advance'
          }
        }
      ]
    }
  ]

  return { id: 'advance-payments-filters', name: 'Advance Payments Filters', groups }
}
