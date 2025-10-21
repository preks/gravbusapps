import React, { useState, useCallback, useEffect, useMemo } from 'react'
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
import { TrendingUp, BarChart, PieChart } from 'lucide-react'
import { WidgetGroup } from '@/components/widget-group'
import { DollarCircleOutlined, RiseOutlined, TeamOutlined, PercentageOutlined } from '@ant-design/icons'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGetInvestments } from '@/common/data/investment'
import type { Investment } from '@/common/data/investment'
import { useRealEstateKPIIntegration } from './hooks'
import { RealEstateDistributionCharts, RealEstateTimelineCharts, RealEstateAnalyticsCharts } from './components'
import {
  calculateChange,
  formatCurrency,
  formatPercentage,
  safeCurrencyExtraction,
  getInvestmentStatusColor,
  getRiskLevelColor
} from '../shared/utils'
import type { RealEstateInvestmentSummary } from '../shared/types'

// Legacy interface - kept for compatibility
export interface RealEstateInvestmentKPIs {
  totalPropertyValue: number
  averageOccupancyRate: number
  totalUnits: number
  totalAnnualExpenses: number
}

interface RealEstateInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const RealEstateInvestmentsReport: React.FC<RealEstateInvestmentsReportProps> = props => {
  const prefixDataTestId = props.prefixDataTestId || 'RealEstateInvestmentsReport'
  const [activeTab, setActiveTab] = useState('distribution')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('EUR')

  const [realEstateInvestments, setRealEstateInvestments] = useState<RealEstateInvestmentSummary[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Extract unique currencies from real estate investments
  const availableCurrencies = useMemo(() => {
    const currencies = new Set<string>()
    realEstateInvestments.forEach(inv => {
      if (inv.currencyCode) {
        currencies.add(inv.currencyCode)
      }
    })
    const currencyArray = Array.from(currencies).sort()
    // Ensure at least the default currency is available
    return currencyArray.length > 0 ? currencyArray : ['EUR']
  }, [realEstateInvestments])

  // Use the new KPI integration hook for real GraphQL aggregate queries with currency filter
  const {
    current: kpis,
    previous: previousKpis,
    isLoading: kpiLoading,
    error: kpiError,
    refetch: refetchKpis
  } = useRealEstateKPIIntegration(props, selectedCurrency)

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
              .replace(/^,\s*|,\s*$/g, '') || 'Unknown Location'
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
      loadData()
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
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center gba:mb-6">
        <div className="gba:flex gba:items-center gba:gap-4">
          <h3 className="gba:text-2xl gba:font-bold gba:text-gray-900 gba:m-0">
            {getTranslationFromI18nKeyAndLabel('realEstate.investments.title', 'Real Estate Investments Report')}
          </h3>
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
              prefix: <TeamOutlined />,
              color: 'var(--nw-color-primary-500)',
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Total number of real estate investments',
              trend: {
                value: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).value,
                positive: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).positive,
                description: 'vs 7 days ago'
              }
            },
            {
              key: 'total-amount-invested',
              title: getTranslationFromI18nKeyAndLabel('kpi.totalAmountInvested', 'Total Amount Invested'),
              value: formatCurrency(kpis.totalAmountInvested),
              prefix: <DollarCircleOutlined />,
              color: 'var(--nw-color-success-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Sum of all real estate investment amounts',
              trend: {
                value: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).value,
                positive: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).positive,
                description: 'vs 7 days ago'
              }
            },
            {
              key: 'total-market-value',
              title: getTranslationFromI18nKeyAndLabel('kpi.totalMarketValue', 'Total Market Value'),
              value: formatCurrency(kpis.totalMarketValue),
              prefix: <RiseOutlined />,
              color: 'var(--nw-color-warning-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Current total market value of properties',
              trend: {
                value: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).value,
                positive: calculateChange(kpis.totalMarketValue, previousKpis.totalMarketValue).positive,
                description: 'vs 7 days ago'
              }
            },
            {
              key: 'average-occupancy-rate',
              title: getTranslationFromI18nKeyAndLabel('kpi.averageOccupancyRate', 'Average Occupancy Rate'),
              value: formatPercentage(kpis.averageOccupancyRate),
              prefix: <PercentageOutlined />,
              color: 'var(--nw-color-purple-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Average occupancy rate across all properties',
              trend: {
                value: calculateChange(kpis.averageOccupancyRate, previousKpis.averageOccupancyRate).value,
                positive: calculateChange(kpis.averageOccupancyRate, previousKpis.averageOccupancyRate).positive,
                description: 'vs 7 days ago'
              }
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
            <TabsTrigger value="distribution" startIcon={<PieChart />}>
              {getTranslationFromI18nKeyAndLabel('tab.distribution', 'Distribution Analysis')}
            </TabsTrigger>
            <TabsTrigger value="timeline" startIcon={<TrendingUp />}>
              {getTranslationFromI18nKeyAndLabel('tab.timeline', 'Timeline Analysis')}
            </TabsTrigger>
            <TabsTrigger value="analytics" startIcon={<BarChart />}>
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
