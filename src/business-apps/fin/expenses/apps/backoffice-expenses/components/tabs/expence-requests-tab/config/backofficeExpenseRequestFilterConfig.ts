import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  createDateRangeFilterGroup,
  createStatusFilterGroupWithLabel,
  createTypeFilterGroup
} from '@/business-apps/fin/expenses/common/config/filterConfigHelpers'

/**
 * Options for building a {@link FilterConfiguration} aligned with backoffice list filters
 * (effective / creation date, department, employee, status, request type, amount). Employee search
 * and selection are composed in the tab hook (text + multi-select). Currency stays in the toolbar.
 */
export interface BackofficeExpenseRequestFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
  departmentOptions: Array<{ id: string; label: string }>
  effectiveDateGroupInfo?: string
  t: (key: string) => string
}

export function createBackofficeExpenseRequestFilterConfig({
  statusOptions,
  filterLabelMap,
  departmentOptions,
  effectiveDateGroupInfo,
  t
}: BackofficeExpenseRequestFilterConfigOptions): FilterConfiguration {
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

  const groups: FilterConfiguration['groups'] = [
    createDateRangeFilterGroup(
      'effectiveDate',
      'effectiveDateRange',
      'lowcoder:personal_expenses.effective_date',
      'Effective Date',
      effectiveDateGroupInfo,
      t
    ),
    createDateRangeFilterGroup(
      'requestDate',
      'requestDateRange',
      'lowcoder:confirm_transfer_advance_payment.request_date_label',
      'Request Date',
      undefined,
      t
    ),
    {
      id: 'department-group',
      label: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_list.employee_report_filter.department',
        'Department'
      ),
      collapsible: true,
      defaultExpanded: false,
      showSearchAbove: true,
      filters: [
        {
          id: 'departmentIds',
          field: 'departmentIds',
          label: getTranslationFromI18nKeyAndLabel(
            'lowcoder:employee_list.employee_report_filter.department',
            'Department'
          ),
          type: 'multi-select',
          config: { options: departmentOptions, showSearch: true }
        }
      ]
    },
    createStatusFilterGroupWithLabel(statusFilters, t('filter-status')),
    createTypeFilterGroup(
      'requestType',
      'requestTypeIds',
      'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type',
      'Request Type',
      requestTypeOptions
    ),
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
            placeholderMin: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_plan_list.expense_plan_table.min_amount',
              'Min Amount'
            ),
            placeholderMax: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expense_plan_list.expense_plan_table.max_amount',
              'Max Amount'
            )
          }
        }
      ]
    }
  ]

  return {
    id: 'backoffice-expense-requests-filters',
    name: getTranslationFromI18nKeyAndLabel(
      'lowcoder:expense_request_list.expense_plan_table.title',
      'Filter Expense Requests'
    ),
    groups
  }
}
