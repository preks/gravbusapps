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
  Badge
} from '@newwork/nw-design-system'
import { PieChart, TrendingUp, BarChart } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import type { LiquidFundInvestment } from '@/common/data/investment'
import { useInvestmentDataIntegration } from '@/common/data/investment'
import { useLiquidFundKPIIntegration } from './hooks/useLiquidFundKPIIntegration'
import { LiquidFundKPICards } from './components/LiquidFundKPICards'
import { LiquidFundDistributionCharts, LiquidFundTimelineCharts, LiquidFundAnalyticsCharts } from './components'
import {
  extractCurrencyCode,
  getInvestmentStatusColor,
  getInvestmentPhaseColor,
  getRiskLevelColor,
  getFundTypeColor
} from '../shared/utils'
import type { LiquidFundInvestmentSummary } from '../shared/types'

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

// Utility functions moved to shared/utils.ts - using centralized versions

// Helper function to safely extract currency code from CatalogEntry or string
const safeCurrencyExtraction = (currency: any): string => {
  if (!currency) return 'EUR'

  if (typeof currency === 'object') {
    // Handle CatalogEntry: try code first, then value
    const currencyStr = currency.code || currency.value
    return extractCurrencyCode(currencyStr || 'EUR')
  }

  // Handle string values
  return extractCurrencyCode(currency)
}

interface LiquidFundInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const LiquidFundInvestmentsReport: React.FC<LiquidFundInvestmentsReportProps> = ({
  prefixDataTestId = 'LiquidFundInvestmentsReport',
  ...context
}) => {
  const [activeTab, setActiveTab] = useState('distribution')

  // Use central investment data integration hook
  const { investments, isLoading, error, refetch } = useInvestmentDataIntegration(context)

  // Use KPI integration hook (matches working pattern)
  const {
    current,
    previous,
    isLoading: kpiLoading,
    error: kpiError,
    refetch: refetchKpis
  } = useLiquidFundKPIIntegration(context)

  // Filter for liquid fund investments only (using type assertion for relationship)
  const liquidFundInvestments = investments.filter(
    inv => (inv as any).liquidFundInvestment && (inv as any).liquidFundInvestment.length > 0
  )

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

  // Transform investments for liquid fund specific data
  const liquidFundSummaries: LiquidFundInvestmentSummary[] = liquidFundInvestments.map(
    (investment): LiquidFundInvestmentSummary => {
      const liquidFund = (investment as any).liquidFundInvestment?.[0] as LiquidFundInvestment

      return {
        id: investment.id,
        investment,
        liquidFundInvestment: liquidFund,
        displayName: investment.code || investment.fundManagerName || `Investment ${investment.id}`,
        currencyCode: safeCurrencyExtraction(investment.currency),
        statusColor: getInvestmentStatusColor(investment.investmentStatus?.value || ''),
        phaseColor: getInvestmentPhaseColor(investment.investmentPhase?.value || ''),
        riskColor: getRiskLevelColor(investment.investmentRiskLevel?.value || ''),
        fundTypeName: liquidFund?.investmentLiquidFundType?.value || 'Unknown',
        fundTypeColor: getFundTypeColor(liquidFund?.investmentLiquidFundType?.value || ''),
        daysToMaturity: liquidFund?.maturityDate
          ? Math.ceil((new Date(liquidFund.maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
          : 0,
        isNearMaturity: liquidFund?.maturityDate
          ? Math.ceil((new Date(liquidFund.maturityDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) <=
            30
          : false,
        isActive: investment.investmentStatus?.value?.toLowerCase() === 'active'
      }
    }
  )

  // Create chart data from the liquid fund summaries
  const chartData = {
    rawLiquidFunds: liquidFundSummaries
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
      </div>

      {/* KPI Cards */}
      <LiquidFundKPICards
        kpis={kpis}
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
          <LiquidFundDistributionCharts chartData={chartData} rawLiquidFunds={liquidFundSummaries} />
        </TabsContent>

        <TabsContent value="timeline" className="gba:mt-6">
          <LiquidFundTimelineCharts chartData={chartData} rawLiquidFunds={liquidFundSummaries} />
        </TabsContent>

        <TabsContent value="analytics" className="gba:mt-6">
          <LiquidFundAnalyticsCharts chartData={chartData} rawLiquidFunds={liquidFundSummaries} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default LiquidFundInvestmentsReport
