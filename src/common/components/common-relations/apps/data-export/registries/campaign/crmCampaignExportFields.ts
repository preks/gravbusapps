import type { SalesCampaign } from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaign-list/types/SalesCampaignTypes'
import type { ExportFieldDefinition } from '../../types/exportFieldTypes'
import { formatExportCatalog, formatExportDateValue, formatExportText } from '../../utils/exportFormatHelpers'
import { formatCampaignExportStatus } from './campaignExportHelpers'
import { buildRecordIdExportField } from '../../utils/exportExternalIdFieldBuilders'

/** Export fields derived from the campaign form (name, type, dates, description). */
export function buildCrmCampaignExportFields(): ExportFieldDefinition<SalesCampaign>[] {
  return [
    {
      key: 'name',
      label: 'Campaign',
      formKeys: ['name'],
      defaultSelected: true,
      format: campaign => formatExportText(campaign.name)
    },
    {
      key: 'typeRef',
      label: 'Type',
      formKeys: ['typeRef'],
      defaultSelected: true,
      format: campaign => formatExportCatalog(campaign.type)
    },
    {
      key: 'status',
      label: 'Status',
      formKeys: ['startDate', 'endDate'],
      defaultSelected: true,
      format: campaign => formatExportText(formatCampaignExportStatus(campaign))
    },
    {
      key: 'startDate',
      label: 'Start Date',
      formKeys: ['startDate'],
      defaultSelected: true,
      isDateColumn: true,
      format: campaign => formatExportDateValue(campaign.startDate)
    },
    {
      key: 'endDate',
      label: 'End Date',
      formKeys: ['endDate'],
      defaultSelected: true,
      isDateColumn: true,
      format: campaign => formatExportDateValue(campaign.endDate)
    },
    {
      key: 'description',
      label: 'Description',
      formKeys: ['description'],
      defaultSelected: false,
      format: campaign => formatExportText(campaign.description)
    },
    {
      key: 'createdAt',
      label: 'Created Date',
      formKeys: [],
      defaultSelected: true,
      isDateColumn: true,
      format: campaign => formatExportDateValue(campaign.createdAt)
    },
    buildRecordIdExportField<SalesCampaign>('Campaign ID')
  ]
}
