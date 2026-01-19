import type { FilterConfiguration } from '@newwork/nw-design-system'

/**
 * Default Contact Filter Configuration
 * Can be extended in context-specific views (Customer/Investment)
 */
export const commonContactFilterConfig: FilterConfiguration = {
  id: 'contact-filters',
  name: 'Contact Filters',
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
      id: 'department-group',
      label: 'Department',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'departmentIds',
          field: 'departmentIds',
          label: 'Department',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search departments...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'job-position-group',
      label: 'Job Position',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'jobPositions',
          field: 'jobPositions',
          label: 'Job Position',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search job positions...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'academic-title-group',
      label: 'Academic Title',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'academicTitleIds',
          field: 'academicTitleIds',
          label: 'Academic Title',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search academic titles...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'salutation-group',
      label: 'Salutation',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'salutationIds',
          field: 'salutationIds',
          label: 'Salutation',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search salutations...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'language-group',
      label: 'Language',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'languageIds',
          field: 'languageIds',
          label: 'Language',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search languages...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'contact-info-group',
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
              { id: 'missing:phone', label: 'Missing Phone' }
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
