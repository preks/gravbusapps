/**
 * Dashboard Tab Component for Expense Management Overview
 * Displays KPIs and statistics for expense management by composing various dashboard cards.
 */

/**
 * ExpenseDashboardTab component with integrated filter bar.
 * Displays KPIs and statistics for expense management by composing various dashboard cards.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { Alert, Spinner, SectionKpiCards, KpiCardData, Card, CardContent, IconAvatar } from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDashboardStats } from '../../../hooks/useDashboardStats'
import MonthlyExpenseTrendsCard from '../../cards/MonthlyExpenseTrendsCard'
import { ExpenseFilterBar, FilterOptions } from '../../filter-bar'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { formatCurrency } from '../../../utils/currencyUtils'
import { useFilterData } from '../../../hooks/useFilterData'
import { PiChartLineUp, PiFileText } from 'react-icons/pi'

interface ExpenseDashboardTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
  moduleColor?: string
  isActive?: boolean // ⚡ PERFORMANCE: Only fetch data when tab is active
  onNavigateToReports?: () => void
  onNavigateToAnalytics?: () => void
}

const ExpenseDashboardTab: React.FC<ExpenseDashboardTabProps> = props => {
  // Keep accessToken as-is (may be undefined on initial mount before auth completes)
  // Hooks have guards to prevent requests when accessToken is invalid
  const { accessToken, prefixDataTestId = 'expense-dashboard-tab', moduleColor, isActive = true } = props

  // Fetch filter data (shared with ExpenseFilterBar to prevent duplicate queries)
  const filterData = useFilterData({ accessToken })
  const { mostUsedCurrency } = filterData

  const [currentFilters, setCurrentFilters] = useState<FilterOptions>({
    department: '',
    currency: 'Currency:v1:EUR', // Will be updated by useEffect when mostUsedCurrency loads
    period: 'yearly'
  })

  const [hasUserSelectedCurrency, setHasUserSelectedCurrency] = useState(false)
  const [hasLoadedStatsOnce, setHasLoadedStatsOnce] = useState(false)

  // Update currency when mostUsedCurrency is loaded (only if user hasn't manually selected one yet)
  useEffect(() => {
    if (mostUsedCurrency && !hasUserSelectedCurrency) {
      setCurrentFilters(prev => ({
        ...prev,
        currency: mostUsedCurrency
      }))
    }
  }, [mostUsedCurrency, hasUserSelectedCurrency])

  // ⚡ PERFORMANCE: Only fetch stats when tab is active
  const { stats, loading, error } = useDashboardStats({
    accessToken,
    filters: currentFilters,
    isActive
  })

  const getTranslatedQuarter = (quarterNumber: number): string => {
    return getTranslationFromI18nKeyAndLabel(`lowcoder:cards.quarter_${quarterNumber}`, `Q${quarterNumber}`)
  }

  const getTranslatedMonth = (monthIndex: number): string => {
    const monthNames = [
      'lowcoder:absence_report.employee_table.january',
      'lowcoder:absence_report.employee_table.february',
      'lowcoder:absence_report.employee_table.march',
      'lowcoder:absence_report.employee_table.april',
      'lowcoder:absence_report.employee_table.may',
      'lowcoder:absence_report.employee_table.june',
      'lowcoder:absence_report.employee_table.july',
      'lowcoder:absence_report.employee_table.august',
      'lowcoder:absence_report.employee_table.september',
      'lowcoder:absence_report.employee_table.october',
      'lowcoder:absence_report.employee_table.november',
      'lowcoder:absence_report.employee_table.december'
    ]

    const fallbackNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December'
    ]

    return getTranslationFromI18nKeyAndLabel(monthNames[monthIndex], fallbackNames[monthIndex])
  }

  const getCurrentPeriodName = (): string => {
    const date = new Date()
    const yearText = date.getFullYear().toString()
    switch (currentFilters.period) {
      case 'yearly':
        return yearText
      case 'quarterly': {
        const quarter = Math.floor(date.getMonth() / 3) + 1
        return `${getTranslatedQuarter(quarter)} ${date.getFullYear()}`
      }
      default:
        return getTranslatedMonth(date.getMonth())
    }
  }

  const getSameperiodLastYearName = (): string => {
    const date = new Date()
    const previousYear = date.getFullYear() - 1
    switch (currentFilters.period) {
      case 'yearly':
        return previousYear.toString()
      case 'quarterly': {
        const currentQuarter = Math.floor(date.getMonth() / 3) + 1
        return `${getTranslatedQuarter(currentQuarter)} ${previousYear}`
      }
      default:
        return `${getTranslatedMonth(date.getMonth())} ${previousYear}`
    }
  }

  const getPreviousPeriodName = (): string => {
    const date = new Date()
    switch (currentFilters.period) {
      case 'yearly':
        return (date.getFullYear() - 1).toString()
      case 'quarterly': {
        const currentQuarter = Math.floor(date.getMonth() / 3)
        let previousQuarter = currentQuarter - 1
        let previousYear = date.getFullYear()
        if (previousQuarter < 0) {
          previousQuarter = 3
          previousYear = previousYear - 1
        }
        return `${getTranslatedQuarter(previousQuarter + 1)} ${previousYear}`
      }
      default: {
        const previousMonth = new Date(date.getFullYear(), date.getMonth() - 1, 1)
        return getTranslatedMonth(previousMonth.getMonth())
      }
    }
  }

  const extractCurrencyCode = (currencyRef: string): string => {
    return currencyRef.split(':').pop() || 'EUR'
  }

  const selectedCurrencyCode = extractCurrencyCode(currentFilters.currency || 'Currency:v1:EUR')

  // Helper: Get title for total company spend (reduces cognitive complexity)
  const getTotalCompanySpendTitle = useCallback((period: string | undefined, currencyCode: string) => {
    switch (period) {
      case 'yearly':
        return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.total_company_spend_ytd', 'Total Company Spend YTD')} (${currencyCode})`
      case 'quarterly':
        return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.total_company_spend_qtd', 'Total Company Spend QTD')} (${currencyCode})`
      default:
        return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.total_company_spend_mtd', 'Total Company Spend MTD')} (${currencyCode})`
    }
  }, [])

  // Helper: Get footer for total company spend (reduces cognitive complexity)
  const getTotalCompanySpendFooter = useCallback(
    (
      currentPeriodName: string,
      previousPeriodName: string,
      currentTotal: number,
      currentCount: number,
      previousTotal: number,
      previousCount: number,
      currencyCode: string
    ) => {
      const expensesLabel = getTranslationFromI18nKeyAndLabel('lowcoder:cards.expenses', 'expenses')
      return `${currentPeriodName}: ${formatCurrency(currentTotal, currencyCode)} (${currentCount} ${expensesLabel})\n${previousPeriodName}: ${formatCurrency(previousTotal, currencyCode)} (${previousCount} ${expensesLabel})`
    },
    []
  )

  // Helper: Get description for total company spend (reduces cognitive complexity)
  const getTotalCompanySpendDescription = useCallback((period: string | undefined, isIncrease: boolean) => {
    switch (period) {
      case 'yearly':
        return isIncrease
          ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_ytd', 'Increase vs Last YTD')
          : getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_ytd', 'Decrease vs Last YTD')
      case 'quarterly':
        return isIncrease
          ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_qtd', 'Increase vs Last QTD')
          : getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_qtd', 'Decrease vs Last QTD')
      default:
        return isIncrease
          ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_mtd', 'Increase vs Last MTD')
          : getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_mtd', 'Decrease vs Last MTD')
    }
  }, [])

  // Helper to build Total Company Spend card (reduces complexity of kpiCards)
  const buildTotalCompanySpendCard = useCallback((): KpiCardData => {
    const currentPeriodName = getCurrentPeriodName()
    const previousPeriodName = getSameperiodLastYearName()

    return {
      id: 'total-company-spend',
      title: getTotalCompanySpendTitle(currentFilters.period, selectedCurrencyCode),
      value: formatCurrency(stats.totalCompanySpend.currentPeriodTotal, selectedCurrencyCode),
      footer: getTotalCompanySpendFooter(
        currentPeriodName,
        previousPeriodName,
        stats.totalCompanySpend.currentPeriodTotal,
        stats.totalCompanySpend.currentPeriodCount,
        stats.totalCompanySpend.previousPeriodTotal,
        stats.totalCompanySpend.previousPeriodCount,
        selectedCurrencyCode
      ),
      trend:
        stats.totalCompanySpend.percentChange === null
          ? undefined
          : {
              value: Math.abs(stats.totalCompanySpend.percentChange).toFixed(1) + '%',
              description: getTotalCompanySpendDescription(currentFilters.period, stats.totalCompanySpend.isIncrease),
              trendIcon: stats.totalCompanySpend.isIncrease ? 'up' : 'down',
              badgeVariant: stats.totalCompanySpend.isIncrease ? 'destructive' : 'success'
            }
    }
  }, [
    getCurrentPeriodName,
    getSameperiodLastYearName,
    getTotalCompanySpendTitle,
    getTotalCompanySpendFooter,
    getTotalCompanySpendDescription,
    currentFilters.period,
    selectedCurrencyCode,
    stats.totalCompanySpend
  ])

  // Helper to build Actual vs Planned card (reduces complexity of kpiCards)
  const buildActualVsPlannedCard = useCallback((): KpiCardData => {
    const actualVsPlannedData = stats.actualVsPlanned
    const actualAmount = actualVsPlannedData.actualExpenses.totalAmount
    const plannedAmount = actualVsPlannedData.plannedExpenses.totalAmount
    const actualCount = actualVsPlannedData.actualExpenses.count
    const plannedCount = actualVsPlannedData.plannedExpenses.count

    const actualVsPlannedPercentage =
      plannedAmount > 0 ? Math.abs(((actualAmount - plannedAmount) / plannedAmount) * 100) : null

    const getActualVsPlannedTitle = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.actual_vs_planned', 'Actual vs Planned')} ${new Date().getFullYear()} (${selectedCurrencyCode})`
        case 'quarterly': {
          const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
          return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.actual_vs_planned', 'Actual vs Planned')} ${getTranslatedQuarter(currentQuarter)} ${new Date().getFullYear()} (${selectedCurrencyCode})`
        }
        default: {
          const currentMonth = new Date().toLocaleString(getCurrentActiveUserLocale(), { month: 'long' })
          return `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.actual_vs_planned', 'Actual vs Planned')} ${currentMonth} ${new Date().getFullYear()} (${selectedCurrencyCode})`
        }
      }
    }

    return {
      id: 'actual-vs-planned',
      title: getActualVsPlannedTitle(),
      value: actualVsPlannedPercentage ?? 'N/A',
      suffix: actualVsPlannedPercentage === null ? undefined : '%',
      decimalPlaces: actualVsPlannedPercentage === null ? undefined : 1,
      footer: `${getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.planned', 'Planned')}: ${formatCurrency(plannedAmount, selectedCurrencyCode)} (${plannedCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:employee_landing_page.plans', 'plans')})\n${getTranslationFromI18nKeyAndLabel('lowcoder:new_goal.achieved', 'Actual')}: ${formatCurrency(actualAmount, selectedCurrencyCode)} (${actualCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:cards.expenses', 'expenses')})`,
      trend:
        actualVsPlannedPercentage === null
          ? undefined
          : {
              value: actualVsPlannedPercentage.toFixed(1) + '%',
              description:
                actualAmount <= plannedAmount
                  ? getTranslationFromI18nKeyAndLabel('lowcoder:cards.remaining_budget', 'Remaining Budget')
                  : getTranslationFromI18nKeyAndLabel('lowcoder:cards.over_budget', 'Over Budget'),
              trendIcon: actualAmount > plannedAmount ? 'up' : 'down',
              badgeVariant: actualAmount > plannedAmount ? 'destructive' : 'success'
            }
    }
  }, [currentFilters.period, selectedCurrencyCode, stats.actualVsPlanned])

  // Helper to build Monthly Spend Comparison card (reduces complexity of kpiCards)
  const buildMonthlySpendComparisonCard = useCallback((): KpiCardData => {
    const monthlyComparison = stats.monthlySpendComparison

    const comparisonTitleByPeriod: Record<'monthly' | 'quarterly' | 'yearly', string> = {
      yearly: `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.yearly_spend_comparison', 'Yearly Spend Comparison')} (${selectedCurrencyCode})`,
      quarterly: `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.quarterly_spend_comparison', 'Quarterly Spend Comparison')} (${selectedCurrencyCode})`,
      monthly: `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.monthly_spend_comparison', 'Monthly Spend Comparison')} (${selectedCurrencyCode})`
    }

    const getComparisonDescription = () => {
      switch (currentFilters.period) {
        case 'yearly':
          if (monthlyComparison.isIncrease) {
            return getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_year', 'Increase vs Last Year')
          }
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_year', 'Decrease vs Last Year')
        case 'quarterly':
          if (monthlyComparison.isIncrease) {
            return getTranslationFromI18nKeyAndLabel(
              'lowcoder:cards.increase_vs_last_quarter',
              'Increase vs Last Quarter'
            )
          }
          return getTranslationFromI18nKeyAndLabel(
            'lowcoder:cards.decrease_vs_last_quarter',
            'Decrease vs Last Quarter'
          )
        default:
          if (monthlyComparison.isIncrease) {
            return getTranslationFromI18nKeyAndLabel('lowcoder:cards.increase_vs_last_month', 'Increase vs Last Month')
          }
          return getTranslationFromI18nKeyAndLabel('lowcoder:cards.decrease_vs_last_month', 'Decrease vs Last Month')
      }
    }

    return {
      id: 'monthly-spend-comparison',
      title: comparisonTitleByPeriod[currentFilters.period || 'monthly'],
      value:
        monthlyComparison.percentChange === null ? 'N/A' : Math.abs(monthlyComparison.percentChange).toFixed(1) + ' %',
      footer: `${getCurrentPeriodName()}: ${formatCurrency(monthlyComparison.currentMonthTotal, selectedCurrencyCode)} (${monthlyComparison.currentMonthCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:cards.expenses', 'expenses')})\n${getPreviousPeriodName()}: ${formatCurrency(monthlyComparison.previousMonthTotal, selectedCurrencyCode)} (${monthlyComparison.previousMonthCount} ${getTranslationFromI18nKeyAndLabel('lowcoder:cards.expenses', 'expenses')})`,
      trend:
        monthlyComparison.percentChange === null
          ? undefined
          : {
              value: Math.abs(monthlyComparison.percentChange).toFixed(1) + '%',
              description: getComparisonDescription(),
              trendIcon: monthlyComparison.isIncrease ? 'up' : 'down',
              badgeVariant: monthlyComparison.isIncrease ? 'destructive' : 'success'
            }
    }
  }, [
    getCurrentPeriodName,
    getPreviousPeriodName,
    currentFilters.period,
    selectedCurrencyCode,
    stats.monthlySpendComparison
  ])

  // Helper: Get advance payment footer text (reduces cognitive complexity)
  const getPeriodFooterText = (labels: {
    yearly: { key: string; fallback: string }
    quarterly: { key: string; fallback: string }
    monthly: { key: string; fallback: string }
  }) => {
    if (currentFilters.period === 'yearly') {
      return getTranslationFromI18nKeyAndLabel(labels.yearly.key, labels.yearly.fallback)
    }
    if (currentFilters.period === 'quarterly') {
      return getTranslationFromI18nKeyAndLabel(labels.quarterly.key, labels.quarterly.fallback)
    }
    return getTranslationFromI18nKeyAndLabel(labels.monthly.key, labels.monthly.fallback)
  }

  // Helper: Get advance payment footer text (reduces cognitive complexity)
  const getAdvancePaymentFooter = useCallback(() => {
    return getPeriodFooterText({
      yearly: {
        key: 'lowcoder:cards.approved_waiting_to_pay_ytd',
        fallback: 'Approved - Waiting to Pay This Year'
      },
      quarterly: {
        key: 'lowcoder:cards.approved_waiting_to_pay_qtd',
        fallback: 'Approved - Waiting to Pay This Quarter'
      },
      monthly: {
        key: 'lowcoder:cards.approved_waiting_to_pay_mtd',
        fallback: 'Approved - Waiting to Pay This Month'
      }
    })
  }, [currentFilters.period])

  // Helper: Get average spend per trip footer text (reduces cognitive complexity)
  const getAvgSpendPerTripFooter = useCallback(() => {
    return getPeriodFooterText({
      yearly: {
        key: 'lowcoder:cards.average_spend_per_trip_footer_year',
        fallback: 'Based on completed trips this year'
      },
      quarterly: {
        key: 'lowcoder:cards.average_spend_per_trip_footer_quarter',
        fallback: 'Based on completed trips this quarter'
      },
      monthly: {
        key: 'lowcoder:cards.average_spend_per_trip_footer_month',
        fallback: 'Based on completed trips this month'
      }
    })
  }, [currentFilters.period])

  // Helper: Build Transfer Required card (reduces complexity of kpiCards)
  const buildTransferRequiredCard = useCallback(
    (): KpiCardData => ({
      id: 'transfer-required',
      title: `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.transfer_required', 'Transfer Required')} (${selectedCurrencyCode})`,
      value: formatCurrency(stats.transferRequired, selectedCurrencyCode),
      footer: `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.all_pending_transfers_in', 'All Pending Transfers In')} ${selectedCurrencyCode}`
    }),
    [selectedCurrencyCode, stats.transferRequired]
  )

  // Helper: Build Pending Requests card (reduces complexity of kpiCards)
  const buildPendingRequestsCard = useCallback(
    (): KpiCardData => ({
      id: 'pending-requests',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:cards.pending_requests', 'Pending Requests'),
      value: stats.pendingRequestsCount.toString(),
      footer: getTranslationFromI18nKeyAndLabel(
        'lowcoder:cards.all_requests_awaiting_approval',
        'All Requests Awaiting Approval'
      )
    }),
    [stats.pendingRequestsCount]
  )

  // Helper: Build Advance Payment card (reduces complexity of kpiCards)
  const buildAdvancePaymentCard = useCallback(
    (): KpiCardData => ({
      id: 'advance-payment',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:approve_expense_request.advance_payment', 'Advance Payment'),
      value: stats.advancePaymentsApproved.count.toString(),
      footer: getAdvancePaymentFooter()
    }),
    [stats.advancePaymentsApproved.count, getAdvancePaymentFooter]
  )

  // Helper: Build Average Spend Per Trip card (reduces complexity of kpiCards)
  const buildAvgSpendPerTripCard = useCallback(
    (): KpiCardData => ({
      id: 'avg-spend-per-trip',
      title: `${getTranslationFromI18nKeyAndLabel('lowcoder:cards.average_spend_per_trip', 'Average Spend Per Trip (Based on Completed Trips)')} (${selectedCurrencyCode})`,
      value: formatCurrency(stats.avgSpendPerTrip, selectedCurrencyCode),
      footer: getAvgSpendPerTripFooter()
    }),
    [selectedCurrencyCode, stats.avgSpendPerTrip, getAvgSpendPerTripFooter]
  )

  const kpiCards = useMemo(() => {
    const cards: KpiCardData[] = [
      buildTotalCompanySpendCard(),
      buildActualVsPlannedCard(),
      buildMonthlySpendComparisonCard(),
      buildTransferRequiredCard(),
      buildPendingRequestsCard(),
      buildAdvancePaymentCard(),
      buildAvgSpendPerTripCard()
    ]

    return cards
  }, [
    buildTotalCompanySpendCard,
    buildActualVsPlannedCard,
    buildMonthlySpendComparisonCard,
    buildTransferRequiredCard,
    buildPendingRequestsCard,
    buildAdvancePaymentCard,
    buildAvgSpendPerTripCard
  ])

  // Removed testing-only CSV export function (no longer used)

  // Handle filter changes and update dashboard stats immediately
  const handleFiltersChange = (newFilters: FilterOptions) => {
    // Mark that user has manually selected a currency (prevent auto-update)
    if (newFilters.currency !== currentFilters.currency) {
      setHasUserSelectedCurrency(true)
    }
    setCurrentFilters(newFilters)
  }

  useEffect(() => {
    if (!loading) {
      setHasLoadedStatsOnce(true)
    }
  }, [loading])

  const isRefreshing = loading && hasLoadedStatsOnce
  const quickActions = useMemo(
    () => [
      {
        key: 'analytics',
        icon: PiChartLineUp,
        iconColor: 'gba:text-success',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:backoffice_expenses.analytics.spending_analysis',
          'Spending Analysis'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:backoffice_expenses.analytics.spending_analysis_cta',
          'View spending trends and reports.'
        ),
        onClick: props.onNavigateToAnalytics
      },
      {
        key: 'reports',
        icon: PiFileText,
        iconColor: 'gba:text-accent',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:expense_request_list.modal_list_or_flow_button.absence_same_location_btn',
          'Expense Reports'
        ),
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:backoffice_expenses.generate_or_view_expense_reports',
          'Generate or view expense reports.'
        ),
        onClick: props.onNavigateToReports
      }
    ],
    [props.onNavigateToAnalytics, props.onNavigateToReports]
  )

  return (
    <div className="gba:space-y-6 gba:relative" data-testid={prefixDataTestId}>
      {isRefreshing && (
        <div
          className="gba:absolute gba:inset-0 gba:bg-background/50 gba:flex gba:items-center gba:justify-center gba:z-10"
          data-testid="expense-dashboard-refresh-overlay"
        >
          <Spinner size="lg" data-testid="expense-dashboard-spinner" />
        </div>
      )}
      {error && (
        <Alert variant="destructive" className="gba:mb-4" data-testid="expense-dashboard-error-inline">
          <div>
            <h4 className="gba:font-semibold">Error Loading Dashboard Data</h4>
            <p className="gba:text-sm gba:mt-1">{error.message || 'An error occurred while loading dashboard data'}</p>
          </div>
        </Alert>
      )}
      {/* Filter Bar - only render when accessToken is valid */}
      {accessToken && accessToken.length > 100 && (
        <ExpenseFilterBar
          accessToken={accessToken}
          onFiltersChange={handleFiltersChange}
          currentFilters={currentFilters}
          filterData={filterData}
          data-testid="expense-dashboard-filter-bar"
        />
      )}

      {/* KPI Cards Section */}
      <div data-testid={`${prefixDataTestId}-kpi-section`}>
        <SectionKpiCards
          cards={kpiCards}
          className="gba:[&_[data-slot=card-footer]_div]:whitespace-pre-line"
          data-testid={`${prefixDataTestId}-kpi-cards`}
        />
        {/* CSV export toolbar removed */}
      </div>

      <div className="gba:space-y-3" data-testid="backoffice-dashboard-quick-actions">
        <h3 className="gba:text-lg gba:font-semibold">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:team_expenses_page.dashboard_tab.quick_actions',
            'Quick Actions'
          )}
        </h3>
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {quickActions.map(action => (
            <Card
              key={action.key}
              className="gba:cursor-pointer gba:transition-colors"
              onClick={action.onClick}
              data-testid={`backoffice-quick-action-${action.key}`}
            >
              <CardContent className="gba:p-4">
                <div className="gba:flex gba:items-center gba:mb-2">
                  <IconAvatar
                    icon={action.icon as any}
                    className={`gba:text-xl ${action.iconColor} gba:mr-2`}
                    variant="default"
                    size="md"
                  />
                  <h4 className="gba:text-sm gba:font-semibold">{action.title}</h4>
                </div>
                <p className="gba:text-sm gba:text-muted-foreground">{action.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Monthly Expense Trends Chart */}
      <div data-testid={`${prefixDataTestId}-chart-section`}>
        <MonthlyExpenseTrendsCard
          loading={loading}
          error={error}
          monthlyTrends={stats.monthlyTrends}
          selectedCurrencyCode={selectedCurrencyCode}
          moduleColor={moduleColor}
        />
      </div>
    </div>
  )
}

export default ExpenseDashboardTab
