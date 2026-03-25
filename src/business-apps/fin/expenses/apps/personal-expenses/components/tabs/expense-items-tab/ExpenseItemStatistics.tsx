import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../utils'
import { getTranslatedMonthName } from '../../../utils/monthTranslationUtils'
import React, { useMemo, useCallback } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CurrencyEurIcon, WalletIcon } from '@phosphor-icons/react'

interface ExpenseItemStatisticsProps {
  items: any[]
  totalExpenses?: number | null
  previousMonthTotalExpenses?: number | null
  pendingReimbursementTotal?: number
  previousMonthPendingReimbursementTotal?: number
  pendingItemCountFromApi?: number
  onWidgetClick?: (widgetKey: string) => void
  activeWidgetKey?: string
  statsLoading?: boolean
  statsError?: string | null
  fetchItemStatistics?: () => Promise<void>
  currencyCode?: string
}

const ExpenseItemStatistics: React.FC<ExpenseItemStatisticsProps> = ({
  items,
  totalExpenses,
  previousMonthTotalExpenses,
  pendingReimbursementTotal,
  previousMonthPendingReimbursementTotal,
  pendingItemCountFromApi,
  onWidgetClick,
  activeWidgetKey,
  statsLoading = false,
  statsError = null,
  fetchItemStatistics = () => Promise.resolve(),
  currencyCode: currencyCodeOverride
}) => {
  const currentMonthName = getTranslatedMonthName(new Date())
  // Resolve a currency code override or fallback to first item or EUR
  const currencyCode = useMemo(() => {
    if (currencyCodeOverride) return currencyCodeOverride
    const code = items?.find(it => it?.currency?.code)?.currency?.code as string | undefined
    return code || 'EUR'
  }, [items, currencyCodeOverride])

  // Use backend aggregate for pending reimbursement total
  const pendingReimbursement = pendingReimbursementTotal ?? 0

  // Pending item count from API
  const pendingItemCount = pendingItemCountFromApi ?? 0

  // Calculate percentage changes for trend data
  const totalExpensesPercentageChange = useMemo(() => {
    const current = totalExpenses ?? 0
    const previous = previousMonthTotalExpenses ?? 0

    if (previous === 0) {
      return current > 0 ? 100 : 0
    }
    return ((current - previous) / previous) * 100
  }, [totalExpenses, previousMonthTotalExpenses])

  // Generate trend data for total expenses
  const totalExpensesTrend = useMemo(() => {
    const current = totalExpenses ?? 0
    const previous = previousMonthTotalExpenses ?? 0

    if (previous === 0 && current > 0) {
      return {
        value: '+100%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    if (totalExpensesPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    const sign = totalExpensesPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${totalExpensesPercentageChange.toFixed(0)}%`,
      positive: totalExpensesPercentageChange >= 0,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
    }
  }, [totalExpensesPercentageChange, totalExpenses, previousMonthTotalExpenses])

  // Calculate percentage change for pending reimbursement
  const pendingReimbursementPercentageChange = useMemo(() => {
    const current = pendingReimbursementTotal ?? 0
    const previous = previousMonthPendingReimbursementTotal ?? 0

    if (previous === 0) {
      return current > 0 ? 100 : 0
    }

    const percentageChange = ((current - previous) / previous) * 100
    return percentageChange
  }, [pendingReimbursementTotal, previousMonthPendingReimbursementTotal])

  // Generate trend data for pending reimbursement
  const pendingReimbursementTrend = useMemo(() => {
    const current = pendingReimbursementTotal ?? 0
    const previous = previousMonthPendingReimbursementTotal ?? 0

    // Handle the case where previous month had no pending reimbursement
    if (previous === 0) {
      if (current > 0) {
        return {
          value: '+100%',
          positive: true,
          description: getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.from_last_month',
            'from last month'
          )
        }
      }
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }

    if (pendingReimbursementPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
      }
    }
    // Always show the percentage, regardless of how large it is
    const sign = pendingReimbursementPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${pendingReimbursementPercentageChange.toFixed(0)}%`,
      positive: pendingReimbursementPercentageChange >= 0,
      description: getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.from_last_month', 'from last month')
    }
  }, [pendingReimbursementPercentageChange, pendingReimbursementTotal, previousMonthPendingReimbursementTotal])

  // Handle widget clicks with immediate visual feedback
  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      // Provide immediate visual feedback - let parent component handle all filtering
      if (onWidgetClick) {
        onWidgetClick(widgetKey)
      }
    },
    [onWidgetClick]
  )

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'total-expenses',
        title:
          getTranslationFromI18nKeyAndLabel(
            'lowcoder:personal_expenses.total_expenses_for_month',
            'Total Expenses for'
          ) +
          ' ' +
          currentMonthName,
        value: formatCurrencyDisplay(totalExpenses ?? 0, currencyCode),
        valueIsString: true,
        prefix: <CurrencyEurIcon size={16} />,
        color: '#3f8600',
        span: { xs: 24, sm: 12, md: 8, lg: 8 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.current_month_expenses',
          'Current month expenses'
        ),
        trend: totalExpensesTrend,
        active: activeWidgetKey === 'total-expenses',
        onClick: () => handleWidgetClick('total-expenses')
      },
      {
        key: 'pending-reimbursement',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.pending_reimbursement',
          'Pending Reimbursement'
        ),
        value: formatCurrencyDisplay(pendingReimbursement, currencyCode),
        valueIsString: true,
        prefix: <WalletIcon size={16} />,
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 8, lg: 8 },
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.awaiting_processing',
          'Awaiting processing'
        ),
        trend: pendingReimbursementTrend,
        active: activeWidgetKey === 'pending-reimbursement',
        onClick: () => handleWidgetClick('pending-reimbursement')
      }
    ],
    [
      currentMonthName,
      totalExpenses,
      previousMonthTotalExpenses,
      pendingReimbursement,
      pendingItemCount,
      activeWidgetKey,
      totalExpensesTrend,
      pendingReimbursementTrend,
      handleWidgetClick,
      previousMonthPendingReimbursementTotal
    ]
  )

  return (
    <div data-testid="expense-item-statistics-container" className="gba:w-full">
      <WidgetGroup
        widgets={widgets}
        isLoading={statsLoading}
        error={statsError}
        onRetry={fetchItemStatistics}
        onWidgetClick={handleWidgetClick}
        skeletonCount={4}
        useWidgetStructureForLoading={true}
        emptyText={getTranslationFromI18nKeyAndLabel(
          'lowcoder:personal_expenses.no_expense_item_statistics_available',
          'No expense item statistics available.'
        )}
        data-testid="expense-item-statistics"
      />
    </div>
  )
}

export default ExpenseItemStatistics
