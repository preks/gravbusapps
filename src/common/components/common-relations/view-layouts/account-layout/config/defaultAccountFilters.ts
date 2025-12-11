import type { FilterConfiguration } from '@newwork/nw-design-system'

/**
 * Default Account Filter Configuration
 * Can be extended in context-specific views (Customer/Investment)
 */
export const commonAccountFilterConfig: FilterConfiguration = {
  id: 'account-filters',
  name: 'Account Filters',
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
            searchPlaceholder: 'Search industries...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'legal-form-group',
      label: 'Legal Form',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'legalFormIds',
          field: 'legalFormIds',
          label: 'Legal Form',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search legal forms...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'company-size-group',
      label: 'Company Size',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'companySizeIds',
          field: 'companySizeIds',
          label: 'Company Size',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search company sizes...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'revenue-group',
      label: 'Revenue Band',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'accountAnnualRevenueBandIds',
          field: 'accountAnnualRevenueBandIds',
          label: 'Revenue Band',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search revenue bands...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'priority-group',
      label: 'Priority',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'accountPriorityIds',
          field: 'accountPriorityIds',
          label: 'Priority',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search priorities...',
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
      defaultExpanded: false,
      filters: [
        {
          id: 'recordStates',
          field: 'recordStates',
          label: 'Status',
          type: 'multi-select',
          config: {
            options: [
              { id: 'ACTIVE', label: 'Active' },
              { id: 'INACTIVE', label: 'Inactive' },
              { id: 'DRAFT', label: 'Draft' },
              { id: 'ARCHIVED', label: 'Archived' }
            ]
          }
        }
      ]
    },
    {
      id: 'country-group',
      label: 'Country',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'countryIds',
          field: 'countryIds',
          label: 'Country',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search countries...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'contact-filters',
      label: 'Contact Information',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'communicationChannels',
          field: 'communicationChannels',
          label: 'Contact Info',
          type: 'multi-select',
          config: {
            options: [
              { id: 'has:email', label: 'Has Email' },
              { id: 'missing:email', label: 'Missing Email' },
              { id: 'has:phone', label: 'Has Phone' },
              { id: 'missing:phone', label: 'Missing Phone' },
              { id: 'has:website', label: 'Has Website' },
              { id: 'missing:website', label: 'Missing Website' }
            ]
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
