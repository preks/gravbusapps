import type { FilterConfiguration } from '@newwork/nw-design-system'

export interface ExpensePlanFilterConfigOptions {
  statusOptions: string[]
  filterLabelMap: Record<string, string>
  t: (key: string) => string
}

function buildDateRangeConfig(t: (key: string) => string) {
  return {
    dateType: 'date' as const,
    mode: 'range' as const,
    placeholder: t('personal-expenses-date-placeholder-start'),
    placeholderEnd: t('personal-expenses-date-placeholder-end'),
    showClearButton: true
  }
}

function buildDateRangeGroup(
  t: (key: string) => string,
  id: string,
  field: string,
  label: string
): FilterConfiguration['groups'][number] {
  const dateConfig = buildDateRangeConfig(t)
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
        type: 'date',
        config: dateConfig
      }
    ]
  }
}

function buildNumberRangeGroup(
  t: (key: string) => string,
  groupId: string,
  field: string,
  label: string
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
          placeholderMin: t('expense-plans-filter-min-amount'),
          placeholderMax: t('expense-plans-filter-max-amount')
        }
      }
    ]
  }
}

export function createExpensePlanFilterConfig({
  statusOptions,
  filterLabelMap,
  t
}: ExpensePlanFilterConfigOptions): FilterConfiguration {
  const statusFilters = statusOptions.map(id => ({ id, label: filterLabelMap?.[id] ?? id }))
  const planTypeOptions = [
    {
      id: 'planType:EXPENSES',
      label: filterLabelMap?.['planType:EXPENSES'] ?? t('personal-expenses-label-expense')
    },
    {
      id: 'planType:TRIP',
      label: filterLabelMap?.['planType:TRIP'] ?? t('personal-expenses-label-trip')
    }
  ]

  const topDestinationLabel = t('expense-plans-filter-top-destination')
  const topDestinationOptions = Object.entries(filterLabelMap)
    .filter(([key]) => key.startsWith('topDestination:'))
    .map(([id, label]) => ({ id, label }))

  const groups: FilterConfiguration['groups'] = [
    buildDateRangeGroup(t, 'effectiveDate', 'effectiveDateRange', t('personal-expenses-label-effective-date')),
    buildDateRangeGroup(t, 'planDate', 'planDateRange', t('expense-plans-column-plan-date')),
    buildDateRangeGroup(t, 'startDate', 'startDateRange', t('personal-expenses-filter-label-start-date')),
    buildDateRangeGroup(t, 'endDate', 'endDateRange', t('personal-expenses-filter-label-end-date')),
    {
      id: 'status-group',
      label: t('expense-items-column-status'),
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'statusIds',
          field: 'statusIds',
          label: t('expense-items-column-status'),
          type: 'multi-select',
          config: { options: statusFilters }
        }
      ]
    },
    {
      id: 'planType-group',
      label: t('personal-expenses-label-plan-type'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'planTypeIds',
          field: 'planTypeIds',
          label: t('personal-expenses-label-plan-type'),
          type: 'multi-select',
          config: { options: planTypeOptions }
        },
        {
          id: 'topDestinationToolbarChipOnly',
          field: 'topDestinationIds',
          label: topDestinationLabel,
          type: 'multi-select',
          config: { options: topDestinationOptions }
        }
      ]
    },
    buildNumberRangeGroup(t, 'reimbursable-amount', 'reimbursableAmount', t('expense-items-column-reimbursable')),
    buildNumberRangeGroup(t, 'paid-advance', 'paidAdvance', t('expense-plans-filter-paid-advance'))
  ]

  return { id: 'expense-plans-filters', name: 'Expense Plans Filters', groups }
}
