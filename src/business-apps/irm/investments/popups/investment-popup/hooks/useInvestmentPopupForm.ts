/**
 * Common hook for investment popup form setup
 * Eliminates duplication across all popup components
 */

import { useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useInvestmentPopupData } from './useInvestmentPopupData'
import { extractInvestmentId } from '../utils/investmentPopupUtils'

type InvestmentPopupScope =
  | 'tile'
  | 'text'
  | 'kpi'
  | 'table'
  | 'chart'
  | 'exit'
  | 'status'
  | 'liquidity'
  | 'ppmforecast'
  | 'kpiforecast'
  | 'liquidityForecast'
  | 'delete'

interface UseInvestmentPopupFormParams extends BusinessAppContextProps {
  scope: InvestmentPopupScope
}

export const useInvestmentPopupForm = (params: UseInvestmentPopupFormParams) => {
  const { accessToken, userInfo, additionalData, scope } = params

  // Create business app context
  const businessAppContext = useMemo(
    () => ({ accessToken, userInfo, additionalData }),
    [accessToken, userInfo, additionalData]
  )

  // Extract investment ID from additional data
  const investmentId = useMemo(() => extractInvestmentId(additionalData), [additionalData])

  // Load investment data
  const { investment, loading, error } = useInvestmentPopupData({
    context: businessAppContext,
    investmentId,
    scope
  })

  return {
    businessAppContext,
    investmentId,
    investment,
    loading,
    error
  }
}
