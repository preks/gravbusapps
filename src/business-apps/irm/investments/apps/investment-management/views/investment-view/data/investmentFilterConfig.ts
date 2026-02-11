import type { FilterConfiguration } from '@newwork/nw-design-system'

/**
 * Base Investment Filter Configuration
 * Used for all tabs (Overview, LiquidFund, RealEstate, Equity)
 * Investment Group filter is added separately for Overview tab only
 */
export const baseInvestmentFilterConfig: FilterConfiguration = {
  id: 'investment-filters',
  name: 'Investment Filters',
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
      id: 'investment-type-group',
      label: 'Investment Type',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'investmentTypeIds',
          field: 'investmentTypeIds',
          label: 'Investment Type',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search investment types...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'investment-status-group',
      label: 'Investment Status',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'investmentStatusIds',
          field: 'investmentStatusIds',
          label: 'Investment Status',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search statuses...',
            totalCount: 0,
            hasMore: false
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
          id: 'investmentAccountIds',
          field: 'investmentAccountIds',
          label: 'Account',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search accounts...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'opportunity-group',
      label: 'Opportunity',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'opportunityIds',
          field: 'opportunityIds',
          label: 'Opportunity',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search opportunities...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    {
      id: 'date-group',
      label: 'Date Ranges',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'acquisitionDateRange',
          field: 'acquisitionDateRange',
          label: 'Acquisition Date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'Start Date',
            placeholderEnd: 'End Date',
            showClearButton: true
          }
        },
        {
          id: 'plannedExitDateRange',
          field: 'plannedExitDateRange',
          label: 'Planned Exit Date',
          type: 'date',
          config: {
            dateType: 'date',
            mode: 'range',
            placeholder: 'Start Date',
            placeholderEnd: 'End Date',
            showClearButton: true
          }
        },
        {
          id: 'exitDateRange',
          field: 'exitDateRange',
          label: 'Exit Date',
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

/**
 * Overview-specific filter config (includes Investment Group)
 */
export const overviewInvestmentFilterConfig: FilterConfiguration = {
  ...baseInvestmentFilterConfig,
  id: 'overview-investment-filters',
  groups: [
    {
      id: 'investment-group-group',
      label: 'Investment Group',
      collapsible: true,
      defaultExpanded: true,
      filters: [
        {
          id: 'investmentGroupIds',
          field: 'investmentGroupIds',
          label: 'Investment Group',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'Search investment groups...',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    ...baseInvestmentFilterConfig.groups
  ]
}
