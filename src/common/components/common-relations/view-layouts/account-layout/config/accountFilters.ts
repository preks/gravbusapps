import type { FilterConfiguration } from '@newwork/nw-design-system'

export const accountFilterConfig: FilterConfiguration = {
  id: 'account-filters',
  name: 'Account Filters',
  groups: [
    {
      id: 'account-filters',
      label: 'Account Filters',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'owners',
          field: 'owners',
          label: 'Owner',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'industries',
          field: 'industries',
          label: 'Industry',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'legalForms',
          field: 'legalForms',
          label: 'Legal Form',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'companySizes',
          field: 'companySizes',
          label: 'Company Size',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'revenueBands',
          field: 'revenueBands',
          label: 'Revenue Band',
          type: 'multi-select',
          config: {
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
            options: []
          }
        },
        {
          id: 'regions',
          field: 'regions',
          label: 'Region',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'cities',
          field: 'cities',
          label: 'City',
          type: 'multi-select',
          config: {
            options: []
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
          id: 'contactInfo',
          field: 'contactInfo',
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
