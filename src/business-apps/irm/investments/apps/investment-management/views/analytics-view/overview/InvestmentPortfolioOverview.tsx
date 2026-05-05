import React, { useState } from 'react'
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Card,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  useTranslation
} from '@newwork/nw-design-system'
import {
  ChartPieIcon,
  ChartBarIcon as ChartBarIconAlt,
  TrendUpIcon as TrendUpIconAlt,
  ChartBarIcon,
  CurrencyDollarIcon
} from '@phosphor-icons/react'
import { Button, Badge } from '@newwork/nw-design-system'
import { WidgetGroup } from '@/components/widget-group'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { calculateTrend } from '@/common/utils/trendUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useInvestmentPortfolioIntegration } from './hooks'
import { PortfolioTimelineCharts } from './components/PortfolioTimelineCharts'
import { PortfolioAnalyticsCharts } from './components/PortfolioAnalyticsCharts'
import { PortfolioDistributionCharts } from './components/PortfolioDistributionCharts'
import translations from './_i18n'

// Typography components removed - using native HTML elements with nw-design-system styling

interface InvestmentPortfolioOverviewProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  isActive?: boolean
}

const InvestmentPortfolioOverview: React.FC<InvestmentPortfolioOverviewProps> = props => {
  const { t } = useTranslation(translations)
  const prefixDataTestId = props.prefixDataTestId || 'InvestmentPortfolioOverview'
  const isActive = props.isActive ?? true
  const [activeTab, setActiveTab] = useState('distribution')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')

  const { kpis, previousKpis, isLoading, error, refetch } = useInvestmentPortfolioIntegration(
    props,
    selectedCurrency,
    undefined,
    isActive
  )

  // Fetch available currencies efficiently using distinctOn
  const { currencies: availableCurrencies } = useAvailableCurrencies(props, {
    filters: { entity: 'Investment' },
    returnFormat: 'codes'
  })

  if (isLoading) {
    return (
      <div
        data-testid={formatDataTestId(prefixDataTestId, 'Loading')}
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
      >
        <Spinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <Alert data-testid={formatDataTestId(prefixDataTestId, 'Error')} variant="destructive">
        <AlertTitle>{getTranslationFromI18nKeyAndLabel('error.loading', 'Error Loading Data')}</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <div className="gba:mt-2">
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            {getTranslationFromI18nKeyAndLabel('button.retry', 'Retry')}
          </Button>
        </div>
      </Alert>
    )
  }

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'Container')}
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <Badge variant="secondary" className="gba:text-sm">
            {kpis?.totalInvestments || 0}{' '}
            {getTranslationFromI18nKeyAndLabel('investment.portfolio.items', 'investments')}
          </Badge>
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-medium gba:text-gray-700">
            {getTranslationFromI18nKeyAndLabel('currency.filter', 'Currency:')}
          </span>
          <Select value={selectedCurrency} onValueChange={setSelectedCurrency}>
            <SelectTrigger
              className="gba:w-24 gba:h-8"
              data-testid={formatDataTestId(prefixDataTestId, 'CurrencyFilter')}
            >
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

      {/* KPI Cards */}
      <div className="gba:mb-6">
        <WidgetGroup
          widgets={[
            {
              key: 'total-amount-invested',
              title: getTranslationFromI18nKeyAndLabel('kpi.totalAmountInvested', 'Total Amount Invested'),
              value: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: selectedCurrency,
                notation: 'compact',
                compactDisplay: 'short',
                minimumFractionDigits: 0,
                maximumFractionDigits: 1
              }).format(kpis.totalAmountInvested),
              prefix: <CurrencyDollarIcon />,
              color: 'var(--nw-color-warning-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: t('kpi-description-total-capital'),
              trend: calculateTrend(
                kpis.totalAmountInvested,
                previousKpis.totalAmountInvested,
                t('trend-vs-last-quarter')
              )
            },
            {
              key: 'total-investments',
              title: getTranslationFromI18nKeyAndLabel('kpi.totalInvestments', 'Total Investments'),
              value: kpis.totalInvestments,
              prefix: <ChartBarIconAlt />,
              color: 'var(--nw-color-success-500)',
              span: { xs: 24, sm: 12, lg: 6 },
              description: t('kpi-description-investment-count'),
              trend: calculateTrend(kpis.totalInvestments, previousKpis.totalInvestments, t('trend-vs-last-quarter'))
            },
            {
              key: 'avg-investment-amount',
              title: getTranslationFromI18nKeyAndLabel('kpi.avgInvestmentAmount', 'Avg. Investment Amount'),
              value: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: selectedCurrency,
                notation: 'compact',
                compactDisplay: 'short',
                minimumFractionDigits: 0,
                maximumFractionDigits: 1
              }).format(kpis.averageInvestmentValue),
              prefix: <ChartPieIcon />,
              color: 'var(--nw-color-primary-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: t('kpi-description-per-investment'),
              trend: calculateTrend(
                kpis.averageInvestmentValue,
                previousKpis.averageInvestmentValue,
                t('trend-vs-last-quarter')
              )
            },
            {
              key: 'active-investments',
              title: getTranslationFromI18nKeyAndLabel('kpi.activeInvestments', 'Active Investments'),
              value: kpis.activeInvestments,
              prefix: <TrendUpIconAlt />,
              color: 'var(--nw-color-purple-500)',
              span: { xs: 24, sm: 12, lg: 6 },
              description: t('kpi-description-active-positions'),
              trend: calculateTrend(kpis.activeInvestments, previousKpis.activeInvestments, t('trend-vs-last-quarter'))
            }
          ]}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          onRetry={refetch}
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
