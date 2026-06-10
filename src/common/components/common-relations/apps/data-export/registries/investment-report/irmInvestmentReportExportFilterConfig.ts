import {
  buildExportFilterConfig,
  createDateRangeGroup,
  createEntityMultiSelectGroup
} from '../../utils/filterConfigBuilders'

/** IRM investment report export filters — overview (all groups) with catalog-backed options. */
export const irmInvestmentReportExportFilterConfig = buildExportFilterConfig(
  'irm-investment-report-export-filters',
  'IRM Investment Report Export Filters',
  [
    createEntityMultiSelectGroup(
      'investment-group-group',
      'filter-investment-group',
      'investmentGroupIds',
      'filter-investment-group',
      'filter-search-investment-groups',
      true
    ),
    createEntityMultiSelectGroup(
      'investment-ids-group',
      'filter-investment',
      'investmentIds',
      'filter-investment',
      'filter-search-investments'
    ),
    createEntityMultiSelectGroup(
      'investment-type-group',
      'filter-investment-type',
      'investmentTypeIds',
      'filter-investment-type',
      'filter-search-investment-types',
      true
    ),
    createEntityMultiSelectGroup(
      'owner-group',
      'filter-owner',
      'ownerEmployeeIds',
      'filter-owner',
      'filter-search-owners',
      true
    ),
    {
      id: 'account-group',
      label: 'filter-account',
      collapsible: true,
      defaultExpanded: false,
      filters: [
        {
          id: 'investmentAccountIds',
          field: 'investmentAccountIds',
          label: 'filter-account',
          type: 'multi-select',
          config: {
            options: [],
            searchPlaceholder: 'filter-search-accounts',
            totalCount: 0,
            hasMore: false
          }
        }
      ]
    },
    createEntityMultiSelectGroup(
      'report-status-group',
      'filter-report-status',
      'investmentStatusIds',
      'filter-report-status',
      'filter-search-report-statuses'
    ),
    createEntityMultiSelectGroup(
      'linked-investment-status-group',
      'filter-investment-status',
      'linkedInvestmentStatusIds',
      'filter-investment-status',
      'filter-search-investment-statuses'
    ),
    createEntityMultiSelectGroup(
      'investment-stake-type-group',
      'filter-investment-stake-type',
      'investmentStakeTypeIds',
      'filter-investment-stake-type',
      'filter-search-investment-stake-types'
    ),
    createEntityMultiSelectGroup(
      'investment-phase-group',
      'filter-investment-phase',
      'investmentPhaseIds',
      'filter-investment-phase',
      'filter-search-investment-phases'
    ),
    createEntityMultiSelectGroup(
      'investment-risk-level-group',
      'filter-investment-risk-level',
      'investmentRiskLevelIds',
      'filter-investment-risk-level',
      'filter-search-investment-risk-levels'
    ),
    createEntityMultiSelectGroup(
      'currency-group',
      'filter-currency',
      'currencyIds',
      'filter-currency',
      'filter-search-currencies'
    ),
    createEntityMultiSelectGroup(
      'liquid-fund-type-group',
      'filter-liquid-fund-type',
      'investmentLiquidFundTypeIds',
      'filter-liquid-fund-type',
      'filter-search-liquid-fund-types'
    ),
    createDateRangeGroup('report-date-group', 'filter-report-date', 'dateRange', 'filter-report-date', true),
    createDateRangeGroup(
      'planned-exit-date-group',
      'filter-planned-exit-date',
      'plannedExitDateRange',
      'filter-planned-exit-date'
    ),
    createDateRangeGroup('created-date-group', 'filter-created-date', 'createdAtRange', 'filter-created-date')
  ]
)
