import React, { useMemo } from 'react'
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from '../../../hooks/useMainViewAdvancePayments'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CurrencyDollarIcon, ClockIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'

interface AdvancePaymentStatisticsProps {
  advancePaymentStats: AdvancePaymentStatisticsData | null
  statsLoading: boolean
  statsError: Error | null
  fetchAdvancePaymentStatistics: () => Promise<void>
  /** Selected currency filter from the tab (for list). */
  currencyFilter?: string | null
  /** Currency used for formatting stats card amounts (e.g. selected or most-used). */
  displayCurrency?: string | null
}

const AdvancePaymentStatistics: React.FC<AdvancePaymentStatisticsProps> = ({
  advancePaymentStats,
  statsLoading,
  statsError,
  fetchAdvancePaymentStatistics,
  currencyFilter,
  displayCurrency: displayCurrencyProp
}) => {
  const displayCurrency = displayCurrencyProp ?? currencyFilter ?? 'EUR'

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
          ? formatCurrencyDisplay(advancePaymentStats.sumAmount, displayCurrency)
          : formatCurrencyDisplay(0, displayCurrency),
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
          ? formatCurrencyDisplay(advancePaymentStats.pendingAmount, displayCurrency)
          : formatCurrencyDisplay(0, displayCurrency),
        prefix: <ClockIcon size={16} />,
        color: 'var(--nw-destructive)',
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.awaiting_approval',
          'Awaiting approval'
        )
      }
    ]
  }, [advancePaymentStats, displayCurrency])

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
