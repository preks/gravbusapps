import { CUSTOMER_CONTACT_DESCRIPTORS } from '@/common/data/customer/types/customerContactTypes'
import {
  patchExportFilterDescriptors,
  resolveExportFilterDescriptors
} from '../../utils/resolveExportFilterDescriptors'
import { crmContactExportFilterConfig } from './crmContactExportFilterConfig'

/**
 * CRM contact export filter descriptors.
 * `CustomerContactFields.salesCampaignId` maps to the relation name `salesCampaign`, but
 * Hasura `distinctOn` requires the FK column `salesCampaignId`.
 */
export const CRM_CONTACT_EXPORT_FILTER_DESCRIPTORS = patchExportFilterDescriptors(
  resolveExportFilterDescriptors(CUSTOMER_CONTACT_DESCRIPTORS, crmContactExportFilterConfig),
  {
    salesCampaignIds: { optionDistinctOn: ['salesCampaignId'] }
  }
)
