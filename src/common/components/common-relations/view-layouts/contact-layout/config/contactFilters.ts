import type { FilterConfiguration } from '@newwork/nw-design-system'

export const contactFilterConfig: FilterConfiguration = {
  id: 'contact-filters',
  name: 'Contact Filters',
  groups: [
    {
      id: 'contact-filters',
      label: 'Contact Filters',
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
          id: 'contactTypes',
          field: 'contactTypes',
          label: 'Contact Type',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'accounts',
          field: 'accounts',
          label: 'Account',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'genders',
          field: 'genders',
          label: 'Gender',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'academicTitles',
          field: 'academicTitles',
          label: 'Academic Title',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'professionalTitles',
          field: 'professionalTitles',
          label: 'Professional Title',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'departments',
          field: 'departments',
          label: 'Department',
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
      id: 'contact-info-filters',
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
