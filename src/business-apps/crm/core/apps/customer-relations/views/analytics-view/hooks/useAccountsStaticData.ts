/**
 * CRM-specific wrapper for useGenericAccountsStaticData
 * Uses CRM entity names and field mappings
 */
import { useGenericAccountsStaticData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const CRM_ACCOUNTS_CONFIG = {
  accountEntity: 'Account',
  opportunityEntity: 'Opportunity',
  opportunityRelation: 'opportunityAccounts',
  isOpportunityRelationList: false, // CRM uses singular relationship pattern
  isJunctionTable: true
}

export const useAccountsStaticData = (accessToken: string) => {
  return useGenericAccountsStaticData(accessToken, CRM_ACCOUNTS_CONFIG)
}

export type {
  TopAccountData,
  MonthlyGrowthPoint,
  AccountsStaticData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
