import React, { useCallback, useMemo } from 'react'
import { ExpenseRequestStatisticsData } from '../../../hooks/useGetExpenseRequests'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface ExpenseRequestStatisticsProps {
  requestStats: ExpenseRequestStatisticsData | null
  requestStatsLoading: boolean
  requestStatsError: string | null
  fetchRequestStatistics: () => Promise<void>
  currencyFilter?: string | null
  /** Clears the currency selection so the table shows all currencies. */
  clearCurrencyFilter: () => void
  setFilters: (filters: string[]) => void
  selectedFilters: string[]
}

const ExpenseRequestStatistics: React.FC<ExpenseRequestStatisticsProps> = ({
  requestStats,
  requestStatsLoading,
  requestStatsError,
  fetchRequestStatistics,
  currencyFilter,
  clearCurrencyFilter,
  setFilters,
  selectedFilters
}) => {
  const displayCurrency = currencyFilter || 'EUR'

  // Helper: Toggle multi-filter set (e.g., all submitted statuses)
  const handleMultiFilterToggle = useCallback(
    (filtersToToggle: string[]) => {
      // Check if all filters in the set are currently active
      const allFiltersActive = filtersToToggle.every(filter => selectedFilters.includes(filter))

      if (allFiltersActive) {
        // All filters are active, remove all of them - set to empty array
        setFilters([])
      } else {
        // Not all filters are active - we want to set exactly these filters
        // Use setFilters to set the final state in one update (prevents duplicates)
        setFilters(filtersToToggle)
      }
    },
    [selectedFilters, setFilters]
  )

  // Helper: Toggle single filter (exclusive selection)
  const handleSingleFilterToggle = useCallback(
    (filterKey: string) => {
      if (selectedFilters.includes(filterKey)) {
        // Filter is active, remove it - set to empty array
        setFilters([])
      } else {
        // Filter is not active - we want only this filter active
        // Use setFilters to set exactly this filter in one update
        setFilters([filterKey])
      }
    },
    [selectedFilters, setFilters]
  )

  // Handle card click functionality with proper filtering logic
  const handleCardClick = useCallback(
    (filterKey: string, isMultiFilter: boolean = false) => {
      // Cards show currency-agnostic totals, so when drilling down we must ensure
      // the table also shows all currencies (otherwise card count != table count).
      clearCurrencyFilter()

      if (isMultiFilter) {
        const filtersToToggle = ['PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 'TRANSFERRED']
        handleMultiFilterToggle(filtersToToggle)
      } else {
        handleSingleFilterToggle(filterKey)
      }
    },
    [clearCurrencyFilter, handleMultiFilterToggle, handleSingleFilterToggle]
  )

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
              value: requestStats.pendingCount,
              color: selectedFilters.includes('PENDING') ? 'var(--nw-primary)' : 'var(--nw-warning)',

              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.waiting_for_approval',
                'Waiting for approval'
              ),
              active: selectedFilters.includes('PENDING'),
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
              value: requestStats.totalRequestsSubmitted,
              color: 'var(--nw-primary)',

              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.all_submitted_requests',
                'All Submitted Requests'
              ),
              active: (() => {
                const multiFilters = ['PENDING', 'APPROVED', 'VERIFIED', 'BOOKED', 'TRANSFERRED']
                return multiFilters.every(filter => selectedFilters.includes(filter))
              })(),
              onClick: () => handleCardClick('', true)
            },
            {
              key: 'total-submitted-amount',
              title: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.total_submitted_amount',
                'Total Submitted Amount'
              ),
              value: formatCurrencyDisplay(requestStats.totalSubmittedAmount || 0, displayCurrency),
              color: selectedFilters.length === 0 ? 'var(--nw-primary)' : 'var(--nw-accent)',

              description: getTranslationFromI18nKeyAndLabel(
                'lowcoder:team_expenses_page.expense_requests_tab.all_expense_requests',
                'All Expense Requests'
              ),
              valueIsString: true,
              active: selectedFilters.length === 0
            }
          ]
        : [],
    [requestStats, selectedFilters, displayCurrency, handleCardClick]
  )

  // Handle widget clicks from WidgetGroup
  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      switch (widgetKey) {
        case 'pending-requests':
          handleCardClick('PENDING')
          break
        case 'total-requests-submitted':
          handleCardClick('', true) // Use multi-filter mode
          break

        default:
          break
      }
    },
    [handleCardClick]
  )

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={requestStatsLoading}
      error={requestStatsError ? 'Failed to load statistics' : undefined}
      onRetry={fetchRequestStatistics}
      onWidgetClick={handleWidgetClick}
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
