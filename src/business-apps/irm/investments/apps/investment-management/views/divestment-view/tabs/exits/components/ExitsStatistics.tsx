import React, { useState, useEffect, useCallback } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CurrencyDollarIcon, CheckCircleIcon, MedalIcon, TargetIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCompactCurrency } from '@/common/utils/numberFormatter'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useInvestmentOpportunityFilters } from '@/business-apps/irm/core/apps/investment-relations/views/opportunity-view/hooks/useInvestmentOpportunityFilters'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import type { InvestmentOpportunity } from '@/common/data/investment/types/investmentOpportunityTypes'

export interface ExitsStatisticsProps extends BusinessAppContextProps {
  currencyCode?: string
}

interface ExitsMetrics {
  totalExits: number
  totalExitAmount: number
  averageExitAmount: number
  exitsThisYear: number
  totalExitsChange: number
  totalExitAmountChange: number
  averageExitAmountChange: number
  exitsThisYearChange: number
  currencyCode: string
}

// Helper: Calculate percentage change
const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// Helper: Calculate metrics for a dataset (opportunities are already WON from server filter)
const calculateMetrics = (opportunities: InvestmentOpportunity[], beforeDate?: Date) => {
  let filteredOpportunities = opportunities

  if (beforeDate) {
    filteredOpportunities = opportunities.filter(opp => {
      const updatedAt = new Date(opp.updatedAt)
      return updatedAt <= beforeDate
    })
  }

  // No need to filter for WON - server already did this
  const totalValue = filteredOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
  const averageValue = filteredOpportunities.length > 0 ? totalValue / filteredOpportunities.length : 0

  // Count exits closed this year
  const now = new Date()
  const thisYearStart = new Date(now.getFullYear(), 0, 1)
  const exitsThisYear = filteredOpportunities.filter(opp => {
    if (!opp.closeDate) return false
    const closeDate = new Date(opp.closeDate)
    return closeDate >= thisYearStart
  }).length

  return {
    totalExits: filteredOpportunities.length,
    totalExitAmount: totalValue,
    averageExitAmount: averageValue,
    exitsThisYear
  }
}

export const ExitsStatistics: React.FC<ExitsStatisticsProps> = ({ accessToken, userInfo, currencyCode }) => {
  const [metrics, setMetrics] = useState<ExitsMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const context = { accessToken, userInfo }
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  // Get filter data to identify WON status IDs
  const filterData = useInvestmentOpportunityFilters(context)
  const { statuses } = filterData

  // Identify WON status IDs for server-side filtering (same logic as ExitsTab)
  const wonStatusIds = React.useMemo(() => {
    return statuses
      .filter(status => {
        const label = status.label?.toUpperCase() || ''
        const wonVariations = ['WON', 'CLOSED WON', 'SOLD', 'SUCCESS', 'COMPLETED']
        return wonVariations.some(variation => label.includes(variation) || label === variation)
      })
      .map(status => status.id)
  }, [statuses])

  const loadMetrics = useCallback(async () => {
    if (!accessToken || wonStatusIds.length === 0) {
      // If no WON statuses found, set empty metrics
      if (wonStatusIds.length === 0) {
        setMetrics({
          totalExits: 0,
          totalExitAmount: 0,
          averageExitAmount: 0,
          exitsThisYear: 0,
          totalExitsChange: 0,
          totalExitAmountChange: 0,
          averageExitAmountChange: 0,
          exitsThisYearChange: 0,
          currencyCode: currencyCode || 'EUR'
        })
        setIsLoading(false)
      }
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      // Fetch WON opportunities with currency filter (server-side filtering)
      const currentVariables: InvestmentOpportunityQueryVariables = {
        limit: 1000,
        dealType: 'DIVESTMENT_DEAL',
        currencyCode: currencyCode || undefined,
        statusIds: wonStatusIds // Server-side filter for WON status
      }

      const currentResult = await fetchInvestmentOpportunities(currentVariables)

      // All opportunities are already WON (filtered by server)
      const wonOpportunities = currentResult.InvestmentOpportunity || []

      // Calculate current and historical metrics
      const currentDate = new Date()
      const quarterAgo = new Date()
      quarterAgo.setDate(currentDate.getDate() - 91)

      const current = calculateMetrics(wonOpportunities)
      const historical = calculateMetrics(wonOpportunities, quarterAgo)

      // Year-over-year for exits this year
      const lastYearStart = new Date(currentDate.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate())

      const exitsLastYearSamePeriod = wonOpportunities.filter(opp => {
        if (!opp.closeDate) return false
        const closeDate = new Date(opp.closeDate)
        return closeDate >= lastYearStart && closeDate <= lastYearEnd
      }).length

      // Extract currency from opportunities or use provided currencyCode
      const extractedCurrency =
        wonOpportunities.length > 0 && wonOpportunities[0].currency
          ? wonOpportunities[0].currency.code || 'EUR'
          : currencyCode || 'EUR'

      setMetrics({
        ...current,
        currencyCode: extractedCurrency,
        totalExitsChange: calculatePercentageChange(current.totalExits, historical.totalExits),
        totalExitAmountChange: calculatePercentageChange(current.totalExitAmount, historical.totalExitAmount),
        averageExitAmountChange: calculatePercentageChange(current.averageExitAmount, historical.averageExitAmount),
        exitsThisYearChange: calculatePercentageChange(current.exitsThisYear, exitsLastYearSamePeriod)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load exits metrics')
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, fetchInvestmentOpportunities, currencyCode, wonStatusIds])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  // Helper function to format percentage change
  const formatPercentageChange = (change: number): string => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  if (!metrics) {
    return (
      <WidgetGroup
        widgets={[]}
        isLoading={true}
        error={null}
        skeletonCount={4}
        defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
        emptyText={getTranslationFromI18nKeyAndLabel('loading_metrics', 'Loading metrics...')}
        data-testid="exits-statistics-loading"
      />
    )
  }

  const widgets: WidgetItem[] = [
    {
      key: 'total-exits',
      title: getTranslationFromI18nKeyAndLabel('total_exits', 'Total Exit'),
      value: metrics.totalExits,
      prefix: <CheckCircleIcon className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('exited_opportunities', 'Exited opportunities'),
      trend: {
        value: formatPercentageChange(metrics.totalExitsChange),
        positive: metrics.totalExitsChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_quarter', 'vs last quarter')
      }
    },
    {
      key: 'average-exit-amount',
      title: getTranslationFromI18nKeyAndLabel('average_exit_amount', 'Average Exit Amount'),
      value: formatCompactCurrency(metrics.averageExitAmount, metrics.currencyCode),
      valueIsString: true,
      prefix: <TargetIcon className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('avg_per_exit', 'Avg per exit'),
      trend: {
        value: formatPercentageChange(metrics.averageExitAmountChange),
        positive: metrics.averageExitAmountChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_quarter', 'vs last quarter')
      }
    },
    {
      key: 'total-exit-amount',
      title: getTranslationFromI18nKeyAndLabel('total_exit_amount', 'Total Exit Amount'),
      value: formatCompactCurrency(metrics.totalExitAmount, metrics.currencyCode),
      valueIsString: true,
      prefix: <CurrencyDollarIcon className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#389e0d',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('total_generated', 'Total generated'),
      trend: {
        value: formatPercentageChange(metrics.totalExitAmountChange),
        positive: metrics.totalExitAmountChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_quarter', 'vs last quarter')
      }
    },
    {
      key: 'exits-this-year',
      title: getTranslationFromI18nKeyAndLabel('exits_this_year', 'Exits This Year'),
      value: metrics.exitsThisYear,
      prefix: <MedalIcon className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('closed_ytd', 'Closed YTD'),
      trend: {
        value: formatPercentageChange(metrics.exitsThisYearChange),
        positive: metrics.exitsThisYearChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_same_period_last_year', 'vs same period last year')
      }
    }
  ]

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={isLoading}
      error={error ? new Error(error) : null}
      onRetry={loadMetrics}
      skeletonCount={4}
      defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
      emptyText={getTranslationFromI18nKeyAndLabel('no_metrics_available', 'No metrics available')}
      data-testid="exits-statistics"
    />
  )
}

export default ExitsStatistics
