import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetLiquidFundKPIs, LiquidFundKPIData } from '../queries/LiquidFundKPIQueries'
import { useKPIIntegration } from '../../shared/hooks'

/**
 * @interface LiquidFundKPIIntegration
 * @description Return type for liquid fund KPI integration hook
 */
export interface LiquidFundKPIIntegration {
  current: LiquidFundKPIData
  previous: LiquidFundKPIData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * @function useLiquidFundKPIIntegration
 * @description Custom hook for managing liquid fund KPI data with current and previous period comparison.
 * Leverages the generic useKPIIntegration hook for standardized data fetching and state management.
 *
 * @param {BusinessAppContextProps} context - Business application context with access token
 * @param {string} [currency] - Optional currency filter for KPI calculations
 * @returns {LiquidFundKPIIntegration} Liquid fund KPI data with loading and error states
 *
 * @example
 * const { current, previous, isLoading, error, refetch } = useLiquidFundKPIIntegration(context, 'USD')
 */
export const useLiquidFundKPIIntegration = (
  context: BusinessAppContextProps,
  currency?: string
): LiquidFundKPIIntegration => {
  const { fetchLiquidFundKPIs } = useGetLiquidFundKPIs(context, currency)

  return useKPIIntegration<LiquidFundKPIData>(
    context,
    fetchLiquidFundKPIs,
    {
      totalInvestments: 0,
      totalAmountInvested: 0,
      averageInvestmentValue: 0,
      activeInvestments: 0
    },
    [currency]
  )
}
