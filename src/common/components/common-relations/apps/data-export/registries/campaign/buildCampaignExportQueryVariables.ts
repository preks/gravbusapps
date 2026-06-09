import { normalizeDateRange } from '@/common/utils/dateRangeNormalizer'
import type { SalesCampaignQueryVariables } from '@/business-apps/crm/campaigns/apps/campaign-management/components/campaign-list/types/SalesCampaignTypes'

export interface CampaignExportQueryVariables extends SalesCampaignQueryVariables {
  /** Applied client-side after GraphQL fetch (status is computed from dates). */
  statusFilters?: string[]
}

function processDateRangeFilter(filters: Record<string, unknown>, rangeKey: string) {
  const normalized = normalizeDateRange(filters[rangeKey] as string | string[] | undefined | null)

  if (!normalized || (!normalized.from && !normalized.to)) {
    return { from: undefined, to: undefined }
  }

  const from = normalized.from ? new Date(`${normalized.from}T00:00:00.000Z`).toISOString() : undefined
  const to = normalized.to ? new Date(`${normalized.to}T23:59:59.999Z`).toISOString() : undefined

  return { from, to }
}

export function buildCampaignExportQueryVariables(
  selectedFilters: Record<string, unknown>,
  pagination?: { limit?: number; offset?: number }
): CampaignExportQueryVariables {
  const startDate = processDateRangeFilter(selectedFilters, 'startDateRange')
  const endDate = processDateRangeFilter(selectedFilters, 'endDateRange')
  const createdDate = processDateRangeFilter(selectedFilters, 'createdAtRange')

  const typeValues = selectedFilters.types
  const campaignTypes = Array.isArray(typeValues)
    ? typeValues.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : undefined

  const statusValues = selectedFilters.status
  const statusFilters = Array.isArray(statusValues)
    ? statusValues.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : undefined

  return {
    limit: pagination?.limit,
    offset: pagination?.offset,
    campaignTypes: campaignTypes && campaignTypes.length > 0 ? campaignTypes : undefined,
    startDateAfter: startDate.from,
    startDateBefore: startDate.to,
    endDateAfter: endDate.from,
    endDateBefore: endDate.to,
    createdAfter: createdDate.from,
    createdBefore: createdDate.to,
    statusFilters: statusFilters && statusFilters.length > 0 ? statusFilters : undefined,
    orderBy: [{ createdAt: 'DESC' }]
  }
}
