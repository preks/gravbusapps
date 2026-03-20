import React from 'react'
import { TrendDownIcon, CurrencyDollarIcon, TrendUpIcon, ChartBarIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import type { WidgetItem } from '@/components/widget-group'
import { formatCurrencyCompact } from '@/common/utils/numberFormatter'
import { calculateChange } from '@/common/data/investment/kpis/utils'
import type { PlannedExitsKPIData } from '../hooks/usePlannedExitsMetrics'
import { DivestmentStatisticsPanel, WIDGET_SPAN, VS_LAST_QUARTER } from '../../../utils/DivestmentStatisticsPanel'

interface PlannedExitsMetricsProps {
  current: PlannedExitsKPIData
  previous: PlannedExitsKPIData
  currencyCode?: string
  isLoading?: boolean
  error?: string | null
  onRetry?: () => Promise<void>
}

const PlannedExitsMetrics: React.FC<PlannedExitsMetricsProps> = ({
  current,
  previous,
  currencyCode = 'EUR',
  isLoading = false,
  error = null,
  onRetry
}) => {
  const countTrend = calculateChange(current.totalCount, previous.totalCount)
  const investmentValueTrend = calculateChange(current.totalInvestmentValue, previous.totalInvestmentValue)
  const marketValueTrend = calculateChange(current.totalMarketValue, previous.totalMarketValue)
  const performanceTrend = calculateChange(current.averagePerformance, previous.averagePerformance)

  const widgets: WidgetItem[] = [
    {
      key: 'total-planned-exits',
      title: getTranslationFromI18nKeyAndLabel('total_planned_exits', 'Total Planned Exits'),
      value: current.totalCount,
      prefix: <TrendDownIcon className="gba:h-5 gba:w-5" style={{ color: 'var(--nw-color-danger-500)' }} />,
      color: 'var(--nw-color-danger-500)',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('investments_planned_for_exit', 'Investments planned for exit'),
      trend: { ...countTrend, positive: !countTrend.positive, description: VS_LAST_QUARTER }
    },
    {
      key: 'total-investment-value',
      title: getTranslationFromI18nKeyAndLabel('total_investment_value', 'Total Investment Value'),
      value: formatCurrencyCompact(current.totalInvestmentValue, currencyCode, undefined, 1, true),
      valueIsString: true,
      prefix: <TrendUpIcon className="gba:h-5 gba:w-5" style={{ color: 'var(--nw-color-primary-500)' }} />,
      color: 'var(--nw-color-primary-500)',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('total_invested_capital', 'Total invested capital'),
      trend: { ...investmentValueTrend, description: VS_LAST_QUARTER }
    },
    {
      key: 'total-market-value',
      title: getTranslationFromI18nKeyAndLabel('total_market_value', 'Total Market Value'),
      value: formatCurrencyCompact(current.totalMarketValue, currencyCode, undefined, 1, true),
      valueIsString: true,
      prefix: <CurrencyDollarIcon className="gba:h-5 gba:w-5" style={{ color: 'var(--nw-color-success-500)' }} />,
      color: 'var(--nw-color-success-500)',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel('current_market_value', 'Current market value'),
      trend: { ...marketValueTrend, description: VS_LAST_QUARTER }
    },
    {
      key: 'avg-performance',
      title: getTranslationFromI18nKeyAndLabel('avg_performance', 'Average Performance'),
      value: current.averagePerformance,
      suffix: '%',
      precision: 1,
      prefix: <ChartBarIcon className="gba:h-5 gba:w-5" style={{ color: 'var(--nw-color-secondary-500)' }} />,
      color: 'var(--nw-color-secondary-500)',
      span: WIDGET_SPAN,
      description: getTranslationFromI18nKeyAndLabel(
        'average_investment_performance',
        'Average investment performance'
      ),
      trend: { ...performanceTrend, description: VS_LAST_QUARTER }
    }
  ]

  return (
    <DivestmentStatisticsPanel
      widgets={widgets}
      isLoading={isLoading}
      error={error ?? null}
      onRetry={onRetry ?? (() => {})}
      dataTestId="planned-exits-metrics"
    />
  )
}

export default PlannedExitsMetrics
