import type { FilterConfiguration } from '@newwork/nw-design-system';

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
          id: 'status',
          field: 'status',
          label: 'Status',
          type: 'multi-select',
          config: {
            options: [
              { id: 'InvestmentTaskStatus:v1:PENDING', label: 'Pending' },
              { id: 'InvestmentTaskStatus:v1:IN_PROGRESS', label: 'In Progress' },
              { id: 'InvestmentTaskStatus:v1:COMPLETED', label: 'Completed' },
              { id: 'InvestmentTaskStatus:v1:DONE', label: 'Done' },
              { id: 'InvestmentTaskStatus:v1:OVERDUE', label: 'Overdue' },
              { id: 'InvestmentTaskStatus:v1:CANCELLED', label: 'Cancelled' }
            ]
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
          id: 'priority',
          field: 'priority',
          label: 'Priority',
          type: 'multi-select',
          config: {
            options: [
              { id: 'InvestmentTaskPriority:v1:LOW', label: 'Low' },
              { id: 'InvestmentTaskPriority:v1:MEDIUM', label: 'Medium' },
              { id: 'InvestmentTaskPriority:v1:HIGH', label: 'High' },
              { id: 'InvestmentTaskPriority:v1:URGENT', label: 'Urgent' }
            ]
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
          id: 'type',
          field: 'type',
          label: 'Type',
          type: 'multi-select',
          config: {
            options: [
              { id: 'InvestmentTaskType:v1:CALL', label: 'Call' },
              { id: 'InvestmentTaskType:v1:EMAIL', label: 'Email' },
              { id: 'InvestmentTaskType:v1:MEETING', label: 'Meeting' },
              { id: 'InvestmentTaskType:v1:TODO', label: 'To-Do' },
              { id: 'InvestmentTaskType:v1:FOLLOW_UP', label: 'Follow Up' },
              { id: 'InvestmentTaskType:v1:RESEARCH', label: 'Research' },
              { id: 'InvestmentTaskType:v1:REVIEW', label: 'Review' }
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
        },
        {
          id: 'dueDateAfter',
          field: 'dueDateAfter',
          label: 'Due Date After',
          type: 'text',
          config: {}
        },
        {
          id: 'dueDateBefore',
          field: 'dueDateBefore',
          label: 'Due Date Before',
          type: 'text',
          config: {}
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
              { id: 'opportunity', label: 'Opportunity' }
            ]
          }
        }
      ]
    }
  ]
};
