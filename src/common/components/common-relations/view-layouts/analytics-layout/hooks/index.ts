// Shared analytics hooks for CRM and IRM

// Generic hooks (configurable for any module)
export { useGenericLeadsStaticData } from './useGenericLeadsStaticData'
export { useGenericLeadsOverTime } from './useGenericLeadsOverTime'
export { useGenericOverviewData } from './useGenericOverviewData'
export { useGenericAccountsStaticData } from './useGenericAccountsStaticData'
export { useGenericAccountsOverTime } from './useGenericAccountsOverTime'
export { useTopAccountsByRevenue } from './useTopAccountsByRevenue'
export { useGenericContactsStaticData } from './useGenericContactsStaticData'
export { useGenericContactsOverTime } from './useGenericContactsOverTime'

// Shared analytics hooks (used by both CRM and IRM)
export { useActivityHeatmap } from './useActivityHeatmap'
export { useDealHealthData } from './useDealHealthData'
export { useLeadsTrendData } from './useLeadsTrendData'
export { useRevenueTrends } from './useRevenueTrends'
export { useTopDeals } from './useTopDeals'
export { useTopRevenueEarners } from './useTopRevenueEarners'

// Export types - Generic hooks
export type {
  LeadSourceData,
  LeadRatingData,
  LeadStatusData,
  LeadVelocityDataPoint,
  LeadOwnerData,
  LeadCatalogEntry,
  GenericLeadsStaticData,
  LeadsEntityConfig
} from './useGenericLeadsStaticData'

export type { LeadsOverTimePoint, LeadStatusCatalogEntry } from './useGenericLeadsOverTime'

export type {
  OverviewEntityConfig,
  OverviewCounts,
  OverviewConversionMetrics,
  OverviewTrendData,
  GeographicDataPoint,
  GenericOverviewData
} from './useGenericOverviewData'

// Export types - Generic hooks (accounts)
export type {
  TopAccountData,
  MonthlyGrowthPoint,
  AccountIndustryData,
  AccountSizeData,
  AccountsStaticData,
  AccountsEntityConfig
} from './useGenericAccountsStaticData'

export type { AccountsTimeFilter, AccountsOverTimePoint, AccountsOverTimeConfig } from './useGenericAccountsOverTime'

// Export types - Generic hooks (contacts)
export type { ContactsStaticData, ContactsEntityConfig } from './useGenericContactsStaticData'

export type { ContactsOverTimePoint, ContactsTimeFilter, ContactsOverTimeConfig } from './useGenericContactsOverTime'

// Export types - Shared hooks
export type { ActivityHeatmapData } from './useActivityHeatmap'
export type { RevenueTrendData, TimeFilter } from './useRevenueTrends'
export type { DealHealthData } from './useDealHealthData'
export type { TopDeal } from './useTopDeals'
export type { TopRevenueContact } from './useTopRevenueEarners'
export type { LeadsTrendData } from './useLeadsTrendData'
