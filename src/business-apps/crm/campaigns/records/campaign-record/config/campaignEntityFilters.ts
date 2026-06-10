import type { FilterConfiguration } from '@newwork/nw-design-system'

export const campaignEntityFilterConfig: FilterConfiguration = {
  id: 'campaign-entity-filters',
  name: 'Campaign Entity Filters',
  groups: [
    {
      id: 'entity-type-group',
      label: 'Entity Type',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'type',
          field: 'type',
          label: 'Entity Type',
          type: 'multi-select',
          config: {
            options: [
              { id: 'lead', label: 'Lead' },
              { id: 'account', label: 'Account' },
              { id: 'contact', label: 'Contact' },
              { id: 'opportunity', label: 'Opportunity' }
            ]
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
            options: [],
            searchPlaceholder: 'Search statuses...'
          }
        }
      ]
    },
    {
      id: 'creation-date-group',
      label: 'Creation Date',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'createdAt',
          field: 'createdAt',
          label: 'Creation Date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'Start Date',
            placeholderEnd: 'End Date',
            showClearButton: true
          }
        }
      ]
    }
  ]
}
