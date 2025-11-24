import React, { useState, useEffect, useCallback } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarSign, CheckCircle, Award, Target } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCompactCurrency } from '@/common/utils/numberFormatter'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import { useInvestmentOpportunityFilters } from '@/business-apps/irm/core/apps/investment-relations/views/opportunity-view/hooks/useInvestmentOpportunityFilters'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries'
import type { InvestmentOpportunity } from '@/common/data/investment/types'

export interface SalesStatisticsProps extends BusinessAppContextProps {
  onRefresh?: () => void
  currencyCode?: string
}

interface SalesMetrics {
  totalSold: number
  totalRevenue: number
  averageRevenue: number
  salesThisYear: number
  totalSoldChange: number
  totalRevenueChange: number
  averageRevenueChange: number
  salesThisYearChange: number
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

  // Count sales closed this year
  const now = new Date()
  const thisYearStart = new Date(now.getFullYear(), 0, 1)
  const salesThisYear = filteredOpportunities.filter(opp => {
    if (!opp.closeDate) return false
    const closeDate = new Date(opp.closeDate)
    return closeDate >= thisYearStart
  }).length

  return {
    totalSold: filteredOpportunities.length,
    totalRevenue: totalValue,
    averageRevenue: averageValue,
    salesThisYear
  }
}

export const SalesStatistics: React.FC<SalesStatisticsProps> = ({ accessToken, userInfo, currencyCode }) => {
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const context = { accessToken, userInfo }
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  // Get filter data to identify WON status IDs
  const filterData = useInvestmentOpportunityFilters(context)
  const { statuses } = filterData

  // Identify WON status IDs for server-side filtering (same logic as SalesTab)
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
          totalSold: 0,
          totalRevenue: 0,
          averageRevenue: 0,
          salesThisYear: 0,
          totalSoldChange: 0,
          totalRevenueChange: 0,
          averageRevenueChange: 0,
          salesThisYearChange: 0,
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
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(currentDate.getDate() - 30)

      const current = calculateMetrics(wonOpportunities)
      const historical = calculateMetrics(wonOpportunities, thirtyDaysAgo)

      // Year-over-year for sales this year
      const lastYearStart = new Date(currentDate.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate())

      const salesLastYearSamePeriod = wonOpportunities.filter(opp => {
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
        totalSoldChange: calculatePercentageChange(current.totalSold, historical.totalSold),
        totalRevenueChange: calculatePercentageChange(current.totalRevenue, historical.totalRevenue),
        averageRevenueChange: calculatePercentageChange(current.averageRevenue, historical.averageRevenue),
        salesThisYearChange: calculatePercentageChange(current.salesThisYear, salesLastYearSamePeriod)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sales metrics')
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
        data-testid="sales-statistics-loading"
      />
    )
  }

  const widgets: WidgetItem[] = [
    {
      key: 'total-sold',
      title: getTranslationFromI18nKeyAndLabel('total_sold', 'Total Sold'),
      value: metrics.totalSold,
      prefix: <CheckCircle className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'successfully_sold_opportunities',
        'Successfully sold opportunities'
      ),
      trend: {
        value: formatPercentageChange(metrics.totalSoldChange),
        positive: metrics.totalSoldChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
      }
    },
    {
      key: 'average-sale-amount',
      title: getTranslationFromI18nKeyAndLabel('average_sale_amount', 'Average Sale Amount'),
      value: formatCompactCurrency(metrics.averageRevenue, metrics.currencyCode),
      valueIsString: true,
      prefix: <Target className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('average_amount_per_sale', 'Average amount per sale'),
      trend: {
        value: formatPercentageChange(metrics.averageRevenueChange),
        positive: metrics.averageRevenueChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
      }
    },
    {
      key: 'total-revenue',
      title: getTranslationFromI18nKeyAndLabel('total_revenue', 'Total Revenue'),
      value: formatCompactCurrency(metrics.totalRevenue, metrics.currencyCode),
      valueIsString: true,
      prefix: <DollarSign className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#389e0d',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('total_revenue_generated', 'Total revenue generated from sales'),
      trend: {
        value: formatPercentageChange(metrics.totalRevenueChange),
        positive: metrics.totalRevenueChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
      }
    },
    {
      key: 'sales-this-year',
      title: getTranslationFromI18nKeyAndLabel('sales_this_year', 'Sales This Year'),
      value: metrics.salesThisYear,
      prefix: <Award className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('closed_sales_this_year', 'Closed sales this year'),
      trend: {
        value: formatPercentageChange(metrics.salesThisYearChange),
        positive: metrics.salesThisYearChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_same_period_last_year', 'vs same period last year')
      }
    }
  ]

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={isLoading}
      error={error ? new Error(error) : null}
      skeletonCount={4}
      defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
      emptyText={getTranslationFromI18nKeyAndLabel('no_metrics_available', 'No metrics available')}
      data-testid="sales-statistics"
    />
  )
}

export default SalesStatistics
