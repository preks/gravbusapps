import type { CustomerLead } from '@/common/data/customer/types/customerLeadTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { formatExportText } from '../../utils/exportFormatHelpers'
import { buildCommonLeadExportFields } from './commonLeadExportFields'

export function buildCrmLeadExportFields(): ExportFieldDefinition<CustomerLead>[] {
  const commonFields = buildCommonLeadExportFields<CustomerLead>()

  const crmFields: ExportFieldDefinition<CustomerLead>[] = [
    {
      key: 'salesCampaign',
      label: 'Sales Campaign',
      formKeys: ['salesCampaignId'],
      defaultSelected: false,
      format: lead => formatExportText(lead.salesCampaign?.name)
    }
  ]

  return [...commonFields, ...crmFields]
}
