import { useMemo } from 'react'
import {
  useGenericContactQualityData,
  type ContactQualityData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactQualityData'

/**
 * CRM-specific wrapper for useGenericContactQualityData
 */
const useContactQualityData = (accessToken: string) => {
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

export { useContactQualityData, type ContactQualityData }
