import type { FilterConfiguration } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import {
  createDateRangeFilterGroup,
  createStatusFilterGroup,
  createTypeFilterGroup
} from '../../../../common/config/filterConfigHelpers'

/**
 * Options for building a {@link FilterConfiguration} aligned with backoffice list filters
 * (effective / creation date, status, request type). Currency, department, employee, and amount
 * stay in the DataFilter sidebar until migrated.
 */
export interface BackofficeExpenseRequestFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
}

export function createBackofficeExpenseRequestFilterConfig({
  statusOptions,
  filterLabelMap
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
      'Effective Date'
    ),
    createDateRangeFilterGroup(
      'requestDate',
      'requestDateRange',
      'lowcoder:confirm_transfer_advance_payment.request_date_label',
      'Request Date'
    ),
    createStatusFilterGroup(statusFilters),
    createTypeFilterGroup(
      'requestType',
      'requestTypeIds',
      'lowcoder:expense_calculation_rule.expense_calculation_rule_modal.affected_expense_modal.request_type',
      'Request Type',
      requestTypeOptions
    )
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
