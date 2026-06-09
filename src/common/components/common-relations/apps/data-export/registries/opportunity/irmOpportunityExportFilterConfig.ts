import { buildExportFilterConfig, createEntityMultiSelectGroup } from '../../utils/filterConfigBuilders'
import { commonOpportunityExportFilterConfig } from './commonOpportunityExportFilterConfig'

/** IRM opportunity export filters — common filters plus investment group/type. */
export const irmOpportunityExportFilterConfig = buildExportFilterConfig(
  'irm-opportunity-export-filters',
  'IRM Opportunity Export Filters',
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
      'investment-type-group',
      'filter-investment-type',
      'investmentTypeIds',
      'filter-investment-type',
      'filter-search-investment-types',
      true
    ),
    ...commonOpportunityExportFilterConfig.groups
  ]
)
