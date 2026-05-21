import React, { useCallback, useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { ExpenseRequestStatisticsData } from '../../../hooks/useGetExpenseRequests'
import { WidgetItem } from '@/components/widget-group'
import ManagerClickableWidgetGroup from '../../ManagerClickableWidgetGroup'
import { CurrencyPrefix } from '../../../common/components/CurrencyPrefix'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import translations from '../../../_i18n'

const SUBMITTED_STATUSES = ['PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 'TRANSFERRED']

interface ExpenseRequestStatisticsProps {
  requestStats: ExpenseRequestStatisticsData | null
  requestStatsLoading: boolean
  requestStatsError: string | null
  fetchRequestStatistics: () => Promise<void>
  displayCurrency?: string | null
  activeFilter?: string[]
  onFilterChange?: (statuses: string[], currency: string) => void
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({
  requestStats,
  requestStatsLoading,
  requestStatsError,
  fetchRequestStatistics,
  displayCurrency: displayCurrencyProp,
  activeFilter = [],
  onFilterChange
}) => {
  const { t } = useTranslation(translations)
  const displayCurrency = displayCurrencyProp ?? 'EUR'

  const handleCardClick = useCallback(
    (filterKey: string, isMultiFilter: boolean = false) => {
      if (!onFilterChange) return
      if (isMultiFilter) {
        const allActive = SUBMITTED_STATUSES.every(s => activeFilter.includes(s))
        onFilterChange(allActive ? [] : [...SUBMITTED_STATUSES], displayCurrency)
      } else {
        const isActive = activeFilter.includes(filterKey)
        onFilterChange(isActive ? [] : [filterKey], displayCurrency)
      }
    },
    [onFilterChange, activeFilter, displayCurrency]
  )

  const isPendingActive = activeFilter.length === 1 && activeFilter[0] === 'PENDING'
  const isSubmittedActive = SUBMITTED_STATUSES.every(s => activeFilter.includes(s))

  const widgets: WidgetItem[] = useMemo(
    () =>
      requestStats
        ? [
            {
              key: 'pending-requests',
              title: t('expense-requests-stats-pending-requests-title'),
              value: requestStats.pendingCount.toString(),
              prefix: <CurrencyPrefix currency={displayCurrency} />,
              valueIsString: true,
              color: isPendingActive ? 'var(--nw-primary)' : 'var(--nw-warning)',
              description: t('expense-requests-stats-pending-requests-desc'),
              active: isPendingActive,
              onClick: () => handleCardClick('PENDING')
            },
            {
              key: 'pending-amount',
              title: t('expense-requests-stats-pending-amount-title'),
              value: formatCurrencyDisplay(requestStats.pendingAmount || 0, displayCurrency),
              color: 'var(--nw-success)',
              description: t('expense-requests-stats-pending-amount-desc'),
              valueIsString: true
            },
            {
              key: 'total-requests-submitted',
              title: t('expense-requests-stats-total-submitted-title'),
              value: requestStats.totalRequestsSubmitted.toString(),
              prefix: <CurrencyPrefix currency={displayCurrency} />,
              valueIsString: true,
              color: 'var(--nw-primary)',
              description: t('expense-requests-stats-total-submitted-desc'),
              active: isSubmittedActive,
              onClick: () => handleCardClick('', true)
            },
            {
              key: 'total-submitted-amount',
              title: t('expense-requests-stats-total-amount-title'),
              value: formatCurrencyDisplay(requestStats.totalSubmittedAmount || 0, displayCurrency),
              color: activeFilter.length === 0 ? 'var(--nw-primary)' : 'var(--nw-accent)',
              description: t('expense-requests-stats-total-amount-desc'),
              valueIsString: true,
              active: activeFilter.length === 0
            }
          ]
        : [],
    [requestStats, activeFilter, displayCurrency, handleCardClick, isPendingActive, isSubmittedActive, t]
  )

  return (
    <ManagerClickableWidgetGroup
      widgets={widgets}
      isLoading={requestStatsLoading}
      error={requestStatsError ? t('expense-requests-stats-load-error') : undefined}
      onRetry={fetchRequestStatistics}
      skeletonCount={4}
      emptyText={t('expense-requests-stats-empty')}
      cardBackground="muted"
      className="gba:py-0"
      data-testid="expense-request-statistics"
    />
  )
}

export default ExpenseRequestStatistics
