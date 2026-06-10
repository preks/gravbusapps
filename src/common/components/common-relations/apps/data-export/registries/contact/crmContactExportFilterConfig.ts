import { buildExportFilterConfig, createEntityMultiSelectGroup } from '../../utils/filterConfigBuilders'
import { commonContactExportFilterConfig } from './commonContactExportFilterConfig'

/** CRM contact export filters — common filters plus sales campaign. */
export const crmContactExportFilterConfig = buildExportFilterConfig(
  'crm-contact-export-filters',
  'CRM Contact Export Filters',
  [
    ...commonContactExportFilterConfig.groups,
    createEntityMultiSelectGroup(
      'sales-campaign-group',
      'filter-sales-campaign',
      'salesCampaignIds',
      'filter-sales-campaign',
      'filter-search-campaigns'
    )
  ]
)
