import { buildExportFilterConfig, createEntityMultiSelectGroup } from '../../utils/filterConfigBuilders'
import { commonAccountExportFilterConfig } from './commonAccountExportFilterConfig'

/** CRM account export filters — common filters plus sales campaign. */
export const crmAccountExportFilterConfig = buildExportFilterConfig(
  'crm-account-export-filters',
  'CRM Account Export Filters',
  [
    ...commonAccountExportFilterConfig.groups,
    createEntityMultiSelectGroup(
      'sales-campaign-group',
      'filter-sales-campaign',
      'campaignIds',
      'filter-sales-campaign',
      'filter-search-campaigns'
    )
  ]
)
