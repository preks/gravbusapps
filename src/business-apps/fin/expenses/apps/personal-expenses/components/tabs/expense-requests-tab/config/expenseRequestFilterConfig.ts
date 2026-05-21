import type { FilterConfiguration } from '@newwork/nw-design-system'
import {
  createExpenseTripMultiSelectOptions,
  createStatusFilterGroupWithLabel
} from '@/business-apps/fin/expenses/common/config/filterConfigHelpers'

export interface ExpenseRequestFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
  t: (key: string) => string
}

function createDateRangeFilterGroupWithT(
  id: string,
  field: string,
  label: string,
  t: (key: string) => string,
  groupInfo?: string
): FilterConfiguration['groups'][number] {
  return {
    id: `${id}-group`,
    label,
    ...(groupInfo ? { info: groupInfo } : {}),
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label,
        type: 'date',
        config: {
          dateType: 'date' as const,
          mode: 'range' as const,
          placeholder: t('personal-expenses-date-placeholder-start'),
          placeholderEnd: t('personal-expenses-date-placeholder-end'),
          showClearButton: true
        }
      }
    ]
  }
}

function createNumberRangeFilterGroupWithT(
  groupId: string,
  field: string,
  label: string,
  t: (key: string) => string
): FilterConfiguration['groups'][number] {
  return {
    id: `${groupId}-group`,
    label,
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label,
        type: 'number',
        config: {
          mode: 'range' as const,
          min: 0,
          max: 10_000_000,
          step: 0.01,
          placeholderMin: t('personal-expenses-filter-min-amount-plain'),
          placeholderMax: t('personal-expenses-filter-max-amount-plain')
        }
      }
    ]
  }
}

export function createExpenseRequestFilterConfig({
  statusOptions,
  filterLabelMap,
  t
}: ExpenseRequestFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))
  const requestTypeOptions = createExpenseTripMultiSelectOptions(
    filterLabelMap,
    'ExpenseRequestType:v1:EXPENSES',
    'ExpenseRequestType:v1:TRIP',
    t
  )

  const groups: FilterConfiguration['groups'] = [
    createDateRangeFilterGroupWithT(
      'effectiveDate',
      'effectiveDateRange',
      t('personal-expenses-label-effective-date'),
      t,
      t('personal-expenses-effective-date-filter-info')
    ),
    createDateRangeFilterGroupWithT('requestDate', 'requestDateRange', t('personal-expenses-label-request-date'), t),
    createDateRangeFilterGroupWithT('startDate', 'startDateRange', t('personal-expenses-filter-label-start-date'), t),
    createDateRangeFilterGroupWithT('endDate', 'endDateRange', t('personal-expenses-filter-label-end-date'), t),
    createStatusFilterGroupWithLabel(statusFilters, t('expense-items-column-status')),
    {
      id: 'requestType-group',
      label: t('expense-requests-filter-request-type'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'requestTypeIds',
          field: 'requestTypeIds',
          label: t('expense-requests-filter-request-type'),
          type: 'multi-select',
          config: { options: requestTypeOptions }
        }
      ]
    },
    createNumberRangeFilterGroupWithT(
      'reimbursable-amount',
      'reimbursableAmount',
      t('expense-items-column-reimbursable'),
      t
    ),
    createNumberRangeFilterGroupWithT('advance-total', 'advanceTotal', t('personal-expenses-column-advance-payment'), t)
  ]

  return {
    id: 'expense-requests-filters',
    name: t('filter-expense-requests-title'),
    groups
  }
}
