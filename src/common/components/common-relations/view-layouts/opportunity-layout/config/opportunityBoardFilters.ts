import type { FilterConfiguration } from '@newwork/nw-design-system'

/**
 * Base filter configuration for Opportunity Board
 * Owner filter will be dynamically populated with employees from current pipeline
 */
export const opportunityBoardFilterConfig: FilterConfiguration = {
  id: 'opportunity-board-filters',
  name: 'Board Filters',
  groups: [
    {
      id: 'owner-group',
      label: 'Owner',
      collapsible: false,
      filters: [
        {
          id: 'owner',
          field: 'owner',
          label: 'Owner',
          type: 'multi-select',
          config: {
            options: [], // Will be populated dynamically with "Me" + pipeline employees
            placeholder: 'All Opportunities',
            searchable: true
          }
        }
      ]
    }
  ]
}

export default opportunityBoardFilterConfig
