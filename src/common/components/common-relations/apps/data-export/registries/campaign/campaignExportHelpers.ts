import dayjs from 'dayjs'
import type { SalesCampaign } from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaign-list/types/SalesCampaignTypes'

export type CampaignExportStatus = 'planned' | 'active' | 'completed'

const CAMPAIGN_STATUS_LABELS: Record<CampaignExportStatus, string> = {
  planned: 'Planned',
  active: 'Active',
  completed: 'Completed'
}

export function getCampaignExportStatus(campaign: SalesCampaign): CampaignExportStatus {
  if (!campaign.startDate || !campaign.endDate) {
    return 'planned'
  }

  const now = dayjs()
  const startDate = dayjs(campaign.startDate)
  const endDate = dayjs(campaign.endDate)

  if (now.isBefore(startDate, 'day')) {
    return 'planned'
  }
  if (now.isAfter(endDate, 'day')) {
    return 'completed'
  }
  return 'active'
}

export function formatCampaignExportStatus(campaign: SalesCampaign): string {
  return CAMPAIGN_STATUS_LABELS[getCampaignExportStatus(campaign)]
}

export function filterCampaignsByExportStatus(
  campaigns: SalesCampaign[],
  statusFilters: string[] | undefined
): SalesCampaign[] {
  if (!statusFilters || statusFilters.length === 0) {
    return campaigns
  }

  return campaigns.filter(campaign => statusFilters.includes(getCampaignExportStatus(campaign)))
}
