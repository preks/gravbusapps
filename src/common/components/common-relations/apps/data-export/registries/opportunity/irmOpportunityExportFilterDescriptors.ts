import { INVESTMENT_OPPORTUNITY_DESCRIPTORS } from '@/common/data/investment/types/investmentOpportunityTypes'
import { resolveExportFilterDescriptors } from '../../utils/resolveExportFilterDescriptors'
import { irmOpportunityExportFilterConfig } from './irmOpportunityExportFilterConfig'

/**
 * IRM opportunity export filter descriptors.
 * Dedupes `accountIds` (common vs junction-table definitions) for filter-group queries.
 */
export const IRM_OPPORTUNITY_EXPORT_FILTER_DESCRIPTORS = resolveExportFilterDescriptors(
  INVESTMENT_OPPORTUNITY_DESCRIPTORS,
  irmOpportunityExportFilterConfig
)
