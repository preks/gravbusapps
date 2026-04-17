import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  createDateRangeFilterGroup,
  createNumberRangeFilterGroup,
  createStatusFilterGroup,
  createTypeFilterGroup
} from '../../../../common/config/filterConfigHelpers'

export interface ExpensePlanFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
}

export function createExpensePlanFilterConfig({
  statusOptions,
  filterLabelMap
}: ExpensePlanFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))
  const planTypeOptions = [
    {
      id: 'planType:EXPENSES',
      label:
        filterLabelMap?.['planType:EXPENSES'] ??
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense')
    },
    {
      id: 'planType:TRIP',
      label:
        filterLabelMap?.['planType:TRIP'] ??
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.trip', 'Trip')
    }
  ]

  const groups: FilterConfiguration['groups'] = [
    createDateRangeFilterGroup(
      'effectiveDate',
      'effectiveDateRange',
      'lowcoder:personal_expenses.effective_date',
      'Effective Date'
    ),
    createDateRangeFilterGroup(
      'planDate',
      'planDateRange',
      'lowcoder:team_expenses_page.plan_details.plan_date',
      'Plan Date'
    ),
    createDateRangeFilterGroup('startDate', 'startDateRange', 'lowcoder:personal_expenses.start_date', 'Start Date'),
    createDateRangeFilterGroup('endDate', 'endDateRange', 'lowcoder:personal_expenses.end_date', 'End Date'),
    createStatusFilterGroup(statusFilters),
    createTypeFilterGroup(
      'planType',
      'planTypeIds',
      'lowcoder:personal_expenses.plan_type',
      'Plan Type',
      planTypeOptions
    ),
    createNumberRangeFilterGroup('plan-amount', 'totalAmount', 'lowcoder:sales_hub.amount.amount', 'Amount')
  ]

  return { id: 'expense-plans-filters', name: 'Expense Plans Filters', groups }
}
