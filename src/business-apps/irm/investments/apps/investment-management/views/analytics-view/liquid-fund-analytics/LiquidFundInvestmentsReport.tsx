import React, { useState } from 'react'
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Button,
  Badge,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@newwork/nw-design-system'
import { PieChart, TrendingUp, BarChart } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useLiquidFundDataIntegration } from './hooks/useLiquidFundDataIntegration'
import { useLiquidFundKPIIntegration } from './hooks/useLiquidFundKPIIntegration'
import { LiquidFundKPICards } from './components/LiquidFundKPICards'
import { LiquidFundDistributionCharts, LiquidFundTimelineCharts, LiquidFundAnalyticsCharts } from './components'

// Interface definition moved to shared/types.ts - keeping legacy export for compatibility

export interface LiquidFundInvestmentKPIs {
  totalInvestments: number
  averageInvestmentValue: number
  averageMarketValue: number
  totalFundValue: number
  // Previous period data for comparison
  previousTotalInvestments?: number
  previousAverageInvestmentValue?: number
  previousAverageMarketValue?: number
  previousTotalFundValue?: number
}

interface LiquidFundInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const LiquidFundInvestmentsReport: React.FC<LiquidFundInvestmentsReportProps> = ({
  prefixDataTestId = 'LiquidFundInvestmentsReport',
  ...context
}) => {
  const [activeTab, setActiveTab] = useState('distribution')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')

  // Use optimized liquid fund data integration hook (only fetches investments)
  const { isLoading, error, refetch } = useLiquidFundDataIntegration(context)

  // Fetch available currencies efficiently using distinctOn
  const { currencies: availableCurrencies } = useAvailableCurrencies(context, {
    filters: { entity: 'Investment', investmentGroupId: 'InvestmentGroup:v1:LIQUID_FUND' },
    returnFormat: 'codes'
  })

  // Use KPI integration hook with currency filter (matches working pattern)
  const {
    current,
    previous,
    isLoading: kpiLoading,
    error: kpiError,
    refetch: refetchKpis
  } = useLiquidFundKPIIntegration(context, selectedCurrency)

  // Transform KPI data to component format (matches working pattern)
  const kpis: LiquidFundInvestmentKPIs = {
    totalInvestments: current.totalInvestments,
    averageInvestmentValue: current.averageInvestmentValue,
    averageMarketValue: current.averageMarketValue,
    totalFundValue: current.totalMarketValue,
    previousTotalInvestments: previous.totalInvestments,
    previousAverageInvestmentValue: previous.averageInvestmentValue,
    previousAverageMarketValue: previous.averageMarketValue,
    previousTotalFundValue: previous.totalMarketValue
  }

  if (error) {
    return (
      <Alert data-testid={formatDataTestId(prefixDataTestId, 'Error')} variant="destructive">
        <AlertTitle>Error Loading Liquid Fund Investments</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <div className="gba:mt-2">
          <Button variant="outline" size="sm" onClick={refetch}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:min-h-[400px]"
        data-testid={formatDataTestId(prefixDataTestId, 'Loading')}
      >
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div
      data-testid={formatDataTestId(prefixDataTestId, 'LiquidFundInvestmentsReport')}
      className="gba:bg-gradient-to-b gba:from-gray-50 gba:to-gray-100 gba:min-h-full gba:p-6 gba:rounded-lg"
    >
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h3
            className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:m-0"
            data-testid="liquid-fund-investments-title"
          >
            {getTranslationFromI18nKeyAndLabel('liquidFund.investments.title', 'Liquid Fund Investments Report')}
          </h3>
          <Badge variant="secondary" data-testid="liquid-fund-investments-count">
            {kpis?.totalInvestments || 0} {getTranslationFromI18nKeyAndLabel('liquidFund.investments.items', 'funds')}
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
      <LiquidFundKPICards
        kpis={kpis}
        currency={selectedCurrency}
        isLoading={kpiLoading}
        error={kpiError ? new Error(kpiError) : null}
        onRetry={refetchKpis}
        prefixDataTestId={`${prefixDataTestId}-KPI`}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="gba:mt-6">
        <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
          <TabsTrigger
            value="distribution"
            startIcon={<PieChart />}
            data-testid={`${prefixDataTestId}-distribution-tab`}
          >
            Distribution Analysis
          </TabsTrigger>
          <TabsTrigger value="timeline" startIcon={<TrendingUp />} data-testid={`${prefixDataTestId}-timeline-tab`}>
            Timeline Analysis
          </TabsTrigger>
          <TabsTrigger value="analytics" startIcon={<BarChart />} data-testid={`${prefixDataTestId}-analytics-tab`}>
            Performance Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="distribution" className="gba:mt-6">
          <LiquidFundDistributionCharts
            {...context}
            masterCurrency={selectedCurrency}
            availableCurrencies={availableCurrencies}
          />
        </TabsContent>

        <TabsContent value="timeline" className="gba:mt-6">
          {activeTab === 'timeline' && (
            <LiquidFundTimelineCharts
              {...context}
              masterCurrency={selectedCurrency}
              availableCurrencies={availableCurrencies}
            />
          )}
        </TabsContent>

        <TabsContent value="analytics" className="gba:mt-6">
          {activeTab === 'analytics' && (
            <LiquidFundAnalyticsCharts
              {...context}
              masterCurrency={selectedCurrency}
              availableCurrencies={availableCurrencies}
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LiquidFundInvestmentsReport
