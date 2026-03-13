import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ExpensePlanFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
}

/**
 * Builds FilterConfiguration for the manager expense plans DataDisplay filter sheet.
 * Status and plan type options are dynamic; date range filters are fixed.
 */
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

  const dateRangeConfig = {
    dateType: 'date' as const,
    mode: 'range' as const,
    placeholder: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start date'),
    placeholderEnd: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End date'),
    showClearButton: true
  }

  const groups: FilterConfiguration['groups'] = [
    {
      id: 'effectiveDate-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'effectiveDateRange',
          field: 'effectiveDateRange',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.effective_date', 'Effective Date'),
          type: 'date',
          config: dateRangeConfig
        }
      ]
    },
    {
      id: 'planDate-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'planDateRange',
          field: 'planDateRange',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.plan_details.plan_date', 'Plan Date'),
          type: 'date',
          config: dateRangeConfig
        }
      ]
    },
    {
      id: 'startDate-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'startDateRange',
          field: 'startDateRange',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.start_date', 'Start Date'),
          type: 'date',
          config: dateRangeConfig
        }
      ]
    },
    {
      id: 'endDate-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'endDateRange',
          field: 'endDateRange',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.end_date', 'End Date'),
          type: 'date',
          config: dateRangeConfig
        }
      ]
    },
    {
      id: 'status-group',
      label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'statusIds',
          field: 'statusIds',
          label: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
          type: 'multi-select',
          config: { options: statusFilters }
        }
      ]
    },
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
    }
  ]

  return { id: 'expense-plans-filters', name: 'Expense Plans Filters', groups }
}
