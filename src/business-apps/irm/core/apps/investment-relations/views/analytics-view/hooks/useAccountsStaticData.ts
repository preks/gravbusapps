/**
 * IRM-specific wrapper for useGenericAccountsStaticData
 * Uses Investment entity names and field mappings
 */
import { useGenericAccountsStaticData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

const IRM_ACCOUNTS_CONFIG = {
  accountEntity: 'InvestmentAccount',
  opportunityEntity: 'InvestmentOpportunity',
  industryField: 'industryClass',
  sizeField: 'companySize',
  opportunityRelation: 'opportunityAccounts',
  isOpportunityRelationList: true,
  isJunctionTable: true
}

export const useAccountsStaticData = (accessToken: string) => {
  return useGenericAccountsStaticData(accessToken, IRM_ACCOUNTS_CONFIG)
}
export type {
  TopAccountData,
  MonthlyGrowthPoint,
  AccountIndustryData,
  AccountSizeData,
  AccountsStaticData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
