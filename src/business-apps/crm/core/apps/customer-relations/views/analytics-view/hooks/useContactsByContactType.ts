import { useMemo } from 'react'
import { useGenericContactsByContactType } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactsByContactType'

export const useContactsByContactType = (accessToken: string) => {
  const config = useMemo(
    () => ({
      accountContactAggregate: 'AccountContactAggregate' as const,
      contactAggregate: 'ContactAggregate' as const,
      junctionField: 'accountContacts' as const
    }),
    []
  )

  return useGenericContactsByContactType(accessToken, config)
}

export type { ContactsByContactTypeItem } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactsByContactType'
