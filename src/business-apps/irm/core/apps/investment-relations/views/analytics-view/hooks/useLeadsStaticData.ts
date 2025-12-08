// IRM-specific wrapper for shared generic leads static data hook
import {
  useGenericLeadsStaticData,
  GenericLeadsStaticData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'

// Re-export types for backward compatibility
export type {
  LeadSourceData,
  LeadRatingData,
  LeadStatusData,
  LeadVelocityDataPoint,
  LeadOwnerData,
  LeadCatalogEntry as LeadSourceCatalogEntry,
  LeadCatalogEntry as LeadRatingCatalogEntry,
  LeadCatalogEntry as LeadStatusCatalogEntry
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'

export type LeadsStaticData = GenericLeadsStaticData

export const useLeadsStaticData = (accessToken: string) => {
  // Use shared generic hook with IRM-specific configuration
  return useGenericLeadsStaticData(accessToken, {
    entityName: 'InvestmentLead',
    entityAggregate: 'InvestmentLeadAggregate',
    includeTopOwners: false // IRM doesn't need top owners
  })
}
