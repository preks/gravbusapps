import React, { useState, useCallback, useEffect } from 'react'
import {
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Button,
  Badge,
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
import {
  TrendUpIcon,
  ChartBarIcon,
  ChartPieIcon,
  CurrencyCircleDollarIcon,
  TrendUpIcon as TrendUpIconAlt,
  UsersThreeIcon,
  PercentIcon
} from '@phosphor-icons/react'
import { WidgetGroup } from '@/components/widget-group'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { calculateTrend } from '@/common/utils/trendUtils'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import type { Investment } from '@/common/data/investment/types/investmentTypes'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { useRealEstateKPIIntegration } from './hooks'
import { RealEstateDistributionCharts, RealEstateTimelineCharts, RealEstateAnalyticsCharts } from './components'
import {
  safeCurrencyExtraction,
  formatPercentage,
  formatCurrencyCompact,
  extractCurrencyCode
} from '@/common/utils/numberFormatter'
import type { RealEstateInvestmentSummary } from '../shared/types'

const formatCurrency = (amount: number, currency: string = 'EUR'): string => {
  const currencyCode = extractCurrencyCode(currency)
  return formatCurrencyCompact(amount, currencyCode, undefined, 1, true)
}

const getInvestmentStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'green'
    case 'inactive':
      return 'red'
    case 'pending':
      return 'orange'
    case 'completed':
      return 'blue'
    case 'cancelled':
      return 'gray'
    default:
      return 'blue'
  }
}

const getRiskLevelColor = (riskLevel: string): string => {
  switch (riskLevel?.toLowerCase()) {
    case 'low':
      return 'green'
    case 'medium':
      return 'orange'
    case 'high':
      return 'red'
    default:
      return 'blue'
  }
}

// Legacy interface - kept for compatibility
export interface RealEstateInvestmentKPIs {
  totalPropertyValue: number
  averageOccupancyRate: number
  totalUnits: number
  totalAnnualExpenses: number
}

interface RealEstateInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  isActive?: boolean
}

const RealEstateInvestmentsReport: React.FC<RealEstateInvestmentsReportProps> = props => {
  const prefixDataTestId = props.prefixDataTestId || 'RealEstateInvestmentsReport'
  const isActive = props.isActive ?? true
  const [activeTab, setActiveTab] = useState('distribution')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')

  const [realEstateInvestments, setRealEstateInvestments] = useState<RealEstateInvestmentSummary[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Fetch available currencies efficiently using distinctOn
  const { currencies: availableCurrencies } = useAvailableCurrencies(props, {
    filters: { entity: 'Investment', investmentGroupId: 'InvestmentGroup:v1:REAL_ESTATE' },
    returnFormat: 'codes'
  })

  // Use the new KPI integration hook for real GraphQL aggregate queries with currency filter
  const {
    current: kpis,
    previous: previousKpis,
    isLoading: kpiLoading,
    error: kpiError,
    refetch: refetchKpis
  } = useRealEstateKPIIntegration(props, selectedCurrency, undefined, isActive)

  const { fetchInvestments } = useGetInvestments(props)

  // Combined loading and error states
  const isLoading = dataLoading || kpiLoading
  const error = dataError || kpiError

  // Transform real estate data
  const transformRealEstateData = useCallback((investments: Investment[]): RealEstateInvestmentSummary[] => {
    return investments
      .filter(
        investment =>
          investment.realEstateInvestment &&
          Array.isArray(investment.realEstateInvestment) &&
          investment.realEstateInvestment.length > 0
      )
      .map(investment => {
        // realEstateInvestment is an array, take the first one
        const realEstateInvestment = investment.realEstateInvestment![0]

        return {
          id: realEstateInvestment.id,
          investment,
          realEstateInvestment,
          displayName:
            investment.displayName || investment.name || realEstateInvestment.propertyName || 'Unknown Property',
          statusColor: getInvestmentStatusColor(investment.investmentStatus?.value || ''),
          riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value || ''),
          currencyCode: safeCurrencyExtraction(investment.currency),
          occupancyRate: realEstateInvestment.occupancyPercent || 0,
          isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
          propertyType: realEstateInvestment.realEstateType?.value || 'Unknown',
          location:
            `${realEstateInvestment.country?.value || ''}, ${realEstateInvestment.region?.value || ''}`
              .trim()
              .replaceAll(/(^,\s*|,\s*$)/g, '') || 'Unknown Location'
        }
      })
  }, [])

  // Load real estate investment data for chart display
  const loadData = useCallback(async () => {
    if (!props.accessToken) {
      setDataError('Access token not available')
      setDataLoading(false)
      return
    }

    setDataLoading(true)
    setDataError(null)

    try {
      const result = await fetchInvestments()
      const enhancedRealEstateInvestments = transformRealEstateData(result.Investment)
      setRealEstateInvestments(enhancedRealEstateInvestments)
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDataLoading(false)
    }
  }, [props.accessToken, fetchInvestments, transformRealEstateData])

  // Load data on mount and when access token changes
  useEffect(() => {
    if (props.accessToken) {
      void loadData()
    }
  }, [props.accessToken, loadData])

  // Combined refetch function for error retry
  const refetch = useCallback(async () => {
    await Promise.all([loadData(), refetchKpis()])
  }, [loadData, refetchKpis])

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
          <Badge variant="secondary">
            {kpis?.totalInvestments || 0}{' '}
            {getTranslationFromI18nKeyAndLabel('realEstate.investments.items', 'properties')}
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
              key: 'total-investments',
              title: getTranslationFromI18nKeyAndLabel('kpi.totalInvestments', 'Total Investments'),
              value: kpis.totalInvestments,
              prefix: <UsersThreeIcon />,
              color: 'var(--nw-color-primary-500)',
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Property count',
              trend: calculateTrend(kpis.totalInvestments, previousKpis.totalInvestments, 'vs last quarter')
            },
            {
              key: 'total-amount-invested',
              title: getTranslationFromI18nKeyAndLabel('kpi.totalAmountInvested', 'Total Amount Invested'),
              value: formatCurrency(kpis.totalAmountInvested, selectedCurrency),
              prefix: <CurrencyCircleDollarIcon />,
              color: 'var(--nw-color-success-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Total capital',
              trend: calculateTrend(kpis.totalAmountInvested, previousKpis.totalAmountInvested, 'vs last quarter')
            },
            {
              key: 'total-market-value',
              title: getTranslationFromI18nKeyAndLabel('kpi.totalMarketValue', 'Total Market Value'),
              value: formatCurrency(kpis.totalMarketValue, selectedCurrency),
              prefix: <TrendUpIconAlt />,
              color: 'var(--nw-color-warning-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Current valuation',
              trend: calculateTrend(kpis.totalMarketValue, previousKpis.totalMarketValue, 'vs last quarter')
            },
            {
              key: 'average-occupancy-rate',
              title: getTranslationFromI18nKeyAndLabel('kpi.averageOccupancyRate', 'Average Occupancy Rate'),
              value: formatPercentage(kpis.averageOccupancyRate),
              prefix: <PercentIcon />,
              color: 'var(--nw-color-purple-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Portfolio avg',
              trend: calculateTrend(kpis.averageOccupancyRate, previousKpis.averageOccupancyRate, 'vs last quarter')
            }
          ]}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          onRetry={refetch}
          data-testid={formatDataTestId(prefixDataTestId, 'KPICards')}
        />
      </div>

      {/* Tabbed Charts */}
      <div className="gba:bg-white gba:rounded-lg gba:p-4">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          data-testid={formatDataTestId(prefixDataTestId, 'ChartTabs')}
        >
          <TabsList className="gba:grid gba:w-full gba:grid-cols-3">
            <TabsTrigger value="distribution" startIcon={<ChartPieIcon />}>
              {getTranslationFromI18nKeyAndLabel('tab.distribution', 'Distribution Analysis')}
            </TabsTrigger>
            <TabsTrigger value="timeline" startIcon={<TrendUpIcon />}>
              {getTranslationFromI18nKeyAndLabel('tab.timeline', 'Timeline Analysis')}
            </TabsTrigger>
            <TabsTrigger value="analytics" startIcon={<ChartBarIcon />}>
              {getTranslationFromI18nKeyAndLabel('tab.analytics', 'Performance Analysis')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="distribution" className="gba:mt-6">
            <RealEstateDistributionCharts
              rawInvestments={realEstateInvestments}
              masterCurrency={selectedCurrency}
              availableCurrencies={availableCurrencies}
            />
          </TabsContent>

          <TabsContent value="timeline" className="gba:mt-6">
            <RealEstateTimelineCharts
              {...props}
              rawInvestments={realEstateInvestments}
              masterCurrency={selectedCurrency}
              availableCurrencies={availableCurrencies}
            />
          </TabsContent>

          <TabsContent value="analytics" className="gba:mt-6">
            <RealEstateAnalyticsCharts
              {...props}
              masterCurrency={selectedCurrency}
              availableCurrencies={availableCurrencies}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default RealEstateInvestmentsReport
