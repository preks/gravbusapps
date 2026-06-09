import {
  buildExportFilterConfig,
  createDateRangeGroup,
  createEntityMultiSelectGroup
} from '../../utils/filterConfigBuilders'

const plannedExitFilterGroup = {
  id: 'planned-exit-group',
  label: 'filter-planned-exit',
  collapsible: true,
  defaultExpanded: false,
  filters: [
    {
      id: 'planedExit',
      field: 'planedExit',
      label: 'filter-planned-exit',
      type: 'multi-select' as const,
      config: {
        options: [
          { id: 'true', label: 'filter-yes' },
          { id: 'false', label: 'filter-no' }
        ],
        searchPlaceholder: 'filter-select',
        totalCount: 2,
        hasMore: false
      }
    }
  ]
}

/** IRM investment export filters — overview filters (all groups) with catalog-backed options. */
export const irmInvestmentExportFilterConfig = buildExportFilterConfig(
  'irm-investment-export-filters',
  'IRM Investment Export Filters',
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
      'owner-group',
      'filter-owner',
      'ownerEmployeeIds',
      'filter-owner',
      'filter-search-owners',
      true
    ),
    createEntityMultiSelectGroup(
      'investment-type-group',
      'filter-investment-type',
      'investmentTypeIds',
      'filter-investment-type',
      'filter-search-investment-types'
    ),
    createEntityMultiSelectGroup(
      'investment-status-group',
      'filter-investment-status',
      'investmentStatusIds',
      'filter-investment-status',
      'filter-search-investment-statuses'
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
    plannedExitFilterGroup,
    createDateRangeGroup(
      'planned-exit-date-group',
      'filter-planned-exit-date',
      'plannedExitDateRange',
      'filter-planned-exit-date'
    ),
    createDateRangeGroup('created-date-group', 'filter-created-date', 'createdAtRange', 'filter-created-date')
  ]
)
