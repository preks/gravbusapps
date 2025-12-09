// IRM-specific wrapper for shared generic leads static data hook
import {
  useGenericLeadsStaticData,
  type GenericLeadsStaticData,
  type LeadSourceData,
  type LeadRatingData,
  type LeadStatusData,
  type LeadVelocityDataPoint,
  type LeadOwnerData,
  type LeadCatalogEntry
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'

export type LeadsStaticData = GenericLeadsStaticData
export type LeadSourceCatalogEntry = LeadCatalogEntry
export type LeadRatingCatalogEntry = LeadCatalogEntry
export type LeadStatusCatalogEntry = LeadCatalogEntry

const useLeadsStaticData = (accessToken: string) => {
  // Use shared generic hook with IRM-specific configuration
  return useGenericLeadsStaticData(accessToken, {
    entityName: 'InvestmentLead',
    entityAggregate: 'InvestmentLeadAggregate',
    includeTopOwners: false // IRM doesn't need top owners
  })
}

export {
  useLeadsStaticData,
  type LeadSourceData,
  type LeadRatingData,
  type LeadStatusData,
  type LeadVelocityDataPoint,
  type LeadOwnerData
}
