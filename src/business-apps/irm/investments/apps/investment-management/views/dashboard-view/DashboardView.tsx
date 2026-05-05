import React from 'react'
import { Button, Alert, AlertTitle, AlertDescription, Spinner } from '@newwork/nw-design-system'
import { ChartBarIcon, HouseIcon, CurrencyDollarIcon, TrendUpIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentKPICards } from '@/common/components/investment-kpi-cards'
import { OVERVIEW_KPI_CONFIG } from '@/common/data/investment/kpis'
import { useInvestmentPortfolioIntegration } from '../analytics-view/overview/hooks/useInvestmentPortfolioIntegration'
import InvestmentBreakdownCard, { type InvestmentGroup } from './components/InvestmentBreakdownCard'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useInvestmentGroupsAndTypes } from './hooks/useInvestmentGroupsAndTypes'
import { CurrencyFilter } from '../analytics-view/shared/components'

interface DashboardViewProps extends BusinessAppContextProps {
  moduleColor?: string
  onNavigateToInvestments?: (subTab?: string) => void
}

const getGroupIcon = (groupName: string) => {
  const groupLower = groupName.toLowerCase()
  if (groupLower.includes('private') && groupLower.includes('equity')) return TrendUpIcon
  if (groupLower.includes('equity')) return ChartBarIcon
  if (groupLower.includes('real') || groupLower.includes('estate')) return HouseIcon
  if (groupLower.includes('liquid') || groupLower.includes('fund')) return CurrencyDollarIcon
  return ChartBarIcon
}

/**
 * Main dashboard component for IRM Investments management.
 * Investment group cards fetch their own server-side aggregates —
 * no individual investment records are fetched at this level.
 */
const DashboardView: React.FC<DashboardViewProps> = ({
  accessToken,
  userInfo,
  moduleColor,
  onNavigateToInvestments
}) => {
  const [masterCurrency, setMasterCurrency] = React.useState<string>('EUR')

  const { currencies: availableCurrenciesRaw } = useAvailableCurrencies(
    { accessToken, userInfo },
    { filters: { entity: 'Investment' }, returnFormat: 'codes' }
  )
  const availableCurrencies = availableCurrenciesRaw as string[]

  const { data: groupsData, error: groupsError, isLoading: groupsLoading } = useInvestmentGroupsAndTypes(accessToken)

  const overviewKPIs = useInvestmentPortfolioIntegration({ accessToken, userInfo }, masterCurrency)

  // Build the group list from catalog — no investments needed here
  const investmentGroups: InvestmentGroup[] = React.useMemo(() => {
    if (!groupsData?.groups?.length) return []
    const sortedGroups = [...groupsData.groups].sort((a: any, b: any) => {
      if (a.displayOrder !== b.displayOrder) return a.displayOrder - b.displayOrder
      return a.value.localeCompare(b.value)
    })
    return sortedGroups.map((group: any) => ({
      name: group.value,
      icon: getGroupIcon(group.value),
      types: (group.types || []).map((t: any) => ({ id: t.id, value: t.value }))
    }))
  }, [groupsData])

  const handleNavigateToInvestmentType = (investmentType: string) => {
    onNavigateToInvestments?.(investmentType)
  }

  if (groupsLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="dashboard-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (groupsError) {
    return (
      <Alert variant="destructive" data-testid="dashboard-error">
        <AlertTitle>Error Loading Investment Data</AlertTitle>
        <AlertDescription>{groupsError}</AlertDescription>
        <Button size="sm" onClick={() => globalThis.location.reload()}>
          Retry
        </Button>
      </Alert>
    )
  }

  return (
    <div data-testid="dashboard-content">
      <div className="gba:flex gba:justify-end gba:items-center gba:mb-6">
        <CurrencyFilter
          value={masterCurrency}
          onChange={setMasterCurrency}
          currencies={availableCurrencies}
          dataTestId="dashboard-master-currency-filter"
        />
      </div>

      {/* Key Metrics Cards */}
      <div className="gba:mb-8">
        <InvestmentKPICards
          config={OVERVIEW_KPI_CONFIG}
          data={overviewKPIs.kpis}
          previousData={overviewKPIs.previousKpis}
          currencyCode={masterCurrency}
          isLoading={overviewKPIs.isLoading}
          error={overviewKPIs.error ? new Error(overviewKPIs.error) : null}
          onRetry={overviewKPIs.refetch}
          data-testid="dashboard-overview-kpis"
        />
      </div>

      {/* Investment Groups Breakdown */}
      <div className="gba:space-y-6">
        <div className="gba:flex gba:justify-between gba:items-center">
          <div>
            <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Groups</h2>
            <p className="gba:text-sm gba:text-gray-500 gba:mt-1">{investmentGroups.length} groups</p>
          </div>
        </div>

        {investmentGroups.length === 0 ? (
          <div className="gba:col-span-full gba:text-center gba:py-8">
            <p className="gba:text-gray-500">No investment groups found</p>
          </div>
        ) : (
          <div className="gba:grid gba:gap-6 gba:grid-cols-1 gba:md:grid-cols-2 gba:xl:grid-cols-4">
            {investmentGroups.map(group => (
              <InvestmentBreakdownCard
                key={group.name}
                group={group}
                accessToken={accessToken}
                moduleColor={
                  moduleColor as 'ext1' | 'ext2' | 'ext3' | 'ext4' | 'ext5' | 'ext6' | 'ext7' | 'ext8' | undefined
                }
                onNavigateToInvestmentType={handleNavigateToInvestmentType}
                masterCurrency={masterCurrency}
                availableCurrencies={availableCurrencies}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default DashboardView
