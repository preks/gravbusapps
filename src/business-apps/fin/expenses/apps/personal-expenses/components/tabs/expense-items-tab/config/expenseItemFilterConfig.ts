import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ExpenseItemFilterConfigOptions {
  filterLabelMap: Record<string, string>
  availableStatuses: string[]
}

export function createExpenseItemFilterConfig({
  filterLabelMap,
  availableStatuses
}: ExpenseItemFilterConfigOptions): FilterConfiguration {
  const statusOptions = availableStatuses.map(s => ({
    id: s.toLowerCase(),
    label: filterLabelMap[s.toLowerCase()] || s
  }))
  const groups: FilterConfiguration['groups'] = []

  groups.push(
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
          config: { options: statusOptions, showSearch: false }
        }
      ]
    },
    {
      id: 'expenseDate-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date_range', 'Expense Date'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'expenseDateRange',
          field: 'expenseDateRange',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense_date_range', 'Expense Date'),
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_plan_list.expense_plan_table.start_date',
              'Start date'
            ),
            placeholderEnd: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_plan_list.expense_plan_table.end_date',
              'End date'
            ),
            showClearButton: true
          }
        }
      ]
    },
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
    }
  )

  return { id: 'expense-items-filters', name: 'Expense Items Filters', groups }
}
