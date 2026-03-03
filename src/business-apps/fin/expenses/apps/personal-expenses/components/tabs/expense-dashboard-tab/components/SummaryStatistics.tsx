import React from 'react'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { ArrowUpOutlined, GlobalOutlined } from '@ant-design/icons'
import { CurrencyCircleDollarIcon } from '@phosphor-icons/react'
import { calculatePercentChange } from '../utils/formatters'
import { DashboardStats } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../utils'

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
  const [hoveredWidgetKey, setHoveredWidgetKey] = React.useState<string | null>(null)

  // Provide simple defaults so widgets always show numeric values (0) when stats are missing
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

  // No-trend widgets: value, empty row, footer (personal expenses only; other WidgetGroup usages unchanged)
  const widgets: WidgetItem[] = [
    {
      key: 'current-month-expenses',
      title:
        period === 'yearly'
          ? getTranslationFromI18nKeyAndLabel(
              'lowcoder:personal_expenses.current_year_expenses',
              'Current Year Expenses'
            )
          : period === 'quarterly'
            ? getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.current_quarter_expenses',
                'Current Quarter Expenses'
              )
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.current_month_expenses',
                'Current Month Expenses'
              ),
      value: formatCurrencyDisplay(currentTotal, currencyCode),
      prefix: <CurrencyCircleDollarIcon />,
      color: isPositiveChange ? '#cf1322' : '#3f8600',
      valueIsString: true,
      description: `${stats.currentMonthExpenses?.count || 0} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_requests', 'Expense Requests')}`,
      trend: {
        value: `${Math.abs(percentChange).toFixed(1)}%`,
        positive: isPositiveChange,
        description: `${isPositiveChange ? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.increase', 'increase') : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.decrease', 'decrease')} ${
          period === 'yearly'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_year', 'from last year')
            : period === 'quarterly'
              ? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_quarter', 'from last quarter')
              : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
        }`
      }
    },
    {
      key: 'pending-payouts',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.pending_payouts', 'Pending Payouts'),
      value: formatCurrencyDisplay(stats.pendingPayouts || 0, currencyCode),
      prefix: <CurrencyCircleDollarIcon />,
      color: '#1890ff',
      valueIsString: true,
      footer: [
        statistics?.bookedAndPendingCount ?? 0,
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.awaiting_payment', 'Awaiting payment')
      ].join(' '),
      trend: { hideBadge: true, value: '', description: '\u200B' }
    },
    {
      key: 'upcoming-trips',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.upcoming_trips', 'Upcoming Trips'),
      value: stats.upcomingTrips || 0,
      prefix: <GlobalOutlined />,
      color: '#722ed1',
      footer: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.planned_business_trips',
        'Planned business trips'
      ),
      trend: { hideBadge: true, value: '', description: '\u200B' }
    },
    {
      key: 'unallocated-expenses',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.unallocated_expenses',
        'Unallocated Expenses'
      ),
      value: stats.pendingItems || 0,
      prefix: <ArrowUpOutlined />,
      color: '#8c8c8c',
      valueIsString: true,
      footer: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.unlinked_items',
        'Expense items not linked to a request'
      ),
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
        // Show skeletons while loading; after load, always show cards (with 0s when no data)
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        onWidgetClick={onWidgetClick}
        skeletonCount={4}
        useWidgetStructureForLoading={true}
        emptyText={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.no_statistics_available',
          'No statistics available.'
        )}
        data-testid="dashboard-statistics"
      />
    </div>
  )
}

export default SummaryStatistics
