import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface AdvancePaymentFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
}

/**
 * Builds FilterConfiguration for the manager advance payments DataDisplay filter sheet.
 * Status filter only; currency is handled via CurrencyDropdown in secondaryActions.
 */
export function createAdvancePaymentFilterConfig({
  statusOptions,
  filterLabelMap
}: AdvancePaymentFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))

  const groups: FilterConfiguration['groups'] = [
    {
      id: 'status-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.status', 'Status'),
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'statusIds',
          field: 'statusIds',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.status', 'Status'),
          type: 'multi-select',
          config: { options: statusFilters }
        }
      ]
    }
  ]

  return {
    id: 'advance-payments-filters',
    name: getTranslationFromI18nKeyAndLabel(
      'lowcoder:backoffice_expense_landing_page.advance_title',
      'Advance Payments Filters'
    ),
    groups
  }
}
