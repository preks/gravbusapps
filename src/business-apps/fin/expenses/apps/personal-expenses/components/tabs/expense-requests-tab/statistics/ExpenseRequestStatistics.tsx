import React, { useMemo, useCallback } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useGetExpenseRequestStatistics } from '../../../../hooks/useGetExpenseRequestStatistics'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../utils'
import { kpiHeaderCurrencyLabel } from '../../../../utils/kpiHeaderCurrencyLabel'
import { getTranslatedMonthName } from '../../../../utils/monthTranslationUtils'

interface ExpenseRequestStatisticsProps extends BusinessAppContextProps {
  statsLoading?: boolean
  statsError?: string | null
  fetchRequestStatistics?: () => Promise<void>
  onWidgetClick?: (widgetKey: string) => void
  activeWidgetKey?: string
  currencyCode?: string
  selectedCurrencyRef?: string
  currencyInitialized?: boolean
}

const getEffectiveCurrencyCode = (currencyCode?: string, selectedCurrencyRef?: string): string => {
  const trimmedCurrency = currencyCode?.trim()
  if (trimmedCurrency) {
    return trimmedCurrency
  }

  const refCode = selectedCurrencyRef?.split(':').pop()?.trim()
  if (refCode) {
    return refCode
  }

  return 'EUR'
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({
  statsLoading = false,
  statsError = null,
  fetchRequestStatistics = () => Promise.resolve(),
  onWidgetClick,
  activeWidgetKey,
  currencyCode,
  selectedCurrencyRef,
  currencyInitialized,
  ...contextProps
}) => {
  const effectiveCurrencyCode = getEffectiveCurrencyCode(currencyCode, selectedCurrencyRef)

  // Memoize context props to ensure stable reference
  const stableContextProps = useMemo(
    () => ({
      accessToken: contextProps.accessToken,
      userInfo: contextProps.userInfo
    }),
    [contextProps.accessToken, contextProps.userInfo]
  )

  // Use the statistics hook
  const {
    statistics,
    isLoading: hookLoading,
    error: hookError,
    fetchStatistics
  } = useGetExpenseRequestStatistics(stableContextProps, selectedCurrencyRef || 'Currency:v1:EUR')

  // Combine loading states
  const isLoading = statsLoading || hookLoading
  const error = statsError || hookError

  // Ensure statistics are fetched when component mounts or currency changes
  React.useEffect(() => {
    // Avoid duplicate initial queries: wait until currencies are initialized
    if (!currencyInitialized) return

    if (stableContextProps.accessToken && stableContextProps.userInfo?.employeeDetails?.employeeId) {
      fetchStatistics()
    }
  }, [
    stableContextProps.accessToken,
    stableContextProps.userInfo?.employeeDetails?.employeeId,
    selectedCurrencyRef,
    fetchStatistics,
    currencyInitialized
  ])

  // Calculate current month name
  const currentMonthName = getTranslatedMonthName(new Date())

  // Calculate percentage changes for trend data
  const totalRequestsPercentageChange = useMemo(() => {
    if (statistics.previousMonthTotal === 0) {
      return statistics.currentMonthTotal > 0 ? 100 : 0
    }
    return ((statistics.currentMonthTotal - statistics.previousMonthTotal) / statistics.previousMonthTotal) * 100
  }, [statistics.currentMonthTotal, statistics.previousMonthTotal])

  const totalAmountPercentageChange = useMemo(() => {
    if (statistics.previousMonthAmount === 0) {
      return statistics.currentMonthAmount > 0 ? 100 : 0
    }
    return ((statistics.currentMonthAmount - statistics.previousMonthAmount) / statistics.previousMonthAmount) * 100
  }, [statistics.currentMonthAmount, statistics.previousMonthAmount])

  // Calculate trend data
  const totalRequestsTrend = useMemo(() => {
    if (statistics.previousMonthTotal === 0 && statistics.currentMonthTotal > 0) {
      return {
        value: '+100%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    if (totalRequestsPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    const sign = totalRequestsPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${totalRequestsPercentageChange.toFixed(0)}%`,
      positive: totalRequestsPercentageChange >= 0,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
    }
  }, [totalRequestsPercentageChange, statistics.currentMonthTotal, statistics.previousMonthTotal])

  const totalAmountTrend = useMemo(() => {
    if (statistics.previousMonthAmount === 0 && statistics.currentMonthAmount > 0) {
      return {
        value: '+100%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    if (totalAmountPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    const sign = totalAmountPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${totalAmountPercentageChange.toFixed(0)}%`,
      positive: totalAmountPercentageChange >= 0,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
    }
  }, [totalAmountPercentageChange, statistics.currentMonthAmount, statistics.previousMonthAmount])

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      // Prevent clicking when statistics are still loading
      if (isLoading) {
        return
      }

      // Provide immediate visual feedback - let parent component handle all filtering
      if (onWidgetClick) {
        onWidgetClick(widgetKey)
      }
    },
    [onWidgetClick, isLoading]
  )

  // No-trend widgets: value, empty row, footer (same layout as expense dashboard)
  const widgets: WidgetItem[] = [
    {
      key: 'total-requests',
      title:
        getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.total_requests_for_month', `Total Requests for`) +
        ' ' +
        currentMonthName,
      value: statistics.currentMonthTotal,
      prefix: kpiHeaderCurrencyLabel(effectiveCurrencyCode),
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.submitted_expense_requests',
        'Submitted expense requests'
      ),
      trend: totalRequestsTrend,
      active: activeWidgetKey === 'total-requests',
      onClick: () => handleWidgetClick('total-requests')
    },
    {
      key: 'total-amount',
      title:
        getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.total_amount_for_month_requests',
          `Total Amount for`
        ) +
        ' ' +
        currentMonthName,
      value: formatCurrencyDisplay(statistics.currentMonthAmount || 0, effectiveCurrencyCode),
      color: '#3f8600',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.across_all_requests',
        'Across all requests'
      ),
      trend: totalAmountTrend,
      active: activeWidgetKey === 'total-amount',
      onClick: () => handleWidgetClick('total-amount')
    },
    {
      key: 'pending-approval',
      title: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.expense_plans_tab.pending_approval',
        'Pending Approval'
      ),
      value: statistics.pendingApproval,
      prefix: kpiHeaderCurrencyLabel(effectiveCurrencyCode),
      color: '#faad14',
      span: { xs: 24, sm: 12, md: 6 },
      footer: getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.expense_plans_tab.requires_action',
        'Requires action'
      ),
      trend: { hideBadge: true, value: '', description: '\u200B' },
      active: activeWidgetKey === 'pending-approval',
      onClick: () => handleWidgetClick('pending-approval')
    },
    {
      key: 'reimbursable',
      title: getTranslationFromI18nKeyAndLabel('lowcoder:expense_item_list.expense_table.reimbursable', 'Reimbursable'),
      value: formatCurrencyDisplay(statistics.reimbursableAmount, effectiveCurrencyCode),
      color: '#722ed1',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      footer: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.to_be_reimbursed', 'To be reimbursed'),
      trend: { hideBadge: true, value: '', description: '\u200B' },
      active: activeWidgetKey === 'reimbursable',
      onClick: () => handleWidgetClick('reimbursable')
    }
  ]

  return (
    <WidgetGroup
      widgets={widgets}
      // Show skeletons while loading; after load, cards will show 0 values when there's no data
      isLoading={isLoading}
      error={error}
      onRetry={fetchRequestStatistics}
      skeletonCount={4}
      useWidgetStructureForLoading={true}
      emptyText={getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.no_expense_request_statistics_available',
        'No expense request statistics available.'
      )}
      data-testid="expense-request-statistics"
      onWidgetClick={handleWidgetClick}
    />
  )
}

export default ExpenseRequestStatistics
