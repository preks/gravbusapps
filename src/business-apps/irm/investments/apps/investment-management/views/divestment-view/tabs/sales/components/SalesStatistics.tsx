import React, { useState, useEffect, useCallback } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarSign, CheckCircle, Award, Target } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCompactCurrency } from '@/common/utils/numberFormatter'
import { useGetInvestmentOpportunities } from '@/common/data/investment/hooks/useInvestmentOpportunities'
import type { InvestmentOpportunityQueryVariables } from '@/common/data/investment/queries/investmentOpportunityQueries.new'
import type { InvestmentOpportunity } from '@/common/data/investment/types'

export interface SalesStatisticsProps extends BusinessAppContextProps {
  onRefresh?: () => void
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
}

export const SalesStatistics: React.FC<SalesStatisticsProps> = ({ accessToken, userInfo }) => {
  const [metrics, setMetrics] = useState<SalesMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const context = { accessToken, userInfo }
  const { fetchInvestmentOpportunities } = useGetInvestmentOpportunities(context)

  const loadMetrics = useCallback(async () => {
    if (!accessToken) return

    setIsLoading(true)
    setError(null)

    try {
      // Fetch current WON opportunities
      const currentVariables: InvestmentOpportunityQueryVariables = {
        limit: 1000,
        dealType: 'DIVESTMENT_DEAL'
      }

      const currentResult = await fetchInvestmentOpportunities(currentVariables)

      // Filter for WON opportunities
      const filterWonOpportunities = (opportunities: InvestmentOpportunity[]) => {
        return opportunities.filter(opp => {
          const statusValue = opp.opportunityStatus?.value?.toUpperCase()
          const statusCode = opp.opportunityStatus?.code?.toUpperCase()
          const wonVariations = ['WON', 'CLOSED WON', 'SOLD', 'SUCCESS', 'COMPLETED']

          return wonVariations.some(
            variation =>
              statusValue === variation ||
              statusCode === variation ||
              statusValue?.includes('WON') ||
              statusCode?.includes('WON')
          )
        })
      }

      // Calculate metrics for a dataset
      const calculateMetrics = (opportunities: InvestmentOpportunity[], beforeDate?: Date) => {
        let filteredOpportunities = opportunities

        if (beforeDate) {
          filteredOpportunities = opportunities.filter(opp => {
            const updatedAt = new Date(opp.updatedAt)
            return updatedAt <= beforeDate
          })
        }

        const wonOpportunities = filterWonOpportunities(filteredOpportunities)
        const totalValue = wonOpportunities.reduce((sum, opp) => sum + (opp.estimatedAmount || 0), 0)
        const averageValue = wonOpportunities.length > 0 ? totalValue / wonOpportunities.length : 0

        // Count sales closed this year
        const now = new Date()
        const thisYearStart = new Date(now.getFullYear(), 0, 1)
        const salesThisYear = wonOpportunities.filter(opp => {
          if (!opp.closeDate) return false
          const closeDate = new Date(opp.closeDate)
          return closeDate >= thisYearStart
        }).length

        return {
          totalSold: wonOpportunities.length,
          totalRevenue: totalValue,
          averageRevenue: averageValue,
          salesThisYear
        }
      }

      // Calculate current and historical metrics
      const currentDate = new Date()
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(currentDate.getDate() - 30)

      const current = calculateMetrics(currentResult.InvestmentOpportunity || [])
      const historical = calculateMetrics(currentResult.InvestmentOpportunity || [], thirtyDaysAgo)

      // Calculate percentage changes
      const calculatePercentageChange = (current: number, previous: number): number => {
        if (previous === 0) return current > 0 ? 100 : 0
        return ((current - previous) / previous) * 100
      }

      // Year-over-year for sales this year
      const lastYearStart = new Date(currentDate.getFullYear() - 1, 0, 1)
      const lastYearEnd = new Date(currentDate.getFullYear() - 1, currentDate.getMonth(), currentDate.getDate())

      const wonOpportunities = filterWonOpportunities(currentResult.InvestmentOpportunity || [])
      const salesLastYearSamePeriod = wonOpportunities.filter(opp => {
        if (!opp.closeDate) return false
        const closeDate = new Date(opp.closeDate)
        return closeDate >= lastYearStart && closeDate <= lastYearEnd
      }).length

      setMetrics({
        ...current,
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
  }, [accessToken, fetchInvestmentOpportunities])

  useEffect(() => {
    loadMetrics()
  }, [loadMetrics])

  // Extract currency code
  const currencyCode = 'EUR' // Default currency for sales metrics

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
      value: formatCompactCurrency(metrics.averageRevenue, currencyCode),
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
      value: formatCompactCurrency(metrics.totalRevenue, currencyCode),
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
