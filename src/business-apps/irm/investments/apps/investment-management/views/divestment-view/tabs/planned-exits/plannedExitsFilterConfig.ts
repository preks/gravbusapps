import type { FilterConfiguration } from '@newwork/nw-design-system'
import { overviewInvestmentFilterConfig } from '../../../investment-view/data/investmentFilterConfig'

const REUSED_GROUP_IDS = new Set([
  'investment-group-group',
  'owner-group',
  'investment-type-group',
  'investment-status-group'
])

/**
 * Filter configuration for the Planned Exits tab.
 * Reuses Investment Group, Owner, Type and Status groups from the shared
 * investment filter config and adds Planned-Exits-specific filters:
 * planned exit date range and the two amount ranges.
 * Currency is handled separately via the secondary-actions dropdown.
 */
export const plannedExitsFilterConfig: FilterConfiguration = {
  id: 'planned-exits-filters',
  name: 'Planned Exits Filters',
  groups: [
    ...overviewInvestmentFilterConfig.groups.filter(g => REUSED_GROUP_IDS.has(g.id)),
    {
      id: 'planned-exit-date-group',
      label: 'Planned Exit Date',
      collapsible: true,
      defaultExpanded: false,
      filters: [
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
        }
      ]
    },
    {
      id: 'amount-group',
      label: 'Total Investment Amount',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'totalInvestmentAmountRange',
          field: 'totalInvestmentAmountRange',
          label: 'Total Investment Amount',
          type: 'number',
          config: {
            mode: 'range',
            min: 0,
            max: 100000000,
            step: 10000,
            placeholderMin: 'Min Amount',
            placeholderMax: 'Max Amount'
          }
        }
      ]
    },
    {
      id: 'market-value-group',
      label: 'Market Value',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'investmentMarketValueRange',
          field: 'investmentMarketValueRange',
          label: 'Market Value',
          type: 'number',
          config: {
            mode: 'range',
            min: 0,
            max: 100000000,
            step: 10000,
            placeholderMin: 'Min Value',
            placeholderMax: 'Max Value'
          }
        }
      ]
    }
  ]
}
