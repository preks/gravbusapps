import type { FilterConfiguration } from '@newwork/nw-design-system'

export const opportunityFilterConfig: FilterConfiguration = {
  id: 'investment-opportunity-filters',
  name: 'Investment Opportunity Filters',
  groups: [
    {
      id: 'opportunity-filters',
      label: 'Opportunity Filters',
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
          id: 'pipelines',
          field: 'pipelines',
          label: 'Pipeline',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'stages',
          field: 'stages',
          label: 'Stage',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'statuses',
          field: 'statuses',
          label: 'Status',
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
        }
      ]
    },
    {
      id: 'investment-details',
      label: 'Investment Details',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'dealTypes',
          field: 'dealTypes',
          label: 'Deal Type',
          type: 'multi-select',
          config: {
            options: [
              { id: 'INVESTMENT_DEAL', label: 'Investment Deal' },
              { id: 'DIVESTMENT_DEAL', label: 'Divestment Deal' }
            ]
          }
        },
        {
          id: 'investmentGroups',
          field: 'investmentGroups',
          label: 'Investment Group',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'investmentTypes',
          field: 'investmentTypes',
          label: 'Investment Type',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'investmentRoles',
          field: 'investmentRoles',
          label: 'Investment Role',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'investmentStakeTypes',
          field: 'investmentStakeTypes',
          label: 'Investment Stake Type',
          type: 'multi-select',
          config: {
            options: []
          }
        },
        {
          id: 'currencies',
          field: 'currencies',
          label: 'Currency',
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
          id: 'amountMin',
          field: 'amountMin',
          label: 'Minimum Amount',
          type: 'text',
          config: {}
        },
        {
          id: 'amountMax',
          field: 'amountMax',
          label: 'Maximum Amount',
          type: 'text',
          config: {}
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
          id: 'closeDateAfter',
          field: 'closeDateAfter',
          label: 'Close Date After',
          type: 'text',
          config: {}
        },
        {
          id: 'closeDateBefore',
          field: 'closeDateBefore',
          label: 'Close Date Before',
          type: 'text',
          config: {}
        },
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
