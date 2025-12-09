/**
 * IRM-specific wrapper for useTopAccountsByRevenue
 * Uses Investment entity names and junction table for opportunities
 */
import { useTopAccountsByRevenue as useGenericTopAccounts } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

export const useTopAccountsByRevenue = (accessToken: string, currencyCode?: string) => {
  const IRM_TOP_ACCOUNTS_CONFIG = {
    accountEntity: 'InvestmentAccount',
    opportunityEntity: 'InvestmentOpportunity',
    industryField: 'industryClass',
    opportunityRelation: 'opportunityAccounts',
    isJunctionTable: true,
    currencyCode
  }

  return useGenericTopAccounts(accessToken, IRM_TOP_ACCOUNTS_CONFIG)
}
export type { TopAccountData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
