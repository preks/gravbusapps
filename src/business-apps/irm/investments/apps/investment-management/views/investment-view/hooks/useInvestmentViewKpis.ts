import { useMemo } from 'react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { INVESTMENT_VIEW_KPI_CONFIG } from '@/common/data/investment/kpis'
import { useInvestmentViewKPIIntegration } from '@/common/data/investment/hooks/useInvestmentViewKPIIntegration'
import type { InvestmentViewKPIScope } from '@/common/data/investment/hooks/useInvestmentViewKPIIntegration'
import type { InvestmentGroup } from './useInvestmentGroups'

const EMPTY_FILTERS: Record<string, any> = {}

export const useInvestmentViewKpis = (
  context: BusinessAppContextProps,
  currentSection: string,
  investmentGroups: InvestmentGroup[],
  filtersByTab: Record<string, Record<string, any>>,
  selectedCurrency: string,
  displayCurrencyCode: string,
  filtersReady: boolean
) => {
  const investmentViewKPIScope = useMemo((): InvestmentViewKPIScope => {
    if (currentSection === 'overview') return 'overview'
    const group = investmentGroups.find(item => item.tabId === currentSection)
    return group ? { groupId: group.id } : 'overview'
  }, [currentSection, investmentGroups])

  const kpiCurrencyId = filtersByTab[currentSection]?.currencyIds?.[0] as string | undefined
  const investmentViewKPIFilters = useMemo(
    () => (kpiCurrencyId ? { currencyIds: [kpiCurrencyId] } : EMPTY_FILTERS),
    [kpiCurrencyId]
  )
  const enabled =
    filtersReady && (currentSection === 'overview' || investmentGroups.some(g => g.tabId === currentSection))
  const investmentViewKPIs = useInvestmentViewKPIIntegration(
    context,
    investmentViewKPIScope,
    investmentViewKPIFilters,
    selectedCurrency,
    enabled
  )

  return {
    config: INVESTMENT_VIEW_KPI_CONFIG,
    data: investmentViewKPIs.current,
    previousData: investmentViewKPIs.previous,
    currencyCode: displayCurrencyCode,
    isLoading: investmentViewKPIs.isLoading,
    error: investmentViewKPIs.error ? new Error(investmentViewKPIs.error) : null,
    onRetry: investmentViewKPIs.refetch,
    refetch: investmentViewKPIs.refetch
  }
}
