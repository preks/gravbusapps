import type { FilterConfiguration } from '@newwork/nw-design-system'

export const leadFilterConfig: FilterConfiguration = {
  id: 'investment-lead-filters',
  name: 'Investment Lead Filters',
  groups: [
    {
      id: 'status-group',
      label: 'Lead Status',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'leadStatuses',
          field: 'leadStatuses',
          label: 'Status',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically from catalog data
            options: []
          }
        }
      ]
    },
    {
      id: 'rating-group',
      label: 'Lead Rating',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'leadRatings',
          field: 'leadRatings',
          label: 'Rating',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically from catalog data
            options: []
          }
        }
      ]
    },
    {
      id: 'source-group',
      label: 'Lead Source',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'leadSources',
          field: 'leadSources',
          label: 'Source',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically from catalog data
            options: []
          }
        }
      ]
    },
    {
      id: 'owner-group',
      label: 'Owner',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'owners',
          field: 'owners',
          label: 'Owner',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically from employee data
            options: []
          }
        }
      ]
    },
    {
      id: 'geography-group',
      label: 'Geography',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'countries',
          field: 'countries',
          label: 'Country',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically
            options: []
          }
        },
        {
          id: 'regions',
          field: 'regions',
          label: 'Region',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically
            options: []
          }
        },
        {
          id: 'cities',
          field: 'cities',
          label: 'City',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically
            options: []
          }
        }
      ]
    },
    {
      id: 'date-group',
      label: 'Date Range',
      collapsible: true,
      defaultExpanded: false,
      filters: [
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
    },
    {
      id: 'sensitive-group',
      label: 'Data Sensitivity',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'sensitive',
          field: 'sensitive',
          label: 'Sensitive Data',
          type: 'multi-select',
          config: {
            options: [
              { id: 'true', label: 'Sensitive Only' },
              { id: 'false', label: 'Non-Sensitive Only' }
            ]
          }
        }
      ]
    }
  ]
}
