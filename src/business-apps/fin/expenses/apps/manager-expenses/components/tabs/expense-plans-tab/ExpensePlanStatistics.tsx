import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { WidgetItem } from '@/components/widget-group'
import ManagerClickableWidgetGroup from '../../ManagerClickableWidgetGroup'
import { CalendarIcon, FileTextIcon } from '@phosphor-icons/react'
import { CurrencyPrefix } from '../../../common/components/CurrencyPrefix'
import { ExpenseStatus } from '../../../utils'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import translations from '../../../_i18n'
import { ExpensePlanStatistics } from '../../../hooks/useGetExpensePlans'

export interface ExpensePlanStatisticsProps {
  planStats: ExpensePlanStatistics | null
  statsLoading: boolean
  statsError: Error | null
  fetchPlanStatistics: () => void
  activeFilter: ExpenseStatus[] | null
  onFilterChange: (filter: ExpenseStatus[] | null) => void
  currencyFilter?: string | null
  /** Currency used for formatting amounts/labels when no filter is set (e.g. most used currency). */
  displayCurrency?: string | null
}

const ExpensePlanStatisticsDisplay: React.FC<ExpensePlanStatisticsProps> = ({
  planStats,
  statsLoading,
  statsError,
  fetchPlanStatistics,
  activeFilter,
  onFilterChange,
  currencyFilter,
  displayCurrency: displayCurrencyProp
}) => {
  const { t } = useTranslation(translations)
  const displayCurrency = displayCurrencyProp ?? currencyFilter ?? 'EUR'
  // Handle card click
  const handleCardClick = useCallback(
    (filterKey: ExpenseStatus | null) => {
      if (filterKey === null) {
        onFilterChange(null) // Clear all filters
      } else {
        // Check if this status is currently active
        const isActive = activeFilter?.includes(filterKey) || false
        if (isActive) {
          onFilterChange(null) // Clear all filters if clicking active status
        } else {
          onFilterChange([filterKey]) // Set single filter
        }
      }
    },
    [activeFilter, onFilterChange]
  )

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = useMemo(() => {
    if (!planStats) return []

    return [
      {
        key: 'pending-approval',
        title: t('expense-plans-stats-pending-title'),
        value: planStats.pendingCount.toString(),
        prefix: <CurrencyPrefix icon={CalendarIcon} currency={displayCurrency} />,
        color: 'var(--nw-warning)',
        valueIsString: true,
        description: t('expense-plans-stats-requires-action-desc'),
        active: activeFilter?.includes(ExpenseStatus.PENDING) || false,
        onClick: () => handleCardClick(ExpenseStatus.PENDING)
      },
      {
        key: 'total-plans',
        title: t('expense-plans-stats-total-plans-title'),
        value: planStats.totalCount.toString(),
        prefix: <CurrencyPrefix icon={FileTextIcon} currency={displayCurrency} />,
        color: 'var(--nw-primary)',
        valueIsString: true,
        description: t('expense-plans-stats-total-plans-desc'),
        active: !!(
          activeFilter?.length === 8 &&
          [
            ExpenseStatus.ASSIGNED,
            ExpenseStatus.PENDING,
            ExpenseStatus.APPROVED,
            ExpenseStatus.VERIFIED,
            ExpenseStatus.BOOKED,
            ExpenseStatus.PAID,
            ExpenseStatus.CLOSED,
            ExpenseStatus.TRANSFERRED
          ].every(status => activeFilter?.includes(status))
        ),
        onClick: () => {
          const submittedStatuses = [
            ExpenseStatus.ASSIGNED,
            ExpenseStatus.PENDING,
            ExpenseStatus.APPROVED,
            ExpenseStatus.VERIFIED,
            ExpenseStatus.BOOKED,
            ExpenseStatus.PAID,
            ExpenseStatus.CLOSED,
            ExpenseStatus.TRANSFERRED
          ]
          const isTotalPlansFilterActive =
            activeFilter?.length === 8 && submittedStatuses.every(status => activeFilter?.includes(status))
          if (isTotalPlansFilterActive) {
            onFilterChange(null)
          } else {
            onFilterChange(submittedStatuses)
          }
        }
      },
      {
        key: 'total-amount',
        title: t('expense-plans-stats-total-amount-title'),
        value: planStats.sumTotalAmount
          ? formatCurrencyDisplay(planStats.sumTotalAmount, displayCurrency)
          : formatCurrencyDisplay(0, displayCurrency),
        color: 'var(--nw-success)',
        valueIsString: true,

        description: t('expense-plans-stats-total-amount-desc')
      }
    ]
  }, [planStats, activeFilter, handleCardClick, displayCurrency, t])

  return (
    <ManagerClickableWidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError ? 'Failed to load statistics' : undefined}
      onRetry={fetchPlanStatistics}
      skeletonCount={3}
      emptyText={t('expense-plans-stats-empty')}
      cardBackground="transparent"
      className="gba:py-0 gba:bg-transparent"
      hoverable={true}
      data-testid="expense-plans-stats"
    />
  )
}

export default ExpensePlanStatisticsDisplay
