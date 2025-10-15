import React, { useState, useMemo, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGetExpenseDashboard } from '../../../hooks/useGetExpenseDashboard'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { ArrowUpOutlined, GlobalOutlined } from '@ant-design/icons'
import { PiCurrencyCircleDollar } from 'react-icons/pi'
import { SpendingOverview, ActionFeed, QuickActionCards, PersonalExpenseFilterBar } from './components'
// import { formatNumberFunction } from '@/common/utils/windowUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../utils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { PERIOD_TYPE } from '../../../constants/periodTypes'

const ExpenseDashboardTab: React.FC<BusinessAppContextProps> = props => {
  const [filters, setFilters] = useState<{ currency?: string; period: 'monthly' | 'quarterly' | 'yearly' }>({
    currency: undefined,
    period: 'quarterly'
  })
  const { stats, isLoading, error } = useGetExpenseDashboard(props, filters)
  const [hoveredWidgetKey, setHoveredWidgetKey] = useState<string | null>(null)
  const chartView = useMemo(() => {
    switch (filters.period) {
      case PERIOD_TYPE.YEARLY:
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.yearly', 'Yearly')
      case PERIOD_TYPE.QUARTERLY:
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.quarterly', 'Quarterly')
      default:
        return getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.monthly', 'Monthly')
    }
  }, [filters.period])

  const extractCurrencyCode = (currencyRef?: string): string => {
    return currencyRef?.split(':').pop() || 'EUR'
  }
  const selectedCurrencyCode = extractCurrencyCode(filters.currency)

  // Handle widget clicks (navigate to items tab with CREATED filter and hide stats)
  const handleWidgetClick = useCallback((widgetKey: string) => {
    if (widgetKey === 'unallocated-expenses') {
      try {
        // Persist filter for items tab to pick up
        sessionStorage.setItem('expenseItemsFilter', 'created')
      } catch (err) {
        console.warn('Failed to persist expenseItemsFilter to sessionStorage', err)
      }
      const url = buildPlatformUrl('/platform/fin/expenses/unallocated-expense-items', {
        status: 'CREATED'
      })

      navigateTo(url)
      return
    }
  }, [])

  // Helper function to calculate percentage change
  const calculatePercentChange = (current: number, previous: number): number => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  // Create dashboard statistics widgets using the same pattern as other tabs
  const dashboardWidgets = useMemo((): WidgetItem[] => {
    const periodCurrent =
      filters.period === 'yearly'
        ? stats?.currentYearExpenses?.total || 0
        : filters.period === 'quarterly'
          ? stats?.currentQuarterExpenses?.total || 0
          : stats?.currentMonthExpenses?.total || 0
    const periodPrevious =
      filters.period === 'yearly'
        ? stats?.previousYearExpenses?.total || 0
        : filters.period === 'quarterly'
          ? stats?.previousQuarterExpenses?.total || 0
          : stats?.previousMonthExpenses?.total || 0
    const currentTotal = periodCurrent
    const previousTotal = periodPrevious
    const percentChange = calculatePercentChange(currentTotal, previousTotal)
    const isPositiveChange = percentChange >= 0

    return [
      {
        key: 'current-month-expenses',
        title:
          filters.period === 'yearly'
            ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.this_year_expenses', 'Current Year Expenses')
            : filters.period === 'quarterly'
              ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.this_quarter_expenses', 'Current Quarter Expenses')
              : getTranslationFromI18nKeyAndLabel(
                  'lowcoder:personal_expenses.current_month_expenses',
                  'Current Month Expenses'
                ),
        value: formatCurrencyDisplay(currentTotal, selectedCurrencyCode),
        prefix: <PiCurrencyCircleDollar />,
        color: isPositiveChange ? '#cf1322' : '#3f8600',
        valueIsString: true,
        description: `${stats?.currentMonthExpenses?.count || 0} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_list.flows_button.expense_requests', 'Expense Requests')}`,
        trend: {
          value: `${Math.abs(percentChange).toFixed(1)}%`,
          positive: isPositiveChange, // Inverted because lower expenses are better
          description: `${isPositiveChange ? getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.increase', 'increase') : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.decrease', 'decrease')} ${filters.period === 'yearly' ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.from_last_year', 'from last year') : filters.period === 'quarterly' ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.from_last_quarter', 'from last quarter') : getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')}`
        }
      },
      {
        key: 'pending-payouts',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.pending_payouts', 'Pending Payouts'),
        value: formatCurrencyDisplay(stats?.pendingPayouts || 0, selectedCurrencyCode),
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
        onClick: () => handleWidgetClick('unallocated-expenses')
      }
    ]
  }, [stats])

  // Declaratively toggle pointer when hovering the Unallocated Expenses card
  const handleMouseOver = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const cardEl = target.closest('[data-widget-key]') as HTMLElement | null
    const key = cardEl?.getAttribute('data-widget-key') || null
    setHoveredWidgetKey(key)
  }
  const handleMouseLeave = () => setHoveredWidgetKey(null)


  return (
    <div className="gba:space-y-6 gba:w-full" data-testid="expense-dashboard-content">
      <PersonalExpenseFilterBar
        accessToken={props.accessToken}
        userInfo={props.userInfo}
        onFiltersChange={(f: { currency?: string; period: 'monthly' | 'quarterly' | 'yearly' }) => setFilters(f)}
        currentFilters={filters}
        data-testid="personal-expense-dashboard-filter-bar"
      />
      <div
        data-testid="dashboard-statistics-section"
        className={hoveredWidgetKey === 'unallocated-expenses' ? 'gba:cursor-pointer' : ''}
        onMouseOver={handleMouseOver}
        onMouseLeave={handleMouseLeave}
      >
        <WidgetGroup
          widgets={dashboardWidgets}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          onWidgetClick={handleWidgetClick}
          skeletonCount={4}
          emptyText={getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.no_statistics_available',
            'No statistics available.'
          )}
          data-testid="dashboard-statistics"
        />
      </div>

      <div data-testid="quick-action-cards-section">
        <QuickActionCards {...props} />
      </div>

      <div data-testid="spending-overview-section">
        <SpendingOverview
          stats={stats ?? undefined}
          isLoading={isLoading}
          error={error ? new Error(error) : null}
          chartView={chartView}
          currencyCode={selectedCurrencyCode}
        />
      </div>

      <div data-testid="action-feed-section">
        <ActionFeed stats={stats ?? undefined} isLoading={isLoading} error={error ? new Error(error) : null} />
      </div>
    </div>
  )
}

export default ExpenseDashboardTab
