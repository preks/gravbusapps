import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetRealEstateKPIs, RealEstateKPIData } from '../queries/RealEstateKPIQueries'
import { useKPIIntegration } from '../../shared/hooks'

/**
 * @interface RealEstateKPIIntegration
 * @description Return type for real estate KPI integration hook
 */
export interface RealEstateKPIIntegration {
  current: RealEstateKPIData
  previous: RealEstateKPIData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * @function useRealEstateKPIIntegration
 * @description Custom hook for managing real estate KPI data with current and previous period comparison.
 * Leverages the generic useKPIIntegration hook for standardized data fetching and state management.
 *
 * @param {BusinessAppContextProps} context - Business application context with access token
 * @param {string} [currency] - Optional currency filter for KPI calculations
 * @returns {RealEstateKPIIntegration} Real estate KPI data with loading and error states
 *
 * @example
 * const { current, previous, isLoading, error, refetch } = useRealEstateKPIIntegration(context, 'USD')
 */
export const useRealEstateKPIIntegration = (
  context: BusinessAppContextProps,
  currency?: string
): RealEstateKPIIntegration => {
  const { fetchRealEstateKPIs } = useGetRealEstateKPIs(context, currency)

  return useKPIIntegration<RealEstateKPIData>(
    context,
    fetchRealEstateKPIs,
    {
      totalInvestments: 0,
      totalAmountInvested: 0,
      totalMarketValue: 0,
      averageOccupancyRate: 0
    },
    [currency]
  )
}
