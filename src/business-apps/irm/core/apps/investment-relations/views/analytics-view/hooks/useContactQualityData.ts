import { useMemo } from 'react'
import {
  useGenericContactQualityData,
  type ContactQualityData
} from '@/common/components/common-relations/view-layouts/analytics-layout/hooks/useGenericContactQualityData'

/**
 * IRM-specific wrapper for useGenericContactQualityData
 */
const useContactQualityData = (accessToken: string) => {
  const config = useMemo(
    () => ({
      contactEntity: 'InvestmentContact',
      contactAggregate: 'InvestmentContactAggregate',
      accountField: 'investmentAccountContact.accountId',
      typeField: 'type'
    }),
    []
  )

  return useGenericContactQualityData(accessToken, config)
}

export { useContactQualityData, type ContactQualityData }
