/**
 * CRM-specific wrapper around the shared useDealHealthData hook.
 * CRM uses the default `winningChance` strategy.
 */
import { useMemo } from 'react'
import {
  useDealHealthData as useSharedDealHealthData,
  type DealHealthConfig
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'

export const useDealHealthData = (accessToken: string) => {
  const config = useMemo<DealHealthConfig>(
    () => ({
      entityName: 'Opportunity',
      scoringStrategy: 'winningChance',
      statusFilterField: 'code'
    }),
    []
  )
  return useSharedDealHealthData(accessToken, config)
}

export type {
  DealHealthData,
  DealHealthItem
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks'
