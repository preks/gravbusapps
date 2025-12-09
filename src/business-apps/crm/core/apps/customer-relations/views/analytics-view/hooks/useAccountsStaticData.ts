/**
 * CRM-specific wrapper for useGenericAccountsStaticData
 * Uses CRM entity names and field mappings
 */
import {
  useGenericAccountsStaticData,
  type TopAccountData,
  type MonthlyGrowthPoint,
  type AccountIndustryData,
  type AccountSizeData,
  type AccountsStaticData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const CRM_ACCOUNTS_CONFIG = {
  accountEntity: 'Account',
  opportunityEntity: 'Opportunity',
  industryField: 'industry',
  sizeField: 'numberOfEmployees',
  opportunityRelation: 'opportunity'
  // isOpportunityRelationList defaults to false for CRM (singular relationship)
}

const useAccountsStaticData = (accessToken: string) => {
  return useGenericAccountsStaticData(accessToken, CRM_ACCOUNTS_CONFIG)
}

export {
  useAccountsStaticData,
  type TopAccountData,
  type MonthlyGrowthPoint,
  type AccountIndustryData,
  type AccountSizeData,
  type AccountsStaticData
}
