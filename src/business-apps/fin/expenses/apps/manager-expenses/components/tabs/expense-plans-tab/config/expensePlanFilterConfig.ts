import type { FilterConfiguration } from '@newwork/nw-design-system'
import { createStatusFilterGroup } from '../../../../common/config/filterConfigHelpers'

export interface ExpensePlanFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
  statusGroupLabel?: string
  t: (key: string) => string
}

function createDateRangeFilterGroupWithT(
  t: (key: string) => string,
  id: string,
  field: string,
  labelFluentKey: string,
  groupInfo?: string
): FilterConfiguration['groups'][number] {
  const label = t(labelFluentKey)
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
          placeholder: t('expense-plans-filter-placeholder-start-date'),
          placeholderEnd: t('expense-plans-filter-placeholder-end-date'),
          showClearButton: true
        }
      }
    ]
  }
}

function createTypeFilterGroupWithT(
  t: (key: string) => string,
  id: string,
  field: string,
  labelFluentKey: string,
  typeOptions: Array<{ id: string; label: string }>
): FilterConfiguration['groups'][number] {
  const label = t(labelFluentKey)
  return {
    id: `${id}-group`,
    label,
    collapsible: true,
    defaultExpanded: false,
    filters: [
      {
        id: field,
        field,
        label,
        type: 'multi-select',
        config: { options: typeOptions }
      }
    ]
  }
}

function createExpenseAmountRangeFilterGroupWithT(
  t: (key: string) => string,
  groupId: string,
  field: string,
  labelFluentKey: string
): FilterConfiguration['groups'][number] {
  const label = t(labelFluentKey)
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
          placeholderMin: t('expense-plans-filter-amount-min'),
          placeholderMax: t('expense-plans-filter-amount-max')
        }
      }
    ]
  }
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
    createDateRangeFilterGroupWithT(
      t,
      'effectiveDate',
      'effectiveDateRange',
      'expense-plans-filter-effective-date',
      t('expense-plans-effective-date-info')
    ),
    createDateRangeFilterGroupWithT(t, 'planDate', 'planDateRange', 'expense-plans-filter-plan-date'),
    createDateRangeFilterGroupWithT(t, 'startDate', 'startDateRange', 'expense-plans-filter-start-date'),
    createDateRangeFilterGroupWithT(t, 'endDate', 'endDateRange', 'expense-plans-filter-end-date'),
    createStatusFilterGroup(
      statusFilters,
      'lowcoder:expense_request_list.expense_plan_table.status',
      'Status',
      statusGroupLabel
    ),
    createTypeFilterGroupWithT(t, 'planType', 'planTypeIds', 'expense-plans-filter-plan-type', planTypeOptions),
    createExpenseAmountRangeFilterGroupWithT(t, 'plan-amount', 'totalAmount', 'expense-plans-filter-amount')
  ]

  return { id: 'expense-plans-filters', name: t('expense-plans-filter-config-name'), groups }
}
