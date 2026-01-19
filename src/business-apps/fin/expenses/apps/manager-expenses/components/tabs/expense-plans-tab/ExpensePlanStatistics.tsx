import React, { useCallback, useMemo } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { CalendarOutlined, FileTextOutlined } from '@ant-design/icons'
import { ExpenseStatus } from '../../../utils'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpensePlanStatistics } from '../../../hooks/useGetExpensePlans' // Assuming this type is exported from your hook

interface ExpensePlanStatisticsProps {
  planStats: ExpensePlanStatistics | null
  statsLoading: boolean
  statsError: Error | null
  fetchPlanStatistics: () => void
  activeFilter: ExpenseStatus[] | null
  onFilterChange: (filter: ExpenseStatus[] | null) => void
  currencyFilter?: string | null
}

const ExpensePlanStatisticsDisplay: React.FC<ExpensePlanStatisticsProps> = ({
  planStats,
  statsLoading,
  statsError,
  fetchPlanStatistics,
  activeFilter,
  onFilterChange,
  currencyFilter
}) => {
  // Use only the currency filter passed from parent - no global store dependency
  const displayCurrency = currencyFilter || 'EUR'
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

  // Handle widget clicks from WidgetGroup
  const handleWidgetClick = useCallback(
    (widgetKey: string) => {
      switch (widgetKey) {
        case 'pending-approval':
          handleCardClick(ExpenseStatus.PENDING)
          break
        case 'total-plans': {
          // Filter for all statuses except DISCARDED and CREATED
          const allStatusesExceptDiscarded = [
            ExpenseStatus.PREPARED,
            ExpenseStatus.ASSIGNED,
            ExpenseStatus.PENDING,
            ExpenseStatus.APPROVED,
            ExpenseStatus.RETURNED,
            ExpenseStatus.REJECTED,
            ExpenseStatus.VERIFIED,
            ExpenseStatus.BOOKED,
            ExpenseStatus.PAID,
            ExpenseStatus.CLOSED,
            ExpenseStatus.TRANSFERRED
          ]
          // Check if this filter is already active, if so clear it
          const isTotalPlansFilterActive =
            activeFilter?.length === 11 &&
            allStatusesExceptDiscarded.every(status => activeFilter.includes(status)) &&
            !activeFilter.includes(ExpenseStatus.DISCARDED) &&
            !activeFilter.includes(ExpenseStatus.CREATED)

          if (isTotalPlansFilterActive) {
            onFilterChange(null)
          } else {
            onFilterChange(allStatusesExceptDiscarded)
          }
          break
        }
        case 'total-amount':
          // No filtering for total amount card
          break
        default:
          break
      }
    },
    [activeFilter, onFilterChange, handleCardClick]
  )

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = useMemo(() => {
    if (!planStats) return []

    return [
      {
        key: 'pending-approval',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.pending_approval',
          'Pending Approval'
        ),
        value: planStats.pendingCount.toString(),
        prefix: <CalendarOutlined />,
        color: 'var(--nw-warning)',
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.requires_action',
          'Requires action'
        ),
        active: activeFilter?.includes(ExpenseStatus.PENDING) || false,
        onClick: () => handleCardClick(ExpenseStatus.PENDING)
      },
      {
        key: 'total-plans',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.total_plans_submitted',
          'Total Plans (Submitted)'
        ),
        value: planStats.totalCount.toString(),
        prefix: <FileTextOutlined />,
        color: 'var(--nw-primary)',
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.all_submitted_plans',
          'All submitted plans'
        ),
        active: !!(
          activeFilter?.length === 11 &&
          [
            ExpenseStatus.PREPARED,
            ExpenseStatus.ASSIGNED,
            ExpenseStatus.PENDING,
            ExpenseStatus.APPROVED,
            ExpenseStatus.RETURNED,
            ExpenseStatus.REJECTED,
            ExpenseStatus.VERIFIED,
            ExpenseStatus.BOOKED,
            ExpenseStatus.PAID,
            ExpenseStatus.CLOSED,
            ExpenseStatus.TRANSFERRED
          ].every(status => activeFilter?.includes(status)) &&
          !activeFilter?.includes(ExpenseStatus.DISCARDED) &&
          !activeFilter?.includes(ExpenseStatus.CREATED)
        ),
        onClick: () => {
          // Filter for all statuses except DISCARDED and CREATED
          const allStatusesExceptDiscarded = [
            ExpenseStatus.PREPARED,
            ExpenseStatus.ASSIGNED,
            ExpenseStatus.PENDING,
            ExpenseStatus.APPROVED,
            ExpenseStatus.RETURNED,
            ExpenseStatus.REJECTED,
            ExpenseStatus.VERIFIED,
            ExpenseStatus.BOOKED,
            ExpenseStatus.PAID,
            ExpenseStatus.CLOSED,
            ExpenseStatus.TRANSFERRED
          ]
          // Check if this filter is already active, if so clear it
          const isTotalPlansFilterActive =
            activeFilter?.length === 11 &&
            allStatusesExceptDiscarded.every(status => activeFilter?.includes(status)) &&
            !activeFilter?.includes(ExpenseStatus.DISCARDED) &&
            !activeFilter?.includes(ExpenseStatus.CREATED)

          if (isTotalPlansFilterActive) {
            onFilterChange(null)
          } else {
            onFilterChange(allStatusesExceptDiscarded)
          }
        }
      },
      {
        key: 'total-amount',
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.total_amount_submitted',
          'Total Amount (Submitted)'
        ),
        value: planStats.sumTotalAmount
          ? formatCurrencyDisplay(planStats.sumTotalAmount, displayCurrency)
          : formatCurrencyDisplay(0, displayCurrency),
        prefix: (
          <span className="gba:font-medium" data-testid="expense-plan-stats-total-currency-code">
            {displayCurrency}
          </span>
        ),
        color: 'var(--nw-success)',
        valueIsString: true,

        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.across_all_plans',
          'Across all plans'
        )
      }
    ]
  }, [planStats, activeFilter, handleCardClick, displayCurrency])

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError ? 'Failed to load statistics' : undefined}
      onRetry={fetchPlanStatistics}
      skeletonCount={3}
      emptyText={getTranslationFromI18nKeyAndLabel(
        'lowcoder:team_expenses_page.expense_plans_tab.no_expense_plan_statistics_available',
        'No expense plan statistics available.'
      )}
      cardBackground="transparent"
      className="gba:py-0 gba:bg-transparent"
      onWidgetClick={handleWidgetClick}
      hoverable={true}
    />
  )
}

export default ExpensePlanStatisticsDisplay
