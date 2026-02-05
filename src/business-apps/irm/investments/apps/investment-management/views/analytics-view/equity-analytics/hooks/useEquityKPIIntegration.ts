import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetEquityKPIs, EquityKPIData } from '../queries/EquityKPIQueries'
import { useKPIIntegration } from '../../shared/hooks'

/**
 * Equity-specific KPI integration hook
 * Uses the generic useKPIIntegration hook with equity-specific query
 *
 * @param context - Business app context with access token
 * @param currency - Optional currency filter
 * @returns Equity KPI data with current/previous values, loading state, and refetch function
 */
export interface EquityKPIIntegration {
  current: EquityKPIData
  previous: EquityKPIData
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

const DEFAULT_EQUITY_KPI: EquityKPIData = {
  totalInvestments: 0,
  totalAmountInvested: 0,
  portfolioMoic: 0,
  averageDuration: 0
}

export const useEquityKPIIntegration = (
  context: BusinessAppContextProps,
  currency?: string,
  filters?: Record<string, any>,
  enabled: boolean = true
): EquityKPIIntegration => {
  const { fetchEquityKPIs } = useGetEquityKPIs(context)

  // Calculate comparison date (91 days ago)
  const comparisonDate = new Date()
  comparisonDate.setDate(comparisonDate.getDate() - 91)
  const comparisonDateString = comparisonDate.toISOString()

  // Wrapper that calls fetchEquityKPIs with the right parameters
  const fetcher = async () => {
    return await fetchEquityKPIs(comparisonDateString, currency, filters)
  }

  return useKPIIntegration<EquityKPIData>(context, fetcher, DEFAULT_EQUITY_KPI, [currency, filters], enabled)
}
