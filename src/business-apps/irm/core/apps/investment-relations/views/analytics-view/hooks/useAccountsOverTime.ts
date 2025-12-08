/**
 * IRM-specific wrapper for useGenericAccountsOverTime
 * Uses Investment entity names
 */
import { useGenericAccountsOverTime } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

export type {
  AccountsTimeFilter,
  AccountsOverTimePoint
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const IRM_ACCOUNTS_CONFIG = {
  accountEntity: 'InvestmentAccount',
  opportunityRelation: 'investmentOpportunity'
}

export const useAccountsOverTime = (
  accessToken: string,
  timeFilter: 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical' = 'quarter'
) => {
  return useGenericAccountsOverTime(accessToken, timeFilter, IRM_ACCOUNTS_CONFIG)
}
