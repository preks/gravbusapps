import React, { useCallback, useMemo } from 'react'
import { WidgetItem } from '@/components/widget-group'
import ManagerClickableWidgetGroup from '../../ManagerClickableWidgetGroup'
import { CalendarIcon, CurrencyDollarIcon, FileTextIcon } from '@phosphor-icons/react'
import { ExpenseStatus } from '../../../utils'
import { formatCurrencyDisplay } from '../../../../personal-expenses/utils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { ExpensePlanStatistics } from '../../../hooks/useGetExpensePlans' // Assuming this type is exported from your hook

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
        title: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.pending_approval',
          'Pending Approval'
        ),
        value: planStats.pendingCount.toString(),
        prefix: (
          <span className="gba:flex gba:items-center gba:gap-1.5">
            <CalendarIcon size={16} />
            <span className="gba:font-medium">{displayCurrency}</span>
          </span>
        ),
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
        prefix: (
          <span className="gba:flex gba:items-center gba:gap-1.5">
            <FileTextIcon size={16} />
            <span className="gba:font-medium">{displayCurrency}</span>
          </span>
        ),
        color: 'var(--nw-primary)',
        valueIsString: true,
        description: getTranslationFromI18nKeyAndLabel(
          'lowcoder:team_expenses_page.expense_plans_tab.all_submitted_plans',
          'All submitted plans'
        ),
        active: !!(
          activeFilter?.length === 9 &&
          [
            ExpenseStatus.PREPARED,
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
            ExpenseStatus.PREPARED,
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
            activeFilter?.length === 9 && submittedStatuses.every(status => activeFilter?.includes(status))
          if (isTotalPlansFilterActive) {
            onFilterChange(null)
          } else {
            onFilterChange(submittedStatuses)
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
        prefix: <CurrencyDollarIcon size={16} data-testid="expense-plan-stats-total-amount-icon" />,
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
    <ManagerClickableWidgetGroup
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
      hoverable={true}
      data-testid="expense-plans-stats"
    />
  )
}

export default ExpensePlanStatisticsDisplay
