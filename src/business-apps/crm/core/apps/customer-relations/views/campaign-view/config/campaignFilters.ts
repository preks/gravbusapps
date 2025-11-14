import type { FilterConfiguration } from '@newwork/nw-design-system'

export const campaignFilterConfig: FilterConfiguration = {
  id: 'campaign-filters',
  name: 'Campaign Filters',
  groups: [
    {
      id: 'campaign-filters',
      label: 'Campaign Filters',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'types',
          field: 'types',
          label: 'Campaign Type',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically from catalog data
            options: []
          }
        },
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
            ]
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
          id: 'startDateAfter',
          field: 'startDateAfter',
          label: 'Start Date After',
          type: 'text',
          config: {}
        },
        {
          id: 'startDateBefore',
          field: 'startDateBefore',
          label: 'Start Date Before',
          type: 'text',
          config: {}
        },
        {
          id: 'endDateAfter',
          field: 'endDateAfter',
          label: 'End Date After',
          type: 'text',
          config: {}
        },
        {
          id: 'endDateBefore',
          field: 'endDateBefore',
          label: 'End Date Before',
          type: 'text',
          config: {}
        },
        {
          id: 'createdAfter',
          field: 'createdAfter',
          label: 'Created After',
          type: 'text',
          config: {}
        },
        {
          id: 'createdBefore',
          field: 'createdBefore',
          label: 'Created Before',
          type: 'text',
          config: {}
        }
      ]
    }
  ]
}
