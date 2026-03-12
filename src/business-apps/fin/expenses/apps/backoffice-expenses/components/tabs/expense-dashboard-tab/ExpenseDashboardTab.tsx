/**
 * Dashboard Tab Component for Expense Management Overview
 * Displays KPIs and statistics for expense management by composing various dashboard cards.
 */

/**
 * ExpenseDashboardTab component with integrated filter bar.
 * Displays KPIs and statistics for expense management by composing various dashboard cards.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Alert,
  Spinner,
  SectionKpiCards,
  KpiCardData,
  Card,
  CardContent,
  IconAvatar,
  useTranslation
} from '@newwork/nw-design-system'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useDashboardStats } from '../../../hooks/useDashboardStats'
import MonthlyExpenseTrendsCard from '../../cards/MonthlyExpenseTrendsCard'
import { ExpenseFilterBar, FilterOptions } from '../../filter-bar'
import translations from '../../../_i18n'
import { formatCurrency } from '../../../utils/currencyUtils'
import { extractCurrencyCode } from '../../../utils/sharedUtils'
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
  const { t } = useTranslation(translations)

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
    return t(`quarter-${quarterNumber}`)
  }

  const getTranslatedMonth = (monthIndex: number): string => {
    const monthKeys = [
      'month-january',
      'month-february',
      'month-march',
      'month-april',
      'month-may',
      'month-june',
      'month-july',
      'month-august',
      'month-september',
      'month-october',
      'month-november',
      'month-december'
    ]
    return t(monthKeys[monthIndex])
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

  const selectedCurrencyCode = extractCurrencyCode(currentFilters.currency || 'Currency:v1:EUR')

  // Helper: Get title for total company spend (reduces cognitive complexity)
  const getTotalCompanySpendTitle = useCallback(
    (period: string | undefined, currencyCode: string) => {
      switch (period) {
        case 'yearly':
          return `${t('kpi-total-company-spend-ytd')} (${currencyCode})`
        case 'quarterly':
          return `${t('kpi-total-company-spend-qtd')} (${currencyCode})`
        default:
          return `${t('kpi-total-company-spend-mtd')} (${currencyCode})`
      }
    },
    [t]
  )

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
      const expensesLabel = t('kpi-expenses-label')
      return `${currentPeriodName}: ${formatCurrency(currentTotal, currencyCode)} (${currentCount} ${expensesLabel})\n${previousPeriodName}: ${formatCurrency(previousTotal, currencyCode)} (${previousCount} ${expensesLabel})`
    },
    [t]
  )

  // Helper: Get description for total company spend (reduces cognitive complexity)
  const getTotalCompanySpendDescription = useCallback(
    (period: string | undefined, isIncrease: boolean) => {
      switch (period) {
        case 'yearly':
          return isIncrease ? t('kpi-increase-vs-last-ytd') : t('kpi-decrease-vs-last-ytd')
        case 'quarterly':
          return isIncrease ? t('kpi-increase-vs-last-qtd') : t('kpi-decrease-vs-last-qtd')
        default:
          return isIncrease ? t('kpi-increase-vs-last-mtd') : t('kpi-decrease-vs-last-mtd')
      }
    },
    [t]
  )

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
          return `${t('kpi-actual-vs-planned')} ${new Date().getFullYear()} (${selectedCurrencyCode})`
        case 'quarterly': {
          const currentQuarter = Math.ceil((new Date().getMonth() + 1) / 3)
          return `${t('kpi-actual-vs-planned')} ${getTranslatedQuarter(currentQuarter)} ${new Date().getFullYear()} (${selectedCurrencyCode})`
        }
        default:
          return `${t('kpi-actual-vs-planned')} ${getTranslatedMonth(new Date().getMonth())} ${new Date().getFullYear()} (${selectedCurrencyCode})`
      }
    }

    return {
      id: 'actual-vs-planned',
      title: getActualVsPlannedTitle(),
      value: actualVsPlannedPercentage ?? 'N/A',
      suffix: actualVsPlannedPercentage === null ? undefined : '%',
      decimalPlaces: actualVsPlannedPercentage === null ? undefined : 1,
      footer: `${t('kpi-planned-label')}: ${formatCurrency(plannedAmount, selectedCurrencyCode)} (${plannedCount} ${t('kpi-plans-label')})\n${t('kpi-actual-label')}: ${formatCurrency(actualAmount, selectedCurrencyCode)} (${actualCount} ${t('kpi-expenses-label')})`,
      trend:
        actualVsPlannedPercentage === null
          ? undefined
          : {
              value: actualVsPlannedPercentage.toFixed(1) + '%',
              description: actualAmount <= plannedAmount ? t('kpi-remaining-budget') : t('kpi-over-budget'),
              trendIcon: actualAmount > plannedAmount ? 'up' : 'down',
              badgeVariant: actualAmount > plannedAmount ? 'destructive' : 'success'
            }
    }
  }, [t, currentFilters.period, selectedCurrencyCode, stats.actualVsPlanned])

  // Helper to build Monthly Spend Comparison card (reduces complexity of kpiCards)
  const buildMonthlySpendComparisonCard = useCallback((): KpiCardData => {
    const monthlyComparison = stats.monthlySpendComparison

    const comparisonTitleByPeriod: Record<'monthly' | 'quarterly' | 'yearly', string> = {
      yearly: `${t('kpi-yearly-spend-comparison')} (${selectedCurrencyCode})`,
      quarterly: `${t('kpi-quarterly-spend-comparison')} (${selectedCurrencyCode})`,
      monthly: `${t('kpi-monthly-spend-comparison')} (${selectedCurrencyCode})`
    }

    const getComparisonDescription = () => {
      switch (currentFilters.period) {
        case 'yearly':
          return monthlyComparison.isIncrease ? t('kpi-increase-vs-last-year') : t('kpi-decrease-vs-last-year')
        case 'quarterly':
          return monthlyComparison.isIncrease ? t('kpi-increase-vs-last-quarter') : t('kpi-decrease-vs-last-quarter')
        default:
          return monthlyComparison.isIncrease ? t('kpi-increase-vs-last-month') : t('kpi-decrease-vs-last-month')
      }
    }

    return {
      id: 'monthly-spend-comparison',
      title: comparisonTitleByPeriod[currentFilters.period || 'monthly'],
      value:
        monthlyComparison.percentChange === null ? 'N/A' : Math.abs(monthlyComparison.percentChange).toFixed(1) + ' %',
      footer: `${getCurrentPeriodName()}: ${formatCurrency(monthlyComparison.currentMonthTotal, selectedCurrencyCode)} (${monthlyComparison.currentMonthCount} ${t('kpi-expenses-label')})\n${getPreviousPeriodName()}: ${formatCurrency(monthlyComparison.previousMonthTotal, selectedCurrencyCode)} (${monthlyComparison.previousMonthCount} ${t('kpi-expenses-label')})`,
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

  const getPeriodFooterText = (keys: { yearly: string; quarterly: string; monthly: string }) => {
    if (currentFilters.period === 'yearly') return t(keys.yearly)
    if (currentFilters.period === 'quarterly') return t(keys.quarterly)
    return t(keys.monthly)
  }

  const getAdvancePaymentFooter = useCallback(() => {
    return getPeriodFooterText({
      yearly: 'kpi-approved-waiting-year',
      quarterly: 'kpi-approved-waiting-quarter',
      monthly: 'kpi-approved-waiting-month'
    })
  }, [currentFilters.period])

  const getAvgSpendPerTripFooter = useCallback(() => {
    return getPeriodFooterText({
      yearly: 'kpi-avg-trip-footer-year',
      quarterly: 'kpi-avg-trip-footer-quarter',
      monthly: 'kpi-avg-trip-footer-month'
    })
  }, [currentFilters.period])

  const buildTransferRequiredCard = useCallback(
    (): KpiCardData => ({
      id: 'transfer-required',
      title: `${t('kpi-transfer-required')} (${selectedCurrencyCode})`,
      value: formatCurrency(stats.transferRequired, selectedCurrencyCode),
      footer: `${t('kpi-all-pending-transfers-in')} ${selectedCurrencyCode}`
    }),
    [t, selectedCurrencyCode, stats.transferRequired]
  )

  const buildPendingRequestsCard = useCallback(
    (): KpiCardData => ({
      id: 'pending-requests',
      title: t('kpi-pending-requests'),
      value: stats.pendingRequestsCount.toString(),
      footer: t('kpi-all-requests-awaiting')
    }),
    [t, stats.pendingRequestsCount]
  )

  const buildAdvancePaymentCard = useCallback(
    (): KpiCardData => ({
      id: 'advance-payment',
      title: t('kpi-advance-payment'),
      value: stats.advancePaymentsApproved.count.toString(),
      footer: getAdvancePaymentFooter()
    }),
    [t, stats.advancePaymentsApproved.count, getAdvancePaymentFooter]
  )

  const buildAvgSpendPerTripCard = useCallback(
    (): KpiCardData => ({
      id: 'avg-spend-per-trip',
      title: `${t('kpi-average-spend-per-trip')} (${selectedCurrencyCode})`,
      value: formatCurrency(stats.avgSpendPerTrip, selectedCurrencyCode),
      footer: getAvgSpendPerTripFooter()
    }),
    [t, selectedCurrencyCode, stats.avgSpendPerTrip, getAvgSpendPerTripFooter]
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
        title: t('spending-analysis-title'),
        description: t('analytics-spending-cta'),
        onClick: props.onNavigateToAnalytics
      },
      {
        key: 'reports',
        icon: PiFileText,
        iconColor: 'gba:text-accent',
        title: t('expense-reports-title'),
        description: t('quick-actions-reports-cta'),
        onClick: props.onNavigateToReports
      }
    ],
    [t, props.onNavigateToAnalytics, props.onNavigateToReports]
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
            <h4 className="gba:font-semibold">{t('dashboard-error-title')}</h4>
            <p className="gba:text-sm gba:mt-1">{error.message || t('dashboard-error-message')}</p>
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
        <h3 className="gba:text-lg gba:font-semibold">{t('quick-actions-title')}</h3>
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
