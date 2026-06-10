import { CUSTOMER_OPPORTUNITY_DESCRIPTORS } from '@/common/data/customer/types/customerOpportunityTypes'
import { resolveExportFilterDescriptors } from '../../utils/resolveExportFilterDescriptors'
import { crmOpportunityExportFilterConfig } from './crmOpportunityExportFilterConfig'

/**
 * CRM opportunity export filter descriptors.
 * Dedupes `accountIds` (common vs junction-table definitions) for filter-group queries.
 */
export const CRM_OPPORTUNITY_EXPORT_FILTER_DESCRIPTORS = resolveExportFilterDescriptors(
  CUSTOMER_OPPORTUNITY_DESCRIPTORS,
  crmOpportunityExportFilterConfig
)
