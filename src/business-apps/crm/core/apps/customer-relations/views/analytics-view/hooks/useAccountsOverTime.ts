/**
 * CRM-specific wrapper for useGenericAccountsOverTime
 * Uses CRM entity names
 */
import { useGenericAccountsOverTime } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const CRM_ACCOUNTS_CONFIG = {
  accountEntity: 'Account',
  opportunityRelation: 'opportunity'
  // isOpportunityRelationList defaults to false for CRM (singular relationship)
}

const useAccountsOverTime = (
  accessToken: string,
  timeFilter: 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical' = 'quarter'
) => {
  return useGenericAccountsOverTime(accessToken, CRM_ACCOUNTS_CONFIG, timeFilter)
}

export { useAccountsOverTime }
export type {
  AccountsTimeFilter,
  AccountsOverTimePoint
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
