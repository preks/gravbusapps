import type { FilterConfiguration } from '@newwork/nw-design-system'

export const activityFilterConfig: FilterConfiguration = {
  id: 'activity-filters',
  name: 'Activity Filters',
  groups: [
    {
      id: 'activity-type-group',
      label: 'Activity Type',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'activityTypeIds',
          field: 'activityTypeIds',
          label: 'Activity Type',
          type: 'multi-select',
          config: {
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
          id: 'ownerEmployeeIds',
          field: 'ownerEmployeeIds',
          label: 'Owner',
          type: 'multi-select',
          config: {
            options: []
          }
        }
      ]
    },
    {
      id: 'reference-type-group',
      label: 'Reference Type',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'referenceType',
          field: 'referenceType',
          label: 'Reference Type',
          type: 'multi-select',
          config: {
            options: [
              { id: 'account', label: 'Account', value: 'account' },
              { id: 'contact', label: 'Contact', value: 'contact' },
              { id: 'lead', label: 'Lead', value: 'lead' },
              { id: 'opportunity', label: 'Opportunity', value: 'opportunity' }
            ]
          }
        }
      ]
    },
    {
      id: 'created-date-group',
      label: 'Created Date',
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
    },
    {
      id: 'occurred-date-group',
      label: 'Occurred Date',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'occurredAtRange',
          field: 'occurredAtRange',
          label: 'Occurred Date',
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
