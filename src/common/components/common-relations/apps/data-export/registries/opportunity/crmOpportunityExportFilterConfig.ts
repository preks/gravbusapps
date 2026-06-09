import { buildExportFilterConfig, createEntityMultiSelectGroup } from '../../utils/filterConfigBuilders'
import { commonOpportunityExportFilterConfig } from './commonOpportunityExportFilterConfig'

/** CRM opportunity export filters — common filters plus sales campaign. */
export const crmOpportunityExportFilterConfig = buildExportFilterConfig(
  'crm-opportunity-export-filters',
  'CRM Opportunity Export Filters',
  [
    ...commonOpportunityExportFilterConfig.groups,
    createEntityMultiSelectGroup(
      'sales-campaign-group',
      'filter-sales-campaign',
      'salesCampaignIds',
      'filter-sales-campaign',
      'filter-search-campaigns'
    )
  ]
)
