import React, { useEffect } from 'react'
import type { WidgetItem } from '@/components/widget-group'
import { TrendUpIcon, TargetIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCompactCurrency, extractCurrencyCode } from '@/common/utils/numberFormatter'
import { calculateChange } from '@/common/data/investment/kpis/utils'
import { useExitOpportunityMetrics, ExitOpportunityMetrics } from '../hooks/useExitOpportunityMetrics'
import { DivestmentStatisticsPanel, WIDGET_SPAN, VS_LAST_QUARTER } from '../../../utils/DivestmentStatisticsPanel'

function buildExitOpportunityWidgets(metrics: ExitOpportunityMetrics, currencyCode: string): WidgetItem[] {
  const countTrend = calculateChange(metrics.totalCount, metrics.prevTotalCount)
  const totalValueTrend = calculateChange(metrics.totalValue, metrics.prevTotalValue)
  const avgValueTrend = calculateChange(metrics.averageValue, metrics.prevAverageValue)
  const winRateTrend = calculateChange(metrics.averageWinRate, metrics.prevAverageWinRate)

  return [
    {
      key: 'total-opportunities',
      title: getTranslationFromI18nKeyAndLabel('total_opportunities', 'Total Opportunities'),
      value: metrics.totalCount,
      prefix: <TrendUpIcon className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1890ff',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('active_opportunities', 'Active opportunities'),
      trend: { ...countTrend, description: VS_LAST_QUARTER }
    },
    {
      key: 'total-value',
      title: getTranslationFromI18nKeyAndLabel('total_value', 'Total Value'),
      value: formatCompactCurrency(metrics.totalValue, currencyCode),
      valueIsString: true,
      prefix: <TrendUpIcon className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#52c41a',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('estimated_value', 'Estimated value'),
      trend: { ...totalValueTrend, description: VS_LAST_QUARTER }
    },
    {
      key: 'average-value',
      title: getTranslationFromI18nKeyAndLabel('average_value', 'Average Value'),
      value: formatCompactCurrency(metrics.averageValue, currencyCode),
      valueIsString: true,
      prefix: <TargetIcon className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#722ed1',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('avg_size', 'Avg size'),
      trend: { ...avgValueTrend, description: VS_LAST_QUARTER }
    },
    {
      key: 'average-win-rate',
      title: getTranslationFromI18nKeyAndLabel('average_win_rate', 'Average Win Rate'),
      value: `${metrics.averageWinRate.toFixed(1)}%`,
      valueIsString: true,
      prefix: <CheckCircleIcon className="gba:h-5 gba:w-5 gba:text-orange-600" />,
      color: '#fa8c16',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('win_probability', 'Win probability'),
      trend: { ...winRateTrend, description: VS_LAST_QUARTER }
    }
  ]
}

export interface ExitOpportunityStatisticsProps {
  accessToken: string
  currencyCode?: string
  enabled?: boolean
}

export const ExitOpportunityStatistics: React.FC<ExitOpportunityStatisticsProps> = ({
  accessToken,
  currencyCode,
  enabled = true
}) => {
  const { metrics, isLoading, error, loadMetrics } = useExitOpportunityMetrics({ accessToken })

  useEffect(() => {
    if (accessToken && enabled) {
      loadMetrics({ dealType: 'DIVESTMENT_DEAL', currencyCode: currencyCode || undefined })
    }
  }, [accessToken, currencyCode, loadMetrics, enabled])

  const finalCurrencyCode = extractCurrencyCode(currencyCode) || 'EUR'

  const widgets: WidgetItem[] = metrics ? buildExitOpportunityWidgets(metrics, finalCurrencyCode) : []

  return (
    <DivestmentStatisticsPanel
      widgets={widgets}
      isLoading={isLoading}
      error={error}
      onRetry={() => loadMetrics({ dealType: 'DIVESTMENT_DEAL', currencyCode: currencyCode || undefined })}
      dataTestId="exit-opportunity-statistics"
    />
  )
}

export default ExitOpportunityStatistics
