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
    .filter(
      k => !k.startsWith('currency:') && k !== 'amountRange' && k !== 'advanceRange' && k !== 'cardCreatedAtRange'
    )
    .map(s => ({ id: s, label: filterLabelMap[s] || s }))

  const statusGroup = createStatusFilterGroup(statusFilters, 'lowcoder:expense_table.status', 'Status')

  /**
   * Toolbar chip only: design-system FilterGroup renders `filters[0]` in the sheet, so this entry is
   * never shown in the sidebar but is still matched by generateFilterChips (same pattern as expense
   * plans top-destination chip).
   */
  const statusGroupWithCardChip: FilterConfiguration['groups'][number] = {
    ...statusGroup,
    filters: [
      ...statusGroup.filters,
      {
        id: 'cardCreatedAtRange',
        field: 'cardCreatedAtRange',
        label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.created_in_month', 'Created in'),
        type: 'text',
        config: {}
      }
    ]
  }

  const groups: FilterConfiguration['groups'] = [
    statusGroupWithCardChip,
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
