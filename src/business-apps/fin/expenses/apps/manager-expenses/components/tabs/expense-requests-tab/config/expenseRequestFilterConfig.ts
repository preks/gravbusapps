import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface ExpenseRequestFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
}

export function createExpenseRequestFilterConfig({
  statusOptions,
  filterLabelMap
}: ExpenseRequestFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))
  const requestTypeOptions = [
    {
      id: 'ExpenseRequestType:v1:EXPENSES',
      label:
        filterLabelMap?.['ExpenseRequestType:v1:EXPENSES'] ??
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.expense', 'Expense')
    },
    {
      id: 'ExpenseRequestType:v1:TRIP',
      label:
        filterLabelMap?.['ExpenseRequestType:v1:TRIP'] ??
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
      id: 'requestDate-group',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:confirm_transfer_advance_payment.request_date_label',
        'Request Date'
      ),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'requestDateRange',
          field: 'requestDateRange',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:confirm_transfer_advance_payment.request_date_label',
            'Request Date'
          ),
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
      id: 'requestType-group',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type',
        'Request Type'
      ),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'requestTypeIds',
          field: 'requestTypeIds',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type',
            'Request Type'
          ),
          type: 'multi-select',
          config: { options: requestTypeOptions }
        }
      ]
    }
  ]

  return {
    id: 'expense-requests-filters',
    name: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_plan_table.title',
      'Expense Requests Filters'
    ),
    groups
  }
}
