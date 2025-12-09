/**
 * IRM-specific wrapper for useGenericAccountsOverTime
 * Uses Investment entity names
 */
import {
  useGenericAccountsOverTime,
  type AccountsTimeFilter,
  type AccountsOverTimePoint
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const IRM_ACCOUNTS_CONFIG = {
  accountEntity: 'InvestmentAccount',
  opportunityRelation: 'opportunityAccounts',
  isOpportunityRelationList: true,
  isJunctionTable: true
}

const useAccountsOverTime = (
  accessToken: string,
  timeFilter: 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical' = 'quarter'
) => {
  return useGenericAccountsOverTime(accessToken, IRM_ACCOUNTS_CONFIG, timeFilter)
}

export { useAccountsOverTime, type AccountsTimeFilter, type AccountsOverTimePoint }
