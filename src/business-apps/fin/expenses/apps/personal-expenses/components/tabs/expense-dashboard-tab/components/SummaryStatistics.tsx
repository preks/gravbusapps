import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { ArrowUpIcon, GlobeIcon, CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { calculatePercentChange } from '../utils/formatters'
import { DashboardStats } from '../types'
import { formatCurrencyDisplay } from '../../../../utils'
import personalTranslations from '../../../../_i18n'

function getDashboardStatTrendDescription(
  t: (key: string) => string,
  isPositiveChange: boolean,
  period: 'monthly' | 'quarterly' | 'yearly'
): string {
  const direction = isPositiveChange ? 'increase' : 'decrease'
  if (period === 'yearly') {
    return t(`dashboard-stat-trend-${direction}-vs-last-year`)
  }
  if (period === 'quarterly') {
    return t(`dashboard-stat-trend-${direction}-vs-last-quarter`)
  }
  return t(`dashboard-stat-trend-${direction}-vs-last-month`)
}

interface SummaryStatisticsProps {
  statistics: DashboardStats | undefined
  isLoading: boolean
  error: Error | null
  period: 'monthly' | 'quarterly' | 'yearly'
  currencyCode: string
  onRetry?: () => void
  onWidgetClick?: (key: string) => void
}

export const SummaryStatistics: React.FC<SummaryStatisticsProps> = ({
  statistics,
  isLoading,
  error,
  period,
  currencyCode,
  onRetry,
  onWidgetClick
}) => {
  const { t } = useTranslation(personalTranslations)
  const [hoveredWidgetKey, setHoveredWidgetKey] = React.useState<string | null>(null)

  const stats =
    statistics ||
    ({
      currentMonthExpenses: { total: 0, count: 0 },
      previousMonthExpenses: { total: 0, count: 0 },
      currentQuarterExpenses: { total: 0, count: 0 },
      previousQuarterExpenses: { total: 0, count: 0 },
      currentYearExpenses: { total: 0, count: 0 },
      previousYearExpenses: { total: 0, count: 0 },
      pendingPayouts: 0,
      bookedAndPendingCount: 0,
      upcomingTrips: 0,
      pendingItems: 0
    } as DashboardStats)

  const periodCurrent =
    period === 'yearly'
      ? stats.currentYearExpenses?.total || 0
      : period === 'quarterly'
        ? stats.currentQuarterExpenses?.total || 0
        : stats.currentMonthExpenses?.total || 0
  const periodPrevious =
    period === 'yearly'
      ? stats.previousYearExpenses?.total || 0
      : period === 'quarterly'
        ? stats.previousQuarterExpenses?.total || 0
        : stats.previousMonthExpenses?.total || 0

  const currentTotal = periodCurrent
  const previousTotal = periodPrevious
  const percentChange = calculatePercentChange(currentTotal, previousTotal)
  const isPositiveChange = percentChange >= 0

  const widgets: WidgetItem[] = [
    {
      key: 'current-month-expenses',
      title:
        period === 'yearly'
          ? t('dashboard-stat-current-year-expenses')
          : period === 'quarterly'
            ? t('dashboard-stat-current-quarter-expenses')
            : t('dashboard-stat-current-month-expenses'),
      value: formatCurrencyDisplay(currentTotal, currencyCode),
      prefix: <CurrencyCircleDollarIcon />,
      color: isPositiveChange ? '#cf1322' : '#3f8600',
      valueIsString: true,
      description: `${stats.currentMonthExpenses?.count || 0} ${t('dashboard-stat-expense-requests-suffix')}`,
      trend: {
        value: `${Math.abs(percentChange).toFixed(1)}%`,
        positive: isPositiveChange,
        description: getDashboardStatTrendDescription(t, isPositiveChange, period)
      }
    },
    {
      key: 'pending-payouts',
      title: t('dashboard-stat-pending-payouts'),
      value: formatCurrencyDisplay(stats.pendingPayouts || 0, currencyCode),
      prefix: <CurrencyCircleDollarIcon />,
      color: '#1890ff',
      valueIsString: true,
      footer: [statistics?.bookedAndPendingCount ?? 0, t('dashboard-stat-awaiting-payment')].join(' '),
      trend: { hideBadge: true, value: '', description: '\u200B' }
    },
    {
      key: 'upcoming-trips',
      title: t('dashboard-stat-upcoming-trips'),
      value: stats.upcomingTrips || 0,
      prefix: <GlobeIcon size={16} />,
      color: '#722ed1',
      footer: t('dashboard-stat-planned-business-trips'),
      trend: { hideBadge: true, value: '', description: '\u200B' }
    },
    {
      key: 'unallocated-expenses',
      title: t('dashboard-stat-unallocated-expenses'),
      value: stats.pendingItems || 0,
      prefix: <ArrowUpIcon size={16} />,
      color: '#8c8c8c',
      valueIsString: true,
      footer: t('dashboard-stat-unlinked-items'),
      onClick: () => onWidgetClick?.('unallocated-expenses'),
      trend: { hideBadge: true, value: '', description: '\u200B' }
    }
  ]

  return (
    <div
      data-testid="dashboard-statistics-section"
      className={hoveredWidgetKey === 'unallocated-expenses' ? 'gba:cursor-pointer' : ''}
      onMouseOver={e => {
        const target = e.target as HTMLElement
        const cardEl = target.closest('[data-widget-key]') as HTMLElement | null
        const key = cardEl?.getAttribute('data-widget-key') || null
        setHoveredWidgetKey(key)
      }}
      onMouseLeave={() => setHoveredWidgetKey(null)}
    >
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onWidgetClick={onWidgetClick}
        skeletonCount={4}
        useWidgetStructureForLoading={true}
        emptyText={t('dashboard-stat-empty')}
        data-testid="dashboard-statistics"
      />
    </div>
  )
}

export default SummaryStatistics
