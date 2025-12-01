import type { FilterConfiguration } from '@newwork/nw-design-system'

export const opportunityFilterConfig: FilterConfiguration = {
  id: 'opportunity-filters',
  name: 'Opportunity Filters',
  groups: [
    {
      id: 'stage-group',
      label: 'Stage',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'opportunityPipelineStageIds',
          field: 'opportunityPipelineStageIds',
          label: 'Stage',
          type: 'multi-select',
          config: {
            options: []
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
          id: 'opportunityStatusIds',
          field: 'opportunityStatusIds',
          label: 'Status',
          type: 'multi-select',
          config: {
            options: []
          }
        }
      ]
    },
    {
      id: 'forecast-group',
      label: 'Forecast',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'opportunityForecastIds',
          field: 'opportunityForecastIds',
          label: 'Forecast',
          type: 'multi-select',
          config: {
            options: []
          }
        }
      ]
    },
    {
      id: 'pipeline-group',
      label: 'Pipeline',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'opportunityPipelineIds',
          field: 'opportunityPipelineIds',
          label: 'Pipeline',
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
      id: 'account-group',
      label: 'Account',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'accountIds',
          field: 'accountIds',
          label: 'Account',
          type: 'multi-select',
          config: {
            options: []
          }
        }
      ]
    },
    {
      id: 'amount-group',
      label: 'Amount Range',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'amount',
          field: 'amount',
          label: 'Amount Range',
          type: 'number',
          config: {
            mode: 'range',
            min: 0,
            max: 1000000,
            step: 100,
            placeholderMin: 'Min Amount',
            placeholderMax: 'Max Amount'
          }
        }
      ]
    },
    {
      id: 'date-group',
      label: 'Close Date',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'closeDateRange',
          field: 'closeDateRange',
          label: 'Close Date',
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
