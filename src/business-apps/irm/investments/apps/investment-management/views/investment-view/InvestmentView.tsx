import React, { useEffect, useState, useCallback } from 'react'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { LayoutGrid, TrendingUp, Building2, PieChart } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import AllInvestmentsList from './components/AllInvestmentsList'
import EquityInvestmentsList from './components/EquityInvestmentsList'
import RealEstateInvestmentsList from './components/RealEstateInvestmentsList'
import LiquidFundInvestmentsList from './components/LiquidFundInvestmentsList'
import InvestmentStatistics from './components/InvestmentStatistics'
import EquityInvestmentStatistics from './components/EquityInvestmentStatistics'
import LiquidFundInvestmentStatistics from './components/LiquidFundInvestmentStatistics'
import RealEstateInvestmentStatistics from './components/RealEstateInvestmentStatistics'

export interface InvestmentViewProps extends BusinessAppContextProps {
  initialSubTab?: string
  onSubTabChange?: (subTab: string) => void
}

export const InvestmentView: React.FC<InvestmentViewProps> = context => {
  const { initialSubTab, onSubTabChange } = context as InvestmentViewProps

  const normalize = useCallback((val?: string) => {
    const allowed = new Set(['overview', 'equity', 'real-estate', 'liquid-funds'])
    if (!val) return 'overview'
    return allowed.has(val) ? val : 'overview'
  }, [])

  const [activeTab, setActiveTab] = useState(normalize(initialSubTab))
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')

  // Fetch available currencies efficiently using distinctOn
  const { currencies: availableCurrencies } = useAvailableCurrencies(context, {
    filters: { entity: 'Investment' },
    returnFormat: 'codes'
  })

  useEffect(() => {
    setActiveTab(normalize(initialSubTab))
  }, [initialSubTab, normalize])

  const handleTabChange = useCallback(
    (value: string) => {
      setActiveTab(value)
      onSubTabChange?.(value)
    },
    [onSubTabChange]
  )

  return (
    <div data-testid="investment-view">
      {/* Header with Currency Filter */}
      <div className="gba:mb-6">
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-4">
          <div>
            <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Investment Portfolio</h1>
            <p className="gba:text-gray-600">Manage and track investment portfolio across asset classes</p>
          </div>

          {/* Currency Filter - Top Right */}
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-sm gba:font-medium gba:text-gray-700">Currency:</span>
            <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
              <SelectTrigger className="gba:w-[120px]" data-testid="investment-view-currency-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableCurrencies.map(currency => (
                  <SelectItem key={currency} value={currency}>
                    {currency}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Statistics - Render different KPIs based on active tab with selected currency */}
      <div className="gba:mb-6">
        {activeTab === 'overview' && <InvestmentStatistics {...context} currencyCode={selectedCurrency} />}
        {activeTab === 'equity' && <EquityInvestmentStatistics {...context} currencyCode={selectedCurrency} />}
        {activeTab === 'liquid-funds' && (
          <LiquidFundInvestmentStatistics {...context} currencyCode={selectedCurrency} />
        )}
        {activeTab === 'real-estate' && <RealEstateInvestmentStatistics {...context} currencyCode={selectedCurrency} />}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="gba:w-full">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-4">
          <TabsTrigger value="overview" startIcon={<LayoutGrid />}>
            Overview
          </TabsTrigger>
          <TabsTrigger value="liquid-funds" startIcon={<TrendingUp />}>
            Liquid Fund
          </TabsTrigger>
          <TabsTrigger value="real-estate" startIcon={<Building2 />}>
            Real Estate
          </TabsTrigger>
          <TabsTrigger value="equity" startIcon={<PieChart />}>
            Equity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="gba:mt-6">
          <AllInvestmentsList {...context} currencyCode={selectedCurrency} />
        </TabsContent>

        <TabsContent value="equity" className="gba:mt-6">
          <EquityInvestmentsList {...context} currencyCode={selectedCurrency} />
        </TabsContent>

        <TabsContent value="real-estate" className="gba:mt-6">
          <RealEstateInvestmentsList {...context} currencyCode={selectedCurrency} />
        </TabsContent>

        <TabsContent value="liquid-funds" className="gba:mt-6">
          <LiquidFundInvestmentsList {...context} currencyCode={selectedCurrency} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default InvestmentView
