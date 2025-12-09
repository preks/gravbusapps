import {
  useGenericOpportunitiesStaticData,
  type GenericOpportunitiesStaticData as OpportunitiesStaticData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericOpportunitiesStaticData'

/**
 * IRM-specific wrapper for useGenericOpportunitiesStaticData
 */
const useOpportunitiesStaticData = (accessToken: string, currencyCode?: string) => {
  return useGenericOpportunitiesStaticData(
    accessToken,
    {
      opportunityEntity: 'InvestmentOpportunity',
      leadEntity: 'InvestmentLead',
      leadEntityAggregate: 'InvestmentLeadAggregate',
      convertedLeadStatusCode: 'CONVERTED', // Same as CRM - single status code
      wonStatusCode: 'WON'
    },
    currencyCode
  )
}

export { useOpportunitiesStaticData, type OpportunitiesStaticData }
