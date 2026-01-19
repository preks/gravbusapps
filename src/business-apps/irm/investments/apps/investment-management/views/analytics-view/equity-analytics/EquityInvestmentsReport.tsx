import React, { useState, useCallback, useEffect } from 'react'
import {
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Alert,
  AlertTitle,
  AlertDescription,
  Spinner,
  Badge
} from '@newwork/nw-design-system'
import {
  TrendUpIcon,
  ChartBarIcon,
  ChartPieIcon,
  CurrencyCircleDollarIcon,
  CalendarBlankIcon,
  ChartLineIcon,
  UsersThreeIcon
} from '@phosphor-icons/react'
import { WidgetGroup } from '@/components/widget-group'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGetInvestments } from '@/common/data/investment/hooks/useInvestments'
import type { Investment, EquityInvestment } from '@/common/data/investment/types/investmentTypes'

// Extended Investment type that includes specialization fields from GraphQL queries
interface InvestmentWithSpecializations extends Investment {
  equityInvestment?: EquityInvestment[]
  realEstateInvestment?: any[]
  liquidFundInvestment?: any[]
  bookValue?: number
  investmentRole?: Array<{
    id: string
    displayOrder?: number
    investmentRole?: {
      value?: string
    }
  }>
}
import { useEquityKPIIntegration } from './hooks'
import { useAvailableCurrencies } from '@/common/data/common/hooks/useAvailableCurrencies'
import { safeCurrencyExtraction } from '@/common/utils/numberFormatter'
import { formatDuration } from '../shared/utils/dateUtils'
import type { EquityInvestmentSummary } from '../shared/types'
import { EquityTimelineCharts, EquityAnalyticsCharts, EquityDistributionCharts } from './components'

// Helper functions for investment-specific business logic
const calculateChange = (current: number, previous: number): { value: string; positive: boolean } => {
  if (previous === 0) {
    return { value: current > 0 ? '+100%' : '0%', positive: current > 0 }
  }
  const change = ((current - previous) / Math.abs(previous)) * 100
  const formattedChange = Math.abs(change).toFixed(1)
  return {
    value: `${change >= 0 ? '+' : '-'}${formattedChange}%`,
    positive: change >= 0
  }
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

const getInvestmentRoleColor = (role: string): string => {
  switch (role?.toLowerCase()) {
    case 'lead':
      return 'purple'
    case 'co-investor':
      return 'blue'
    case 'minority':
      return 'green'
    case 'majority':
      return 'orange'
    default:
      return 'gray'
  }
}

// Legacy interface - kept for compatibility but not used for KPIs anymore
export interface EquityInvestmentKPIs {
  totalEquityValue: number
  averageCompanyValuation: number
  totalEbitda: number
  numberOfEquityInvestments: number
}

// Note: safeCurrencyExtraction and formatDuration now imported from shared utils

interface EquityInvestmentsReportProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const EquityInvestmentsReport: React.FC<EquityInvestmentsReportProps> = props => {
  const prefixDataTestId = props.prefixDataTestId || 'EquityInvestmentsReport'
  const [activeTab, setActiveTab] = useState('distribution')
  const [selectedCurrency, setSelectedCurrency] = useState<string>('Currency:v1:EUR') // Store full ID

  const [dataLoading, setDataLoading] = useState(true)
  const [dataError, setDataError] = useState<string | null>(null)

  // Prevent duplicate queries (React Strict Mode calls effects twice)
  const isLoadingRef = React.useRef(false)

  // Extract currency code from ID for KPI hook (it expects "EUR", not "Currency:v1:EUR")
  const selectedCurrencyCode = selectedCurrency.split(':').pop() || 'EUR'

  // Fetch available currencies efficiently using distinctOn
  const {
    currencies: currencyOptions,
    isLoading: currenciesLoading,
    error: currenciesError
  } = useAvailableCurrencies(props, {
    filters: { entity: 'Investment', investmentGroupId: 'InvestmentGroup:v1:EQUITY' },
    returnFormat: 'full'
  })

  const availableCurrencies = React.useMemo(
    () => currencyOptions as Array<{ id: string; code: string; value: string }>,
    [currencyOptions]
  )

  // Use the new KPI integration hook for real GraphQL aggregate queries
  const {
    current: kpis,
    previous: previousKpis,
    isLoading: kpiLoading,
    error: kpiError,
    refetch: refetchKpis
  } = useEquityKPIIntegration(props, selectedCurrencyCode)

  const { fetchInvestments } = useGetInvestments(props)

  // Combined loading and error states
  const isLoading = dataLoading || kpiLoading || currenciesLoading
  const error = dataError || kpiError || currenciesError

  // Transform equity data
  const transformEquityData = useCallback((investments: InvestmentWithSpecializations[]): EquityInvestmentSummary[] => {
    return investments
      .filter(investment => {
        // Include investments that have equityInvestment data OR are equity-related by investment type
        const hasEquityData =
          investment.equityInvestment &&
          Array.isArray(investment.equityInvestment) &&
          investment.equityInvestment.length > 0
        const isEquityType =
          (investment.investmentType?.value ?? '').toLowerCase().includes('equity') ||
          (investment.investmentGroup?.value ?? '').toLowerCase().includes('equity')
        return hasEquityData || isEquityType
      })
      .map(investment => {
        // Get the first equity investment or create a default one
        const equityInvestment =
          investment.equityInvestment && investment.equityInvestment.length > 0
            ? investment.equityInvestment[0]
            : { id: investment.id, ebitdaAmount: 0, marketValue: 0, turnoverAmount: 0 }

        const bookValue = investment.bookValue || 0
        const marketValue = investment.investmentMarketValue || bookValue
        const roi = bookValue > 0 ? ((marketValue - bookValue) / bookValue) * 100 : 0

        return {
          id: equityInvestment.id,
          investment,
          equityInvestment,
          displayName: investment.displayName || investment.name || 'Unknown Equity',
          statusColor: getInvestmentStatusColor(investment.investmentStatus?.value || ''),
          stakeTypeColor: getInvestmentRoleColor(investment.investmentStakeType?.value || ''),
          riskLevelColor: getRiskLevelColor(investment.investmentRiskLevel?.value || ''),
          currencyCode: safeCurrencyExtraction(investment.currency),
          roi,
          isActive: investment.investmentStatus?.value?.toLowerCase() === 'active',
          ebitdaMargin: (equityInvestment as any).ebitdaMargin || 0,
          roleColor: getInvestmentRoleColor(
            Array.isArray(investment.investmentRole) && investment.investmentRole.length > 0
              ? investment.investmentRole[0]?.investmentRole?.value || ''
              : ''
          )
        }
      })
  }, [])

  // Load equity investment data for chart display with currency filter
  const loadData = useCallback(async () => {
    if (!props.accessToken || isLoadingRef.current) {
      return
    }

    isLoadingRef.current = true
    setDataLoading(true)
    setDataError(null)

    try {
      // Always fetch filtered by selected currency (server-side filtering)
      // selectedCurrency is already in full ID format: "Currency:v1:EUR"
      const currencyIds = selectedCurrency ? [selectedCurrency] : undefined
      const result = await fetchInvestments({
        currencyIds: currencyIds
      })
      // Data is transformed and used by server-side queries in EquityDistributionCharts
      transformEquityData(result.Investment as InvestmentWithSpecializations[])
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setDataLoading(false)
      isLoadingRef.current = false
    }
  }, [props.accessToken, fetchInvestments, transformEquityData, selectedCurrency])

  // Load data on mount and when access token or selected currency changes
  useEffect(() => {
    if (props.accessToken) {
      void loadData()
    }
  }, [props.accessToken, selectedCurrency, loadData])

  // Combined refetch function for error retry
  const refetch = useCallback(async () => {
    await Promise.all([loadData(), refetchKpis()])
  }, [loadData, refetchKpis])

  // Chart data for Distribution and Timeline tabs (charts will handle their own currency filtering)
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
          <Button variant="default" size="sm" onClick={() => refetch()}>
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
            {getTranslationFromI18nKeyAndLabel('equity.investments.title', 'Equity Investments Report')}
          </h3>
          <Badge variant="secondary">
            {kpis?.totalInvestments || 0}{' '}
            {getTranslationFromI18nKeyAndLabel('equity.investments.items', 'equity investments')}
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
                <SelectItem key={currency.id} value={currency.id}>
                  {currency.code}
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
              description: 'Equity count',
              trend: {
                value: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).value,
                positive: calculateChange(kpis.totalInvestments, previousKpis.totalInvestments).positive,
                description: 'vs last quarter'
              }
            },
            {
              key: 'assets-under-management',
              title: getTranslationFromI18nKeyAndLabel('kpi.assetsUnderManagement', 'Assets Under Management'),
              value: new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: selectedCurrencyCode,
                notation: 'compact',
                compactDisplay: 'short',
                minimumFractionDigits: 0,
                maximumFractionDigits: 1
              }).format(kpis.totalAmountInvested),
              prefix: <CurrencyCircleDollarIcon />,
              color: 'var(--nw-color-success-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Total AUM',
              trend: {
                value: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).value,
                positive: calculateChange(kpis.totalAmountInvested, previousKpis.totalAmountInvested).positive,
                description: 'vs last quarter'
              }
            },
            {
              key: 'portfolio-moic',
              title: getTranslationFromI18nKeyAndLabel('kpi.portfolioMoic', 'Portfolio MOIC'),
              value: `${kpis.portfolioMoic.toFixed(1)}x`,
              prefix: <ChartLineIcon />,
              color: 'var(--nw-color-warning-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Avg MOIC',
              trend: {
                value: calculateChange(kpis.portfolioMoic, previousKpis.portfolioMoic).value,
                positive: calculateChange(kpis.portfolioMoic, previousKpis.portfolioMoic).positive,
                description: 'vs last quarter'
              }
            },
            {
              key: 'average-duration',
              title: getTranslationFromI18nKeyAndLabel('kpi.averageDuration', 'Average Duration'),
              value: formatDuration(kpis.averageDuration),
              prefix: <CalendarBlankIcon />,
              color: 'var(--nw-color-purple-500)',
              valueIsString: true,
              span: { xs: 24, sm: 12, lg: 6 },
              description: 'Avg holding period',
              trend: {
                value: calculateChange(kpis.averageDuration, previousKpis.averageDuration).value,
                positive: calculateChange(kpis.averageDuration, previousKpis.averageDuration).positive,
                description: 'vs last quarter'
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
            <div className="gba:space-y-6 gba:w-full">
              <EquityDistributionCharts
                {...props}
                masterCurrency={selectedCurrencyCode}
                availableCurrencies={availableCurrencies.map(c => c.code)}
              />
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="gba:mt-6">
            <div className="gba:grid gba:grid-cols-1 gba:gap-6 gba:w-full">
              <EquityTimelineCharts
                {...props}
                masterCurrency={selectedCurrencyCode}
                availableCurrencies={availableCurrencies.map(c => c.code)}
              />
            </div>
          </TabsContent>

          <TabsContent value="analytics" className="gba:mt-6">
            {activeTab === 'analytics' && (
              <div className="gba:space-y-6">
                <EquityAnalyticsCharts
                  {...props}
                  masterCurrency={selectedCurrencyCode}
                  availableCurrencies={availableCurrencies.map(c => c.code)}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default EquityInvestmentsReport
