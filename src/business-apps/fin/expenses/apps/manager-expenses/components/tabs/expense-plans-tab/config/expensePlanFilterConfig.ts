import type { FilterConfiguration } from '@newwork/nw-design-system'
import {
  createFluentDateRangeFilterGroup,
  createFluentExpenseAmountRangeFilterGroup,
  createFluentTypeFilterGroup,
  createStatusFilterGroupWithLabel
} from '@/business-apps/fin/expenses/common/config/filterConfigHelpers'

export interface ExpensePlanFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
  statusGroupLabel?: string
  t: (key: string) => string
}

export function createExpensePlanFilterConfig({
  statusOptions,
  filterLabelMap,
  statusGroupLabel,
  t
}: ExpensePlanFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))
  const planTypeOptions = [
    {
      id: 'planType:EXPENSES',
      label: filterLabelMap?.['planType:EXPENSES'] ?? t('expense-plans-filter-type-expense')
    },
    {
      id: 'planType:TRIP',
      label: filterLabelMap?.['planType:TRIP'] ?? t('expense-plans-filter-type-trip')
    }
  ]

  const groups: FilterConfiguration['groups'] = [
    createFluentDateRangeFilterGroup(
      t,
      'effectiveDate',
      'effectiveDateRange',
      'expense-plans-filter-effective-date',
      t('expense-plans-effective-date-info')
    ),
    createFluentDateRangeFilterGroup(t, 'planDate', 'planDateRange', 'expense-plans-filter-plan-date'),
    createFluentDateRangeFilterGroup(t, 'startDate', 'startDateRange', 'expense-plans-filter-start-date'),
    createFluentDateRangeFilterGroup(t, 'endDate', 'endDateRange', 'expense-plans-filter-end-date'),
    createStatusFilterGroupWithLabel(statusFilters, statusGroupLabel ?? t('filter-status-group-title')),
    createFluentTypeFilterGroup(t, 'planType', 'planTypeIds', 'expense-plans-filter-plan-type', planTypeOptions),
    createFluentExpenseAmountRangeFilterGroup(t, 'plan-amount', 'totalAmount', 'expense-plans-filter-amount')
  ]

  return { id: 'expense-plans-filters', name: t('expense-plans-filter-config-name'), groups }
}
