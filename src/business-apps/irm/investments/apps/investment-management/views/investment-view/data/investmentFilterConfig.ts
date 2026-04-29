import type { FilterConfiguration } from '@newwork/nw-design-system'

/**
 * Investment filter sidebar is composed of two layers:
 *
 * 1. DEFAULT filters (defined here) — always rendered on every tab because they
 *    apply to every investment regardless of its type or group. Keep this list
 *    restricted to fields that exist on the base Investment entity (e.g. owner,
 *    status, account, createdAt). These never depend on the catalog.
 *
 * 2. CATALOG-DRIVEN filters — appended dynamically per group/type by
 *    `buildDynamicFilterConfiguration` in `investmentListColumnTransformer.tsx`,
 *    derived from the group's `formFieldsDefinition`. They surface fields that
 *    only make sense for specific groups (e.g. Acquisition Date, Maturity Date,
 *    Interest Rate, …) and only appear on tabs whose catalog defines them.
 *
 * Rule of thumb: if a field is NOT guaranteed to exist on every investment,
 * leave it to the catalog layer instead of hard-coding it here.
 */

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
      id: 'planned-exit-group',
      label: 'Planned Exit',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'planedExit',
          field: 'planedExit',
          label: 'Planned Exit',
          type: 'multi-select',
          config: {
            options: [
              { id: 'true', label: 'Yes' },
              { id: 'false', label: 'No' }
            ],
            totalCount: 2,
            hasMore: false
          }
        }
      ]
    },
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
      id: 'created-group',
      label: 'Created',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'createdAtRange',
          field: 'createdAtRange',
          label: 'Created',
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
