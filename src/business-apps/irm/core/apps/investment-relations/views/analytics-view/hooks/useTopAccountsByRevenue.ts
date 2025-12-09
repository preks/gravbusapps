/**
 * IRM-specific wrapper for useTopAccountsByRevenue
 * Uses Investment entity names and junction table for opportunities
 */
import {
  useTopAccountsByRevenue as useGenericTopAccounts,
  type TopAccountData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const useTopAccountsByRevenue = (accessToken: string, currencyCode?: string) => {
  const IRM_TOP_ACCOUNTS_CONFIG = {
    accountEntity: 'InvestmentAccount',
    opportunityEntity: 'InvestmentOpportunity',
    industryField: 'industryClass',
    opportunityRelation: 'opportunityAccounts', // ✅ Junction table (InvestmentOpportunityAccount)
    isJunctionTable: true, // ✅ CRITICAL: Enables junction table query syntax
    currencyCode
  }

  return useGenericTopAccounts(accessToken, IRM_TOP_ACCOUNTS_CONFIG)
}

export { useTopAccountsByRevenue, type TopAccountData }
