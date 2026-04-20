import { useMemo } from 'react'
import { useGenericContactQualityData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactQualityData'

/**
 * CRM-specific wrapper for useGenericContactQualityData
 */
export const useContactQualityData = (accessToken: string) => {
  const config = useMemo(
    () => ({
      contactEntity: 'Contact',
      contactAggregate: 'ContactAggregate',
      accountField: 'accountId'
    }),
    []
  )

  return useGenericContactQualityData(accessToken, config)
}

export type { ContactQualityData } from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactQualityData'
