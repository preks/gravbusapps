import { buildExportFilterConfig, createEntityMultiSelectGroup } from '../../utils/filterConfigBuilders'
import { commonLeadExportFilterConfig } from './commonLeadExportFilterConfig'

/** IRM lead export filters — common filters plus investment group/type (form-savable). */
export const irmLeadExportFilterConfig = buildExportFilterConfig('irm-lead-export-filters', 'IRM Lead Export Filters', [
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
  ...commonLeadExportFilterConfig.groups
])
