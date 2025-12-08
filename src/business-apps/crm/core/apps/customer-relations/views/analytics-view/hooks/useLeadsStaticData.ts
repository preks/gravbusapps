// CRM-specific wrapper for shared generic leads static data hook
import { useGenericLeadsStaticData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'

// Re-export shared types with CRM-specific names for backward compatibility
export type {
  LeadSourceData,
  LeadRatingData,
  LeadStatusData,
  LeadVelocityDataPoint as LeadVelocityMonthlyData,
  LeadOwnerData as TopLeadOwnerData,
  LeadCatalogEntry as LeadStatusCatalogEntry,
  GenericLeadsStaticData as LeadsStaticData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'

export const useLeadsStaticData = (accessToken: string) => {
  // Use shared generic hook with CRM-specific configuration
  return useGenericLeadsStaticData(accessToken, {
    entityName: 'Lead',
    entityAggregate: 'LeadAggregate',
    includeTopOwners: true // CRM needs top owners
  })
}
