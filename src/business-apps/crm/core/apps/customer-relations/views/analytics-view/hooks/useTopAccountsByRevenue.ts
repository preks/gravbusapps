/**
 * CRM-specific wrapper for useTopAccountsByRevenue
 * Uses CRM entity names and field mappings
 */
import { useTopAccountsByRevenue as useGenericTopAccounts } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const useTopAccountsByRevenue = (accessToken: string, currencyCode?: string) => {
  const CRM_TOP_ACCOUNTS_CONFIG = {
    accountEntity: 'Account',
    opportunityEntity: 'Opportunity',
    industryField: 'industry',
    opportunityRelation: 'opportunity',
    currencyCode
  }

  return useGenericTopAccounts(accessToken, CRM_TOP_ACCOUNTS_CONFIG)
}

export { useTopAccountsByRevenue }
export type { TopAccountData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
