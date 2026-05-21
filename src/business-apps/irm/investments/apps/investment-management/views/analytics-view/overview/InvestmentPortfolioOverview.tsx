import React, { useMemo, useState } from 'react'
import { Card, Tabs, TabsContent, TabsList, TabsTrigger, Badge } from '@newwork/nw-design-system'
import { ChartPieIcon, TrendUpIcon as TrendUpIconAlt, ChartBarIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { InvestmentKPICards } from '@/common/components/investment-kpi-cards'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { CurrencyFilter } from '../shared/components'
import { usePortfolioAnalyticsKpis } from './hooks'
import { PortfolioTimelineCharts } from './components/PortfolioTimelineCharts'
import { PortfolioAnalyticsCharts } from './components/PortfolioAnalyticsCharts'
import { PortfolioDistributionCharts } from './components/PortfolioDistributionCharts'

interface InvestmentPortfolioOverviewProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  isActive?: boolean
}

const InvestmentPortfolioOverview: React.FC<InvestmentPortfolioOverviewProps> = props => {
  const prefixDataTestId = props.prefixDataTestId || 'InvestmentPortfolioOverview'
  const isActive = props.isActive ?? true
  const [activeTab, setActiveTab] = useState('distribution')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('all')

  const overviewKpis = usePortfolioAnalyticsKpis(props, selectedCurrency, isActive)

  // Fetch available currencies efficiently using distinctOn
  const { currencies } = useAvailableCurrencies(props, {
    filters: { entity: 'Investment' },
    returnFormat: 'codes'
  })

  const availableCurrencies = useMemo(
    () => currencies.map(currency => (typeof currency === 'string' ? currency : currency.code)),
    [currencies]
  )

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Badge variant="secondary" className="gba:text-sm">
            {overviewKpis.data.totalInvestments}{' '}
            {getTranslationFromI18nKeyAndLabel('investment.portfolio.items', 'investments')}
          </Badge>
        </div>
        <CurrencyFilter
          value={selectedCurrency}
          onChange={setSelectedCurrency}
          currencies={availableCurrencies}
          dataTestId={formatDataTestId(prefixDataTestId, 'CurrencyFilter')}
          allOptionLabel={getTranslationFromI18nKeyAndLabel('currency.all', 'All')}
        />
      </div>

      {/* KPI Cards */}
      <div className="gba:mb-6">
        <InvestmentKPICards
          config={overviewKpis.config}
          data={overviewKpis.data}
          previousData={overviewKpis.previousData}
          currencyCode={overviewKpis.currencyCode}
          isLoading={overviewKpis.isLoading}
          error={overviewKpis.error}
          onRetry={overviewKpis.onRetry}
          data-testid={formatDataTestId(prefixDataTestId, 'KPICards')}
        />
      </div>

      {/* Tabbed Charts */}
      <Card className="gba:rounded-lg gba:bg-white gba:p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:w-full">
          <TabsList className="gba:grid gba:w-full gba:grid-cols-3 gba:mb-6">
            <TabsTrigger
              value="distribution"
              data-testid={formatDataTestId(prefixDataTestId, 'DistributionTab')}
              startIcon={<ChartPieIcon />}
            >
              {getTranslationFromI18nKeyAndLabel('tab.distribution.analysis', 'Distribution Analysis')}
            </TabsTrigger>
            <TabsTrigger
              value="timeline"
              data-testid={formatDataTestId(prefixDataTestId, 'TimelineTab')}
              startIcon={<TrendUpIconAlt />}
            >
              {getTranslationFromI18nKeyAndLabel('tab.timeline.analysis', 'Timeline Analysis')}
            </TabsTrigger>
            <TabsTrigger
              value="analytics"
              data-testid={formatDataTestId(prefixDataTestId, 'AnalyticsTab')}
              startIcon={<ChartBarIcon />}
            >
              {getTranslationFromI18nKeyAndLabel('tab.performance.analytics', 'Performance Analysis')}
            </TabsTrigger>
          </TabsList>

          <TabsContent
            value="distribution"
            className="gba:py-4"
            data-testid={formatDataTestId(prefixDataTestId, 'DistributionContent')}
          >
            <PortfolioDistributionCharts
              {...props}
              masterCurrency={selectedCurrency}
              availableCurrencies={availableCurrencies}
            />
          </TabsContent>

          <TabsContent
            value="timeline"
            className="gba:py-4"
            data-testid={formatDataTestId(prefixDataTestId, 'TimelineContent')}
          >
            <PortfolioTimelineCharts
              {...props}
              masterCurrency={selectedCurrency}
              availableCurrencies={availableCurrencies}
            />
          </TabsContent>

          <TabsContent
            value="analytics"
            className="gba:py-4"
            data-testid={formatDataTestId(prefixDataTestId, 'AnalyticsContent')}
          >
            <div className="gba:grid gba:grid-cols-1 gba:lg:gba:grid-cols-2 gba:gap-6">
              <PortfolioAnalyticsCharts
                masterCurrency={selectedCurrency}
                availableCurrencies={availableCurrencies}
                accessToken={props.accessToken}
              />
            </div>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  )
}

export default InvestmentPortfolioOverview
