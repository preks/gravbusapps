import React, { useCallback, useMemo } from 'react'
import { ExpenseRequestStatisticsData } from '../../../hooks/useGetExpenseRequests'
import { WidgetItem } from '@/components/widget-group'
import ManagerClickableWidgetGroup from '../../ManagerClickableWidgetGroup'
import { CurrencyPrefix } from '../../../common/components/CurrencyPrefix'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

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
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.pending_requests_btn',
                'Pending Requests'
              ),
              value: requestStats.pendingCount.toString(),
              prefix: <CurrencyPrefix currency={displayCurrency} />,
              valueIsString: true,
              color: isPendingActive ? 'var(--nw-primary)' : 'var(--nw-warning)',
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.waiting_for_approval',
                'Waiting for approval'
              ),
              active: isPendingActive,
              onClick: () => handleCardClick('PENDING')
            },
            {
              key: 'pending-amount',
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_plans_tab.pending_amount',
                'Pending Amount'
              ),
              value: formatCurrencyDisplay(requestStats.pendingAmount || 0, displayCurrency),
              color: 'var(--nw-success)',
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.total_pending_funds',
                'Total Pending Reimbursement'
              ),
              valueIsString: true
            },
            {
              key: 'total-requests-submitted',
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.total_requests_submitted',
                'Total Requests Submitted'
              ),
              value: requestStats.totalRequestsSubmitted.toString(),
              prefix: <CurrencyPrefix currency={displayCurrency} />,
              valueIsString: true,
              color: 'var(--nw-primary)',
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.all_submitted_requests',
                'All Submitted Requests'
              ),
              active: isSubmittedActive,
              onClick: () => handleCardClick('', true)
            },
            {
              key: 'total-submitted-amount',
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.total_submitted_amount',
                'Total Submitted Amount'
              ),
              value: formatCurrencyDisplay(requestStats.totalSubmittedAmount || 0, displayCurrency),
              color: activeFilter.length === 0 ? 'var(--nw-primary)' : 'var(--nw-accent)',
              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.all_expense_requests',
                'All Expense Requests'
              ),
              valueIsString: true,
              active: activeFilter.length === 0
            }
          ]
        : [],
    [requestStats, activeFilter, displayCurrency, handleCardClick, isPendingActive, isSubmittedActive]
  )

  return (
    <ManagerClickableWidgetGroup
      widgets={widgets}
      isLoading={requestStatsLoading}
      error={requestStatsError ? 'Failed to load statistics' : undefined}
      onRetry={fetchRequestStatistics}
      skeletonCount={4}
      emptyText={getTranslationFromI18nKeyAndLabel(
        'lowcoder:personal_expenses.no_expense_request_statistics_available',
        'No expense request statistics available.'
      )}
      cardBackground="muted"
      className="gba:py-0"
      data-testid="expense-request-statistics"
    />
  )
}

export default ExpenseRequestStatistics
