import { useTranslation } from '@newwork/nw-design-system'
import { formatCurrencyDisplay } from '../../../../utils'
import { getTranslatedMonthName } from '../../../../utils/monthTranslationUtils'
import React, { useMemo, useCallback } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import personalTranslations from '../../../../_i18n'

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
  const { t } = useTranslation(personalTranslations)
  const currentMonthName = getTranslatedMonthName(new Date(), t)
  const currencyCode = useMemo(() => {
    if (currencyCodeOverride) return currencyCodeOverride
    const code = items?.find(it => it?.currency?.code)?.currency?.code as string | undefined
    return code || 'EUR'
  }, [items, currencyCodeOverride])

  const pendingReimbursement = pendingReimbursementTotal ?? 0
  const pendingItemCount = pendingItemCountFromApi ?? 0

  const totalExpensesPercentageChange = useMemo(() => {
    const current = totalExpenses ?? 0
    const previous = previousMonthTotalExpenses ?? 0

    if (previous === 0) {
      return current > 0 ? 100 : 0
    }
    return ((current - previous) / previous) * 100
  }, [totalExpenses, previousMonthTotalExpenses])

  const totalExpensesTrend = useMemo(() => {
    const current = totalExpenses ?? 0
    const previous = previousMonthTotalExpenses ?? 0
    const fromLastMonth = t('expense-items-stat-from-last-month')

    if (previous === 0 && current > 0) {
      return {
        value: '+100%',
        positive: true,
        description: fromLastMonth
      }
    }
    if (totalExpensesPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: fromLastMonth
      }
    }
    const sign = totalExpensesPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${totalExpensesPercentageChange.toFixed(0)}%`,
      positive: totalExpensesPercentageChange >= 0,
      description: fromLastMonth
    }
  }, [totalExpensesPercentageChange, totalExpenses, previousMonthTotalExpenses, t])

  const pendingReimbursementPercentageChange = useMemo(() => {
    const current = pendingReimbursementTotal ?? 0
    const previous = previousMonthPendingReimbursementTotal ?? 0

    if (previous === 0) {
      return current > 0 ? 100 : 0
    }

    const percentageChange = ((current - previous) / previous) * 100
    return percentageChange
  }, [pendingReimbursementTotal, previousMonthPendingReimbursementTotal])

  const pendingReimbursementTrend = useMemo(() => {
    const current = pendingReimbursementTotal ?? 0
    const previous = previousMonthPendingReimbursementTotal ?? 0
    const fromLastMonth = t('expense-items-stat-from-last-month')

    if (previous === 0) {
      if (current > 0) {
        return {
          value: '+100%',
          positive: true,
          description: fromLastMonth
        }
      }
      return {
        value: '0%',
        positive: true,
        description: fromLastMonth
      }
    }

    if (pendingReimbursementPercentageChange === 0) {
      return {
        value: '0%',
        positive: true,
        description: fromLastMonth
      }
    }
    const sign = pendingReimbursementPercentageChange > 0 ? '+' : ''
    return {
      value: `${sign}${pendingReimbursementPercentageChange.toFixed(0)}%`,
      positive: pendingReimbursementPercentageChange >= 0,
      description: fromLastMonth
    }
  }, [pendingReimbursementPercentageChange, pendingReimbursementTotal, previousMonthPendingReimbursementTotal, t])

  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      if (onWidgetClick) {
        onWidgetClick(widgetKey)
      }
    },
    [onWidgetClick]
  )

  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'total-expenses',
        title: `${t('expense-items-stat-total-expenses-for-month-prefix')} ${currentMonthName}`,
        value: formatCurrencyDisplay(totalExpenses ?? 0, currencyCode),
        valueIsString: true,
        color: '#3f8600',
        span: { xs: 24, sm: 12, md: 8, lg: 8 },
        description: t('expense-items-stat-current-month-expenses'),
        trend: totalExpensesTrend,
        active: activeWidgetKey === 'total-expenses',
        onClick: () => handleWidgetClick('total-expenses')
      },
      {
        key: 'pending-reimbursement',
        title: t('expense-items-stat-pending-reimbursement'),
        value: formatCurrencyDisplay(pendingReimbursement, currencyCode),
        valueIsString: true,
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 8, lg: 8 },
        description: t('expense-items-stat-awaiting-processing'),
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
      previousMonthPendingReimbursementTotal,
      t,
      currencyCode
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
        emptyText={t('expense-items-stat-empty')}
        data-testid="expense-item-statistics"
      />
    </div>
  )
}

export default ExpenseItemStatistics
