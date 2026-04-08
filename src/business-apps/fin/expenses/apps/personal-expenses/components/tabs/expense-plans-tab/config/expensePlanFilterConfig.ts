import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  createDateRangeFilterGroup,
  createStatusFilterGroup
} from '../../../../../../common/config/filterConfigHelpers'

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

  const topDestinationLabel = getTranslationFromI18nKeyAndLabel(
    'lowcoder:personal_expenses.top_destination',
    'Top Destination'
  )
  const topDestinationOptions = Object.entries(filterLabelMap)
    .filter(([key]) => key.startsWith('topDestination:'))
    .map(([id, label]) => ({ id, label }))

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
    {
      id: 'planType-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'planTypeIds',
          field: 'planTypeIds',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.plan_type', 'Plan Type'),
          type: 'multi-select',
          config: { options: planTypeOptions }
        }
      ]
    },
    {
      id: 'topDestination-group',
      label: topDestinationLabel,
      collapsible: false,
      filters: [
        {
          id: 'topDestinationIds',
          field: 'topDestinationIds',
          label: topDestinationLabel,
          type: 'multi-select',
          config: { options: topDestinationOptions }
        }
      ]
    }
  ]

  return { id: 'expense-plans-filters', name: 'Expense Plans Filters', groups }
}
