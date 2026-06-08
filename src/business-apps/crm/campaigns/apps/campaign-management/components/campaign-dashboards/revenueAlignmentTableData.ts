import type { RevenueAlignmentRow } from '@/common/data/customer/queries/campaignDashboardQueries'
import { formatOptionalRevenueAlignmentCurrency, formatRevenueAlignmentCurrency } from './revenueAlignmentTableConfig'

export const formatRevenueAlignmentRowForExport = (row: RevenueAlignmentRow): Record<string, string> => ({
  name: row.name || '-',
  status: row.customerCampaignStatus?.value || row.customerCampaignStatus?.code || '-',
  segment: row.customerCampaignSegment?.value || row.customerCampaignSegment?.code || '-',
  budgetAllocated: row.budgetAllocated == null ? '-' : formatRevenueAlignmentCurrency(row.budgetAllocated),
  pipelineTarget: row.pipelineTarget == null ? '-' : formatRevenueAlignmentCurrency(row.pipelineTarget),
  pipelineGenerated: formatRevenueAlignmentCurrency(row.pipelineGenerated),
  opportunitiesCreated: row.opportunitiesCreated.toLocaleString(),
  costPerOpportunity: formatOptionalRevenueAlignmentCurrency(row.costPerOpportunity),
  totalEventBudget: formatOptionalRevenueAlignmentCurrency(row.totalEventBudget),
  totalPipelineFromEvents: formatOptionalRevenueAlignmentCurrency(row.totalPipelineFromEvents),
  revenueClosed: formatRevenueAlignmentCurrency(row.revenueClosed),
  percentToGoal: `${row.percentToGoal}%`
})
