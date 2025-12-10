// Shared analytics hooks for CRM and IRM

// Generic hooks (configurable for any module)
export {
  useGenericLeadsStaticData,
  type LeadSourceData,
  type LeadRatingData,
  type LeadStatusData,
  type LeadVelocityDataPoint,
  type LeadOwnerData,
  type LeadCatalogEntry,
  type GenericLeadsStaticData,
  type LeadsEntityConfig
} from './useGenericLeadsStaticData'

export {
  useGenericLeadsOverTime,
  type LeadsOverTimePoint,
  type LeadStatusCatalogEntry
} from './useGenericLeadsOverTime'

export {
  useGenericOverviewData,
  type OverviewEntityConfig,
  type OverviewCounts,
  type OverviewConversionMetrics,
  type OverviewTrendData,
  type GeographicDataPoint,
  type GenericOverviewData
} from './useGenericOverviewData'

export {
  useGenericAccountsStaticData,
  type TopAccountData,
  type MonthlyGrowthPoint,
  type AccountIndustryData,
  type AccountSizeData,
  type AccountsStaticData,
  type AccountsEntityConfig
} from './useGenericAccountsStaticData'

export {
  useGenericAccountsOverTime,
  type AccountsTimeFilter,
  type AccountsOverTimePoint,
  type AccountsOverTimeConfig
} from './useGenericAccountsOverTime'

export { useTopAccountsByRevenue } from './useTopAccountsByRevenue'

export {
  useGenericContactsStaticData,
  type ContactsStaticData,
  type ContactsEntityConfig
} from './useGenericContactsStaticData'

export {
  useGenericContactsOverTime,
  type ContactsOverTimePoint,
  type ContactsTimeFilter,
  type ContactsOverTimeConfig
} from './useGenericContactsOverTime'

export {
  useGenericOpportunitiesStaticData,
  type OpportunitiesEntityConfig,
  type GenericOpportunitiesStaticData
} from './useGenericOpportunitiesStaticData'

export {
  useGenericOpportunitiesOverTime,
  type OpportunityTimeSeriesData,
  type TimeFilter as OpportunitiesTimeFilter,
  type OpportunitiesOverTimeConfig
} from './useGenericOpportunitiesOverTime'

// Shared analytics hooks (used by both CRM and IRM)
export { useActivityHeatmap, type ActivityHeatmapData } from './useActivityHeatmap'
export { useDealHealthData, type DealHealthData } from './useDealHealthData'
export { useLeadsTrendData, type LeadsTrendData } from './useLeadsTrendData'
export { useRevenueTrends, type RevenueTrendData, type TimeFilter } from './useRevenueTrends'
export { useTopDeals, type TopDeal } from './useTopDeals'
export { useTopRevenueEarners, type TopRevenueContact } from './useTopRevenueEarners'
