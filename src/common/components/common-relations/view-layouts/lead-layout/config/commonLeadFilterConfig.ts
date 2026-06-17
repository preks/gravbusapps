import type { FilterConfiguration } from '@newwork/nw-design-system'

/**
 * Default Lead Filter Configuration
 * Base filter configuration shared across Customer and Investment Leads
 * Uses new structure with config object and field properties
 */
export const commonLeadFilterConfig: FilterConfiguration = {
  id: 'lead-filters',
  name: 'Lead Filters',
  groups: [
    {
      id: 'owner-group',
      label: 'Owner',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'ownerEmployeeIds',
          field: 'ownerEmployeeIds',
          label: 'Owner',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search owners...',
            totalCount: 0,
            hasMore: false
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
          id: 'leadStatusIds',
          field: 'leadStatusIds',
          label: 'Status',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search status...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'rating-group',
      label: 'Rating',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'leadRatingIds',
          field: 'leadRatingIds',
          label: 'Rating',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search rating...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'source-group',
      label: 'Source',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'leadSourceIds',
          field: 'leadSourceIds',
          label: 'Source',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search source...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'industry-group',
      label: 'Industry',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'industryClassIds',
          field: 'industryClassIds',
          label: 'Industry',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search industry...',
            totalCount: 0,
            hasMore: false
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
          id: 'createdAtRange',
          field: 'createdAtRange',
          label: 'Created Date',
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
