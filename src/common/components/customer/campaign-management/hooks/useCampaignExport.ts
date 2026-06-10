import { useCallback } from 'react'
import { formatExportDate } from '@/common/utils/excelExportUtils'
import { useExportBase } from '@/common/hooks/useExportBase'
import type { Campaign } from '../types/CampaignManagementLayoutTypes'

// ─── Column definitions ───────────────────────────────────────────────────────

export const CAMPAIGN_EXPORT_COLUMNS = [
  { key: 'name', title: 'Campaign' },
  { key: 'type', title: 'Type' },
  { key: 'status', title: 'Status' },
  { key: 'startDate', title: 'Start Date' },
  { key: 'endDate', title: 'End Date' },
  { key: 'createdAt', title: 'Created Date' }
] as const

const CAMPAIGN_DATE_COLUMN_KEYS = new Set(['startDate', 'endDate', 'createdAt'])

// ─── Formatters ───────────────────────────────────────────────────────────────

export const formatCampaignForExport = (campaign: Campaign): Record<string, string> => ({
  name: campaign.name || '-',
  type: campaign.type?.value || '-',
  status: campaign.customerCampaignStatus?.value || campaign.customerCampaignStatus?.code || '-',
  startDate: formatExportDate(campaign.startDate),
  endDate: formatExportDate(campaign.endDate),
  createdAt: formatExportDate(campaign.createdAt)
})

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseCampaignExportOptions {
  fetchCampaigns: (variables: Record<string, any>) => Promise<{ SalesCampaign?: any[] }>
  queryVariables: Record<string, any>
  totalCount: number
  filenamePrefix?: string
}

export function useCampaignExport({
  fetchCampaigns,
  queryVariables,
  totalCount,
  filenamePrefix = 'campaigns'
}: UseCampaignExportOptions) {
  const fetchAllItems = useCallback(async (): Promise<Campaign[]> => {
    const result = await fetchCampaigns({ ...queryVariables, limit: totalCount, offset: 0 })
    return result.SalesCampaign || []
  }, [fetchCampaigns, queryVariables, totalCount])

  return useExportBase<Campaign>({
    fetchAllItems,
    formatItem: formatCampaignForExport,
    columns: CAMPAIGN_EXPORT_COLUMNS,
    dateColumnKeys: CAMPAIGN_DATE_COLUMN_KEYS,
    sheetName: 'Campaigns',
    entityLabel: 'campaigns',
    totalCount,
    filenamePrefix
  })
}
