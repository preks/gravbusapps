import type { CustomerAccount } from '@/common/data/customer/types/customerAccountTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { formatExportText } from '../../utils/exportFormatHelpers'
import { buildCommonAccountExportFields } from './commonAccountExportFields'

export function buildCrmAccountExportFields(): ExportFieldDefinition<CustomerAccount>[] {
  const commonFields = buildCommonAccountExportFields<CustomerAccount>()

  const crmFields: ExportFieldDefinition<CustomerAccount>[] = [
    {
      key: 'salesCampaign',
      label: 'Sales Campaign',
      formKeys: ['salesCampaignId'],
      defaultSelected: false,
      format: account => formatExportText(account.salesCampaign?.name)
    }
  ]

  return [...commonFields, ...crmFields]
}
