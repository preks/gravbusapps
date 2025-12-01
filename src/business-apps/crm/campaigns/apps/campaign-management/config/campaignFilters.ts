import type { FilterConfiguration } from '@newwork/nw-design-system'

export const campaignFilterConfig: FilterConfiguration = {
  id: 'campaign-filters',
  name: 'Campaign Filters',
  groups: [
    {
      id: 'type-group',
      label: 'Campaign Type',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'types',
          field: 'types',
          label: 'Campaign Type',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search types...'
          }
        }
      ]
    },
    {
      id: 'status-group',
      label: 'Status',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'status',
          field: 'status',
          label: 'Status',
          type: 'multi-select',
          config: {
            options: [
              { id: 'planned', label: 'Planned' },
              { id: 'active', label: 'Active' },
              { id: 'completed', label: 'Completed' }
            ],
            searchPlaceholder: 'Search statuses...'
          }
        }
      ]
    },
    {
      id: 'date-group',
      label: 'Date Ranges',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'startDateRange',
          field: 'startDateRange',
          label: 'Start Date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'From Date',
            placeholderEnd: 'To Date',
            showClearButton: true
          }
        },
        {
          id: 'endDateRange',
          field: 'endDateRange',
          label: 'End Date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'From Date',
            placeholderEnd: 'To Date',
            showClearButton: true
          }
        },
        {
          id: 'createdAtRange',
          field: 'createdAtRange',
          label: 'Created Date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'From Date',
            placeholderEnd: 'To Date',
            showClearButton: true
          }
        }
      ]
    }
  ]
}
