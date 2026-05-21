import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { AdvancePaymentStatistics as AdvancePaymentStatisticsData } from '../../../hooks/useMainViewAdvancePayments'
import { WidgetItem } from '@/components/widget-group'
import ManagerClickableWidgetGroup from '../../ManagerClickableWidgetGroup'
import { ClockIcon } from '@phosphor-icons/react'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { ExpenseStatus } from '../../../utils'
import translations from '../../../_i18n'

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
  const { t } = useTranslation(translations)
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
        title: t('advance-payments-stats-total-title'),
        value: advancePaymentStats.sumAmount
          ? formatCurrencyDisplay(advancePaymentStats.sumAmount, displayCurrency)
          : formatCurrencyDisplay(0, displayCurrency),
        color: isTotalFilterActive ? 'var(--nw-primary)' : 'var(--nw-success)',
        valueIsString: true,
        description: t('advance-payments-stats-total-desc'),
        active: isTotalFilterActive,
        onClick: onFilterChange ? handleTotalCardClick : undefined
      },
      {
        key: 'pending-amount',
        title: t('advance-payments-stats-pending-title'),
        value: advancePaymentStats.pendingAmount
          ? formatCurrencyDisplay(advancePaymentStats.pendingAmount, displayCurrency)
          : formatCurrencyDisplay(0, displayCurrency),
        prefix: <ClockIcon size={16} />,
        color: isPendingFilterActive ? 'var(--nw-primary)' : 'var(--nw-destructive)',
        valueIsString: true,
        description: t('advance-payments-stats-pending-desc'),
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
    handlePendingCardClick,
    t
  ])

  return (
    <ManagerClickableWidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError ? t('advance-payments-stats-load-error') : undefined}
      onRetry={fetchAdvancePaymentStatistics}
      skeletonCount={2}
      emptyText={t('advance-payments-stats-empty')}
      cardBackground="transparent"
      className="gba:py-0"
      data-testid="advance-payment-statistics"
    />
  )
}

export default AdvancePaymentStatistics
