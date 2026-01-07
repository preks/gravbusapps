import { useMemo } from 'react'
import { useGenericContactInsights } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactInsights'

/**
 * CRM-specific wrapper for useGenericContactInsights
 */
export const useContactInsights = (accessToken: string) => {
  const config = useMemo(
    () => ({
      contactEntity: 'Contact',
      contactAggregate: 'ContactAggregate',
      typeField: 'contactType',
      accountRelationEntity: 'Contact',
      accountRelationField: 'accountId',
      accountLookupWhere: 'accountId: { _isNull: false }',
      accountAggregateFilter: 'accountId: { _eq: "${accountId}" }',
      accountMissingFilter: 'accountId: { _isNull: true }',
      recentContactAccountField: 'account'
    }),
    []
  )

  return useGenericContactInsights(accessToken, config)
}

export type {
  ContactInsightsData,
  ContactInsightAccount,
  ContactInsightRecent
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactInsights'
