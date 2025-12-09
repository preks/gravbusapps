// CRM-specific wrapper for shared generic leads static data hook
import {
  useGenericLeadsStaticData,
  type LeadVelocityDataPoint,
  type LeadOwnerData,
  type LeadCatalogEntry,
  type GenericLeadsStaticData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'

// Re-export types with CRM-specific names for backward compatibility
export type LeadVelocityMonthlyData = LeadVelocityDataPoint
export type TopLeadOwnerData = LeadOwnerData
export type LeadStatusCatalogEntry = LeadCatalogEntry
export type LeadsStaticData = GenericLeadsStaticData

export const useLeadsStaticData = (accessToken: string) => {
  // Use shared generic hook with CRM-specific configuration
  return useGenericLeadsStaticData(accessToken, {
    entityName: 'Lead',
    entityAggregate: 'LeadAggregate',
    includeTopOwners: true // CRM needs top owners
  })
}

export type {
  LeadSourceData,
  LeadRatingData,
  LeadStatusData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'
