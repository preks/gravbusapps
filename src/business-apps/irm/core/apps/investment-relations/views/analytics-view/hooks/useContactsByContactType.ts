import { useMemo } from 'react'
import { useGenericContactsByContactType } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactsByContactType'

export const useContactsByContactType = (accessToken: string) => {
  const config = useMemo(
    () => ({
      accountContactAggregate: 'InvestmentAccountContactAggregate' as const,
      contactAggregate: 'InvestmentContactAggregate' as const,
      junctionField: 'investmentAccountContact' as const
    }),
    []
  )

  return useGenericContactsByContactType(accessToken, config)
}

export type { ContactsByContactTypeItem } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactsByContactType'
