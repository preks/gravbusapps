/**
 * CRM-specific wrapper for useGenericAccountsOverTime
 * Uses CRM entity names
 */
import { useGenericAccountsOverTime } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

export type {
  AccountsTimeFilter,
  AccountsOverTimePoint
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const CRM_ACCOUNTS_CONFIG = {
  accountEntity: 'Account',
  opportunityRelation: 'opportunity'
}

export const useAccountsOverTime = (
  accessToken: string,
  timeFilter: 'month' | 'quarter' | 'sixMonths' | 'year' | 'historical' = 'quarter'
) => {
  return useGenericAccountsOverTime(accessToken, timeFilter, CRM_ACCOUNTS_CONFIG)
}
