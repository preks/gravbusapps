/**
 * Re-export shared useLeadsTrendData hook from common location
 * This reduces code duplication between CRM and IRM modules
 *
 * Note: IRM uses 'InvestmentLead' as the entity name
 */
import {
  useLeadsTrendData as useSharedLeadsTrendData,
  type TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

/**
 * Wrapper hook for IRM that uses 'InvestmentLead' entity
 */
export const useLeadsTrendData = (accessToken: string, selectedTimeFilter: TimeFilter) => {
  return useSharedLeadsTrendData(accessToken, selectedTimeFilter, 'InvestmentLead')
}

export type {
  LeadsTrendData,
  TimeFilter
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
