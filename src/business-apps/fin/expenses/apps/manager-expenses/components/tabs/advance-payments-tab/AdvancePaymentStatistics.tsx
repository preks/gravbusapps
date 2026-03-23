import React, { useCallback, useMemo } from 'react'
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from '../../../hooks/useMainViewAdvancePayments'
import { WidgetItem } from '@/components/widget-group'
import ManagerClickableWidgetGroup from '../../ManagerClickableWidgetGroup'
import { CurrencyDollarIcon, ClockIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { ExpenseStatus } from '../../../utils'

/** Statuses that contribute to the first card (Total Advance Payments = paid/transferred only). */
const STATUSES_FOR_TOTAL_CARD: string[] = [ExpenseStatus.PAID, ExpenseStatus.TRANSFERRED]

interface AdvancePaymentStatisticsProps {
  advancePaymentStats: AdvancePaymentStatisticsData | null
  statsLoading: boolean
  statsError: Error | null
  fetchAdvancePaymentStatistics: () => Promise<void>
  /** Selected currency filter from the tab (for list). */
  currencyFilter?: string | null
  /** Currency used for formatting stats card amounts (e.g. selected or most-used). */
  displayCurrency?: string | null
  /** Current status filter applied to the table. */
  activeFilter?: string[]
  /** Called when a card is clicked to apply the corresponding status filter. */
  onFilterChange?: (statuses: string[]) => void
}

const AdvancePaymentStatistics: React.FC<AdvancePaymentStatisticsProps> = ({
  advancePaymentStats,
  statsLoading,
  statsError,
  fetchAdvancePaymentStatistics,
  currencyFilter,
  displayCurrency: displayCurrencyProp,
  activeFilter = [],
  onFilterChange
}) => {
  const displayCurrency = displayCurrencyProp ?? currencyFilter ?? 'EUR'

  const isTotalFilterActive =
    activeFilter.length === STATUSES_FOR_TOTAL_CARD.length &&
    STATUSES_FOR_TOTAL_CARD.every(s => activeFilter.includes(s))
  const isPendingFilterActive = activeFilter.length === 1 && activeFilter[0] === ExpenseStatus.PENDING

  const handleTotalCardClick = useCallback(() => {
    if (!onFilterChange) return
    if (isTotalFilterActive) {
      onFilterChange([])
    } else {
      onFilterChange([...STATUSES_FOR_TOTAL_CARD])
    }
  }, [onFilterChange, isTotalFilterActive])

  const handlePendingCardClick = useCallback(() => {
    if (!onFilterChange) return
    if (isPendingFilterActive) {
      onFilterChange([])
    } else {
      onFilterChange([ExpenseStatus.PENDING])
    }
  }, [onFilterChange, isPendingFilterActive])

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
        color: isTotalFilterActive ? 'var(--nw-primary)' : 'var(--nw-success)',
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.advance_payments_tab.paid_and_transferred',
          'Paid and transferred advance payments'
        ),
        active: isTotalFilterActive,
        onClick: onFilterChange ? handleTotalCardClick : undefined
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
        color: isPendingFilterActive ? 'var(--nw-primary)' : 'var(--nw-destructive)',
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.awaiting_approval',
          'Awaiting approval'
        ),
        active: isPendingFilterActive,
        onClick: onFilterChange ? handlePendingCardClick : undefined
      }
    ]
  }, [
    advancePaymentStats,
    displayCurrency,
    isTotalFilterActive,
    isPendingFilterActive,
    onFilterChange,
    handleTotalCardClick,
    handlePendingCardClick
  ])

  return (
    <ManagerClickableWidgetGroup
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
