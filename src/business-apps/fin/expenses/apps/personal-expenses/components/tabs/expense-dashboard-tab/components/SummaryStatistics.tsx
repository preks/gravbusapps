import React from 'react'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import { ArrowUpOutlined, GlobalOutlined } from '@ant-design/icons'
import { PiCurrencyCircleDollar } from 'react-icons/pi'
import { calculatePercentChange } from '../utils/formatters'
import { DashboardStats } from '../types'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../utils'

interface SummaryStatisticsProps {
  stats: DashboardStats | undefined
  isLoading: boolean
  error: Error | null
  period: 'monthly' | 'quarterly' | 'yearly'
  currencyCode: string
  onWidgetClick?: (key: string) => void
}

export const SummaryStatistics: React.FC<SummaryStatisticsProps> = ({
  stats,
  isLoading,
  error,
  period,
  currencyCode,
  onWidgetClick
}) => {
  const [hoveredWidgetKey, setHoveredWidgetKey] = React.useState<string | null>(null)

  const periodCurrent =
    period === 'yearly'
      ? stats?.currentYearExpenses?.total || 0
      : period === 'quarterly'
        ? stats?.currentQuarterExpenses?.total || 0
        : stats?.currentMonthExpenses?.total || 0
  const periodPrevious =
    period === 'yearly'
      ? stats?.previousYearExpenses?.total || 0
      : period === 'quarterly'
        ? stats?.previousQuarterExpenses?.total || 0
        : stats?.previousMonthExpenses?.total || 0

  const currentTotal = periodCurrent
  const previousTotal = periodPrevious
  const percentChange = calculatePercentChange(currentTotal, previousTotal)
  const isPositiveChange = percentChange >= 0

  const widgets: WidgetItem[] = [
    {
      key: 'current-month-expenses',
      title:
        period === 'yearly'
          ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.this_year_expenses', 'Current Year Expenses')
          : period === 'quarterly'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.this_quarter_expenses', 'Current Quarter Expenses')
            : getTranslationFromI18nKeyAndLabel(
                'lowcoder:personal_expenses.current_month_expenses',
                'Current Month Expenses'
              ),
      value: formatCurrencyDisplay(currentTotal, currencyCode),
      prefix: <PiCurrencyCircleDollar />,
      color: isPositiveChange ? '#cf1322' : '#3f8600',
      valueIsString: true,
      description: `${stats?.currentMonthExpenses?.count || 0} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_requests', 'Expense Requests')}`,
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
      value: formatCurrencyDisplay(stats?.pendingPayouts || 0, currencyCode),
      prefix: <PiCurrencyCircleDollar />,
      color: '#1890ff',
      valueIsString: true,
      description: `${stats?.bookedAndPendingCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.awaiting_payment', 'Awaiting payment')}`
    },
    {
      key: 'upcoming-trips',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.upcoming_trips', 'Upcoming Trips'),
      value: stats?.upcomingTrips || 0,
      prefix: <GlobalOutlined />,
      color: '#722ed1',
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.planned_business_trips',
        'Planned business trips'
      )
    },
    {
      key: 'unallocated-expenses',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.unallocated_expenses',
        'Unallocated Expenses'
      ),
      value: stats?.pendingItems || 0,
      prefix: <ArrowUpOutlined />,
      color: '#8c8c8c',
      valueIsString: true,
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.unlinked_items',
        'Expense items not linked to a request'
      ),
      onClick: () => onWidgetClick?.('unallocated-expenses')
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
        onWidgetClick={onWidgetClick}
        skeletonCount={4}
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
