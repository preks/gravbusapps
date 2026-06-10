import type { CustomerOpportunity } from '@/common/data/customer/types/customerOpportunityTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { formatExportText } from '../../utils/exportFormatHelpers'
import { buildCommonOpportunityExportFields } from './commonOpportunityExportFields'

export function buildCrmOpportunityExportFields(): ExportFieldDefinition<CustomerOpportunity>[] {
  const commonFields = buildCommonOpportunityExportFields<CustomerOpportunity>()

  const crmFields: ExportFieldDefinition<CustomerOpportunity>[] = [
    {
      key: 'salesCampaign',
      label: 'Sales Campaign',
      formKeys: ['salesCampaignId'],
      defaultSelected: false,
      format: opportunity => formatExportText(opportunity.salesCampaign?.name)
    }
  ]

  return [...commonFields, ...crmFields]
}
