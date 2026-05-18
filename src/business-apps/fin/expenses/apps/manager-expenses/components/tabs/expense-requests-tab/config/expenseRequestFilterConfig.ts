import type { FilterConfiguration } from '@newwork/nw-design-system'
import {
  createFluentDateRangeFilterGroup,
  createFluentExpenseAmountRangeFilterGroup,
  createFluentTypeFilterGroup,
  createStatusFilterGroupWithLabel
} from '@/business-apps/fin/expenses/common/config/filterConfigHelpers'

export interface ExpenseRequestFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
  statusGroupLabel?: string
  t: (key: string) => string
}

export function createExpenseRequestFilterConfig({
  statusOptions,
  filterLabelMap,
  statusGroupLabel,
  t
}: ExpenseRequestFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))
  const requestTypeOptions = [
    {
      id: 'ExpenseRequestType:v1:EXPENSES',
      label: filterLabelMap?.['ExpenseRequestType:v1:EXPENSES'] ?? t('expense-plans-filter-type-expense')
    },
    {
      id: 'ExpenseRequestType:v1:TRIP',
      label: filterLabelMap?.['ExpenseRequestType:v1:TRIP'] ?? t('expense-plans-filter-type-trip')
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
    createFluentDateRangeFilterGroup(t, 'requestDate', 'requestDateRange', 'expense-requests-filter-request-date'),
    createFluentDateRangeFilterGroup(t, 'startDate', 'startDateRange', 'expense-plans-filter-start-date'),
    createFluentDateRangeFilterGroup(t, 'endDate', 'endDateRange', 'expense-plans-filter-end-date'),
    createStatusFilterGroupWithLabel(statusFilters, statusGroupLabel ?? t('filter-status-group-title')),
    createFluentTypeFilterGroup(
      t,
      'requestType',
      'requestTypeIds',
      'expense-requests-filter-request-type',
      requestTypeOptions
    ),
    createFluentExpenseAmountRangeFilterGroup(t, 'request-total-amount', 'totalAmount', 'expense-plans-filter-amount')
  ]

  return { id: 'expense-requests-filters', name: t('filter-expense-requests-title'), groups }
}
