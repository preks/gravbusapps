import React, { useMemo } from 'react'
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from '../../../hooks/useMainViewAdvancePayments'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CurrencyDollarIcon, ClockIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useCurrencyStore } from '../../../store/useCurrencyStore'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'

interface AdvancePaymentStatisticsProps {
  advancePaymentStats: AdvancePaymentStatisticsData | null
  statsLoading: boolean
  statsError: Error | null
  fetchAdvancePaymentStatistics: () => Promise<void>
  currencyFilter: string | null
}

const AdvancePaymentStatistics: React.FC<AdvancePaymentStatisticsProps> = ({
  advancePaymentStats,
  statsLoading,
  statsError,
  fetchAdvancePaymentStatistics,
  currencyFilter
}) => {
  // Use currencyFilter from tab (synced with selected filter) instead of global store
  const { primaryCurrency } = useCurrencyStore()
  // Fallback to primaryCurrency if currencyFilter is not set
  const effectiveCurrency = currencyFilter || primaryCurrency

  // Transform the stats data into widgets format (memoized to avoid infinite effect loops)
  const widgets: WidgetItem[] = useMemo(() => {
    if (!advancePaymentStats) return []
    return [
      {
        key: 'total-advance-payment',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.advance_payments_tab.total_advance_payments',
          'Total Advance Payments'
        ),
        value: advancePaymentStats.sumAmount
          ? formatCurrencyDisplay(advancePaymentStats.sumAmount, effectiveCurrency)
          : formatCurrencyDisplay(0, effectiveCurrency),
        prefix: <CurrencyDollarIcon size={16} />,
        color: 'var(--nw-success)',
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.advance_payments_tab.all_advance_payments',
          'All advance payments'
        )
      },
      {
        key: 'pending-amount',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.pending_amount',
          'Pending Amount'
        ),
        value: advancePaymentStats.pendingAmount
          ? formatCurrencyDisplay(advancePaymentStats.pendingAmount, effectiveCurrency)
          : formatCurrencyDisplay(0, effectiveCurrency),
        prefix: <ClockIcon size={16} />,
        color: 'var(--nw-destructive)',
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.awaiting_approval',
          'Awaiting approval'
        )
      }
    ]
  }, [advancePaymentStats, effectiveCurrency])

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError ? 'Failed to load statistics' : undefined}
      onRetry={fetchAdvancePaymentStatistics}
      skeletonCount={2}
      emptyText={getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.advance_payments_tab.no_statistics',
        'No advance payment statistics available.'
      )}
      cardBackground="transparent"
      className="gba:py-0"
      data-testid="advance-payment-statistics"
    />
  )
}

export default AdvancePaymentStatistics
