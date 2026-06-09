import { buildExportFilterConfig, createEntityMultiSelectGroup } from '../../utils/filterConfigBuilders'
import { commonLeadExportFilterConfig } from './commonLeadExportFilterConfig'

/** CRM lead export filters — common filters plus sales campaign (form-savable). */
export const crmLeadExportFilterConfig = buildExportFilterConfig('crm-lead-export-filters', 'CRM Lead Export Filters', [
  ...commonLeadExportFilterConfig.groups,
  createEntityMultiSelectGroup(
    'sales-campaign-group',
    'filter-sales-campaign',
    'salesCampaignIds',
    'filter-sales-campaign',
    'filter-search-campaigns'
  )
])
