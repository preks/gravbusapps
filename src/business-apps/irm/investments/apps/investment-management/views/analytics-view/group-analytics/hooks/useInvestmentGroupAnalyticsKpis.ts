import { useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { INVESTMENT_VIEW_KPI_CONFIG } from '@/common/data/investment/kpis'
import { useInvestmentViewKPIIntegration } from '@/common/data/investment/hooks/useInvestmentViewKPIIntegration'
import { isAllCurrencySelection } from '@/common/data/investment/utils/investmentCurrencySelection'

export const useInvestmentGroupAnalyticsKpis = (
  context: BusinessAppContextProps,
  groupId: string,
  selectedCurrency: string,
  enabled: boolean
) => {
  const filters = useMemo<Record<string, any>>(() => ({}), [])
  const kpis = useInvestmentViewKPIIntegration(context, { groupId }, filters, selectedCurrency, enabled)

  return {
    config: INVESTMENT_VIEW_KPI_CONFIG,
    data: kpis.current,
    previousData: kpis.previous,
    currencyCode: isAllCurrencySelection(selectedCurrency) ? 'EUR' : selectedCurrency,
    isLoading: kpis.isLoading,
    error: kpis.error ? new Error(kpis.error) : null,
    onRetry: kpis.refetch,
    refetch: kpis.refetch
  }
}
