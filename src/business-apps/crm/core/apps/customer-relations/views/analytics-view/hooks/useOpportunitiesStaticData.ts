import {
  useGenericOpportunitiesStaticData,
  type GenericOpportunitiesStaticData as OpportunitiesStaticData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesStaticData'

/**
 * CRM-specific wrapper for useGenericOpportunitiesStaticData
 */
const useOpportunitiesStaticData = (accessToken: string, currencyCode?: string) => {
  return useGenericOpportunitiesStaticData(
    accessToken,
    {
      opportunityEntity: 'Opportunity',
      leadEntity: 'Lead',
      leadEntityAggregate: 'LeadAggregate',
      convertedLeadStatusCode: 'CONVERTED',
      wonStatusCode: 'WON'
    },
    currencyCode
  )
}

export { useOpportunitiesStaticData, type OpportunitiesStaticData }
