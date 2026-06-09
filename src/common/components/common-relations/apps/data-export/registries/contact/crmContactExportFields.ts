import type { CustomerContact } from '@/common/data/customer/types/customerContactTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { formatExportText } from '../../utils/exportFormatHelpers'
import { buildCommonContactExportFields } from './commonContactExportFields'

export function buildCrmContactExportFields(): ExportFieldDefinition<CustomerContact>[] {
  const commonFields = buildCommonContactExportFields<CustomerContact>()

  const crmFields: ExportFieldDefinition<CustomerContact>[] = [
    {
      key: 'salesCampaign',
      label: 'Sales Campaign',
      formKeys: ['salesCampaignId'],
      defaultSelected: false,
      format: contact => formatExportText(contact.salesCampaign?.name)
    }
  ]

  return [...commonFields, ...crmFields]
}
