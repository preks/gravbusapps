import React, { useEffect } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { TrendUpIcon, TargetIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCompactCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { useExitOpportunityMetrics } from '../hooks/useExitOpportunityMetrics'

export interface ExitOpportunityStatisticsProps extends BusinessAppContextProps {
  currencyCode?: string
}

export const ExitOpportunityStatistics: React.FC<ExitOpportunityStatisticsProps> = ({ accessToken, currencyCode }) => {
  const { metrics, isLoading, error, loadMetrics } = useExitOpportunityMetrics({ accessToken })

  // Load metrics on mount and when accessToken or currencyCode changes
  useEffect(() => {
    if (accessToken) {
      loadMetrics({ dealType: 'DIVESTMENT_DEAL', currencyCode: currencyCode || undefined })
    }
  }, [accessToken, currencyCode, loadMetrics])

  // Show loading state while loading or if no metrics yet
  if (isLoading || !metrics) {
    return (
      <WidgetGroup
        widgets={[]}
        isLoading={isLoading}
        error={error ? new Error(error) : null}
        skeletonCount={4}
        defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
        emptyText={getTranslationFromI18nKeyAndLabel('loading_metrics', 'Loading metrics...')}
        data-testid="exit-opportunity-statistics-loading"
      />
    )
  }

  // Use currencyCode from props, fallback to metrics currency if not provided
  const finalCurrencyCode = currencyCode || (metrics.currency ? extractCurrencyCode(metrics.currency) : 'EUR')

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
      prefix: <TrendUpIcon className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('active_opportunities', 'Active opportunities'),
      trend: {
        value: formatPercentageChange(metrics.countChange),
        positive: metrics.countChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_quarter', 'vs last quarter')
      }
    },
    {
      key: 'total-value',
      title: getTranslationFromI18nKeyAndLabel('total_value', 'Total Value'),
      value: formatCompactCurrency(metrics.totalValue, finalCurrencyCode),
      valueIsString: true,
      prefix: <TrendUpIcon className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('estimated_value', 'Estimated value'),
      trend: {
        value: formatPercentageChange(metrics.totalValueChange),
        positive: metrics.totalValueChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_quarter', 'vs last quarter')
      }
    },
    {
      key: 'average-value',
      title: getTranslationFromI18nKeyAndLabel('average_value', 'Average Value'),
      value: formatCompactCurrency(metrics.averageValue, finalCurrencyCode),
      valueIsString: true,
      prefix: <TargetIcon className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('avg_size', 'Avg size'),
      trend: {
        value: formatPercentageChange(metrics.averageValueChange),
        positive: metrics.averageValueChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_quarter', 'vs last quarter')
      }
    },
    {
      key: 'average-win-rate',
      title: getTranslationFromI18nKeyAndLabel('average_win_rate', 'Average Win Rate'),
      value: `${metrics.averageWinRate.toFixed(1)}%`,
      valueIsString: true,
      prefix: <CheckCircleIcon className="gba:h-5 gba:w-5 gba:text-orange-600" />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, md: 12, lg: 6 },
      description: getTranslationFromI18nKeyAndLabel('win_probability', 'Win probability'),
      trend: {
        value: formatPercentageChange(metrics.winRateChange),
        positive: metrics.winRateChange >= 0,
        description: getTranslationFromI18nKeyAndLabel('vs_last_quarter', 'vs last quarter')
      }
    }
  ]

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={isLoading}
      error={error ? new Error(error) : null}
      onRetry={() => loadMetrics({ dealType: 'DIVESTMENT_DEAL', currencyCode: currencyCode || undefined })}
      skeletonCount={4}
      defaultSpan={{ xs: 24, sm: 12, md: 12, lg: 6 }}
      emptyText={getTranslationFromI18nKeyAndLabel('no_metrics_available', 'No metrics available')}
      data-testid="exit-opportunity-statistics"
    />
  )
}

export default ExitOpportunityStatistics
