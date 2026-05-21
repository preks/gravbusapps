// IRM-specific wrapper for shared generic leads static data hook
import {
  useGenericLeadsStaticData,
  type GenericLeadsStaticData,
  type LeadCatalogEntry
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'

export type LeadsStaticData = GenericLeadsStaticData
export type LeadSourceCatalogEntry = LeadCatalogEntry
export type LeadStatusCatalogEntry = LeadCatalogEntry

export const useLeadsStaticData = (accessToken: string) => {
  // Use shared generic hook with IRM-specific configuration
  return useGenericLeadsStaticData(accessToken, {
    entityName: 'InvestmentLead',
    entityAggregate: 'InvestmentLeadAggregate'
  })
}

export type {
  LeadSourceData,
  LeadStatusData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericLeadsStaticData'
