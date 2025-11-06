import React, { useEffect } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { TrendingUp, Target, CheckCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCompactCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { useExitOpportunityMetrics } from '../hooks/useExitOpportunityMetrics'

export interface ExitOpportunityStatisticsProps extends BusinessAppContextProps {
  onRefresh?: () => void
}

export const ExitOpportunityStatistics: React.FC<ExitOpportunityStatisticsProps> = ({ accessToken }) => {
  const { metrics, isLoading, error, loadMetrics } = useExitOpportunityMetrics({ accessToken })

  // Load metrics on mount
  useEffect(() => {
    loadMetrics({ dealType: 'DIVESTMENT_DEAL' })
  }, [accessToken, loadMetrics])

  if (!metrics) {
    return (
      <WidgetGroup
        widgets={[]}
        isLoading={true}
        error={null}
        skeletonCount={4}
        defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
        emptyText={getTranslationFromI18nKeyAndLabel('loading_metrics', 'Loading metrics...')}
        data-testid="exit-opportunity-statistics-loading"
      />
    )
  }

  const currency = metrics.currency || 'EUR'
  const currencyCode = extractCurrencyCode(currency)

  // Helper function to format percentage change
  const formatPercentageChange = (change: number): string => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }

  const widgets: WidgetItem[] = [
    {
      key: 'total-opportunities',
      title: getTranslationFromI18nKeyAndLabel('total_opportunities', 'Total Opportunities'),
      value: metrics.totalCount,
      prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('active_exit_opportunities', 'Active exit opportunities'),
      trend: {
        value: formatPercentageChange(metrics.countChange),
        positive: metrics.countChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
      }
    },
    {
      key: 'total-value',
      title: getTranslationFromI18nKeyAndLabel('total_value', 'Total Value'),
      value: formatCompactCurrency(metrics.totalValue, currencyCode),
      valueIsString: true,
      prefix: <TrendingUp className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('estimated_opportunity_value', 'Estimated opportunity value'),
      trend: {
        value: formatPercentageChange(metrics.totalValueChange),
        positive: metrics.totalValueChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
      }
    },
    {
      key: 'average-value',
      title: getTranslationFromI18nKeyAndLabel('average_value', 'Average Value'),
      value: formatCompactCurrency(metrics.averageValue, currencyCode),
      valueIsString: true,
      prefix: <Target className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('average_opportunity_size', 'Average opportunity size'),
      trend: {
        value: formatPercentageChange(metrics.averageValueChange),
        positive: metrics.averageValueChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
      }
    },
    {
      key: 'average-win-rate',
      title: getTranslationFromI18nKeyAndLabel('average_win_rate', 'Average Win Rate'),
      value: `${metrics.averageWinRate.toFixed(1)}%`,
      valueIsString: true,
      prefix: <CheckCircle className="gba:h-5 gba:w-5 gba:text-orange-600" />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('success_probability', 'Success probability'),
      trend: {
        value: formatPercentageChange(metrics.winRateChange),
        positive: metrics.winRateChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_30_days', 'vs last 30 days')
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
      data-testid="exit-opportunity-statistics"
    />
  )
}

export default ExitOpportunityStatistics
