import type { FilterConfiguration } from '@newwork/nw-design-system'

export interface PersonalAdvancePaymentFilterConfigOptions {
  filterLabelMap: Record<string, string>
  t: (key: string) => string
}

export function createPersonalAdvancePaymentFilterConfig({
  filterLabelMap,
  t
}: PersonalAdvancePaymentFilterConfigOptions): FilterConfiguration {
  const statusFilters = Object.keys(filterLabelMap)
    .filter(
      k => !k.startsWith('currency:') && k !== 'amountRange' && k !== 'advanceRange' && k !== 'cardCreatedAtRange'
    )
    .map(s => ({ id: s, label: filterLabelMap[s] || s }))

  const statusGroup: FilterConfiguration['groups'][number] = {
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
  }

  const statusGroupWithCardChip: FilterConfiguration['groups'][number] = {
    ...statusGroup,
    filters: [
      ...statusGroup.filters,
      {
        id: 'cardCreatedAtRange',
        field: 'cardCreatedAtRange',
        label: t('personal-expenses-filter-created-in-month'),
        type: 'text',
        config: {}
      }
    ]
  }

  const groups: FilterConfiguration['groups'] = [
    statusGroupWithCardChip,
    {
      id: 'amount-group',
      label: t('personal-expenses-filter-amount-range-label'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'amount',
          field: 'amount',
          label: t('personal-expenses-filter-amount-range-label'),
          type: 'number',
          config: {
            mode: 'range',
            min: 0,
            max: 1000000,
            step: 100,
            placeholderMin: t('personal-expenses-filter-min-amount-plain'),
            placeholderMax: t('personal-expenses-filter-max-amount-plain')
          }
        }
      ]
    },
    {
      id: 'advance-group',
      label: t('personal-expenses-filter-advance-range-label'),
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'advance',
          field: 'advance',
          label: t('personal-expenses-filter-advance-range-label'),
          type: 'number',
          config: {
            mode: 'range',
            min: 0,
            max: 1000000,
            step: 100,
            placeholderMin: t('personal-expenses-filter-min-advance-plain'),
            placeholderMax: t('personal-expenses-filter-max-advance-plain')
          }
        }
      ]
    }
  ]

  return { id: 'advance-payments-filters', name: t('filter-advance-payments-title'), groups }
}
