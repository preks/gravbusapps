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

export const useEquityKPIIntegration = (context: BusinessAppContextProps, currency?: string): EquityKPIIntegration => {
  const { fetchEquityKPIs } = useGetEquityKPIs(context, currency)

  return useKPIIntegration<EquityKPIData>(context, fetchEquityKPIs, DEFAULT_EQUITY_KPI, [currency])
}
