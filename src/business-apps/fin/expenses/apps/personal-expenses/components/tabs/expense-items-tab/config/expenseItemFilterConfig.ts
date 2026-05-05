import type { FilterConfiguration } from '@newwork/nw-design-system'

export interface ExpenseItemFilterConfigOptions {
  filterLabelMap: Record<string, string>
  availableStatuses: string[]
  t: (key: string) => string
}

export function createExpenseItemFilterConfig({
  filterLabelMap,
  availableStatuses,
  t
}: ExpenseItemFilterConfigOptions): FilterConfiguration {
  const statusOptions = availableStatuses.map(s => ({
    id: s.toLowerCase(),
    label: filterLabelMap[s.toLowerCase()] || s
  }))
  const groups: FilterConfiguration['groups'] = []

  groups.push(
    {
      id: 'status-group',
      label: t('expense-items-filter-status'),
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'statusIds',
          field: 'statusIds',
          label: t('expense-items-filter-status'),
          type: 'multi-select',
          config: { options: statusOptions, showSearch: false }
        }
      ]
    },
    {
      id: 'expenseDate-group',
      label: t('expense-items-filter-expense-date-range'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'expenseDateRange',
          field: 'expenseDateRange',
          label: t('expense-items-filter-expense-date-range'),
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: t('expense-items-placeholder-start-date'),
            placeholderEnd: t('expense-items-placeholder-end-date'),
            showClearButton: true
          }
        }
      ]
    },
    {
      id: 'amount-group',
      label: t('expense-items-filter-amount-range'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'amount',
          field: 'amount',
          label: t('expense-items-filter-amount-range'),
          type: 'number',
          config: {
            mode: 'range',
            min: 0,
            max: 1000000,
            step: 100,
            placeholderMin: t('expense-items-placeholder-min-amount'),
            placeholderMax: t('expense-items-placeholder-max-amount')
          }
        }
      ]
    }
  )

  return { id: 'expense-items-filters', name: 'Expense Items Filters', groups }
}
