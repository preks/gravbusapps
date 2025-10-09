import React, { useMemo } from 'react'
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from '../../../hooks/useMainViewAdvancePayments'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DollarOutlined, ClockCircleOutlined } from '@ant-design/icons'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useCurrencyStore } from '../../../store/useCurrencyStore'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'

interface AdvancePaymentStatisticsProps {
  advancePaymentStats: AdvancePaymentStatisticsData | null
  statsLoading: boolean
  statsError: Error | null
  fetchAdvancePaymentStatistics: () => Promise<void>
}

const AdvancePaymentStatistics: React.FC<AdvancePaymentStatisticsProps> = ({
  advancePaymentStats,
  statsLoading,
  statsError,
  fetchAdvancePaymentStatistics
}) => {
  // Use the global currency store - use primary currency (user's selection) for both cards
  const { primaryCurrency } = useCurrencyStore()

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
          ? formatCurrencyDisplay(advancePaymentStats.sumAmount, primaryCurrency)
          : formatCurrencyDisplay(0, primaryCurrency),
        prefix: <DollarOutlined />,
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
          ? formatCurrencyDisplay(advancePaymentStats.pendingAmount, primaryCurrency)
          : formatCurrencyDisplay(0, primaryCurrency),
        prefix: <ClockCircleOutlined />,
        color: 'var(--nw-destructive)',
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.awaiting_approval',
          'Awaiting approval'
        )
      }
    ]
  }, [advancePaymentStats, primaryCurrency])

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
