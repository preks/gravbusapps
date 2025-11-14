import type { FilterConfiguration } from '@newwork/nw-design-system'

export const taskFilterConfig: FilterConfiguration = {
  id: 'task-filters',
  name: 'Task Filters',
  groups: [
    {
      id: 'status-group',
      label: 'Status',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'taskStatusIds',
          field: 'taskStatusIds',
          label: 'Status',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically
            options: [],
            searchPlaceholder: 'Search status...',
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
      defaultExpanded: true,
      filters: [
        {
          id: 'taskPriorityIds',
          field: 'taskPriorityIds',
          label: 'Priority',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically
            options: [],
            searchPlaceholder: 'Search priorities...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'type-group',
      label: 'Task Type',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'taskTypeIds',
          field: 'taskTypeIds',
          label: 'Type',
          type: 'multi-select',
          config: {
            // Options will be populated dynamically from catalog data
            options: [],
            searchPlaceholder: 'Search types...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'due-date-group',
      label: 'Schedule / Due Date',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'dueDateRange',
          field: 'dueDateRange',
          label: 'Schedule / Due Date Range',
          type: 'date',
          config: {
            mode: 'range'
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
          label: 'Created Date Range',
          type: 'date',
          config: {
            mode: 'range'
          }
        }
      ]
    },
    {
      id: 'reference-group',
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
              { id: 'lead', label: 'Lead' },
              { id: 'account', label: 'Account' },
              { id: 'contact', label: 'Contact' },
              { id: 'opportunity', label: 'Opportunity' },
              { id: 'investment', label: 'Investment' }
            ]
          }
        }
      ]
    }
  ]
}
