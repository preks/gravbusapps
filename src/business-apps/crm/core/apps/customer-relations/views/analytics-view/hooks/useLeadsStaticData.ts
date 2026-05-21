// CRM-specific wrapper for shared generic leads static data hook
import {
  useGenericLeadsStaticData,
  type LeadCatalogEntry,
  type GenericLeadsStaticData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'

// Re-export types with CRM-specific names for backward compatibility
export type LeadStatusCatalogEntry = LeadCatalogEntry
export type LeadsStaticData = GenericLeadsStaticData

export const useLeadsStaticData = (accessToken: string) => {
  // Use shared generic hook with CRM-specific configuration
  return useGenericLeadsStaticData(accessToken, {
    entityName: 'Lead',
    entityAggregate: 'LeadAggregate'
  })
}

export type {
  LeadSourceData,
  LeadStatusData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'
