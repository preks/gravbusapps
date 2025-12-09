import { useMemo } from 'react'
import {
  useGenericContactInsights,
  type ContactInsightsData,
  type ContactInsightAccount,
  type ContactInsightRecent
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactInsights'

/**
 * IRM-specific wrapper for useGenericContactInsights
 */
const useContactInsights = (accessToken: string) => {
  const config = useMemo(
    () => ({
      contactEntity: 'InvestmentContact',
      contactAggregate: 'InvestmentContactAggregate',
      typeField: 'type',
      accountRelationEntity: 'InvestmentAccountContact',
      accountRelationField: 'contact',
      accountLookupWhere: 'contact: { isDeleted: { _eq: false } }, accountId: { _isNull: false }',
      accountAggregateFilter: 'investmentAccountContact: { accountId: { _eq: "${accountId}" } }',
      accountMissingFilter: 'investmentAccountContact: { accountId: { _isNull: true } }',
      recentContactAccountField: 'investmentAccountContact'
    }),
    []
  )

  return useGenericContactInsights(accessToken, config)
}

export { useContactInsights, type ContactInsightsData, type ContactInsightAccount, type ContactInsightRecent }
