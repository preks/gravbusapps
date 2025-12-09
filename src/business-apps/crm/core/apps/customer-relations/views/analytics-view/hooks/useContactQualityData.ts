import { useMemo } from 'react'
import {
  useGenericContactQualityData,
  type ContactQualityData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactQualityData'

export type { ContactQualityData }

/**
 * CRM-specific wrapper for useGenericContactQualityData
 */
export const useContactQualityData = (accessToken: string) => {
  const config = useMemo(
    () => ({
      contactEntity: 'Contact',
      contactAggregate: 'ContactAggregate',
      accountField: 'accountId',
      typeField: 'contactType'
    }),
    []
  )

  return useGenericContactQualityData(accessToken, config)
}
