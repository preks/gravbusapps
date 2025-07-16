import React, { useCallback, useMemo } from 'react';
import { PiCalendar, PiFileText, PiCurrencyEur } from 'react-icons/pi';
import { ExpensePlanStatistics } from '../../../hooks/useGetExpensePlans'; // Assuming this type is exported from your hook
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { formatNumberFunction } from '@/common/utils/windowUtils';
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils';
import { formatCurrency } from '../../../utils/currencyUtils';
// Local definition of ExpenseStatus
enum ExpenseStatus {
  PREPARED = "PREPARED",
  CREATED = "CREATED",
  ASSIGNED = "ASSIGNED",
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  RETURNED = "RETURNED",
  REJECTED = "REJECTED",
  VERIFIED = "VERIFIED",
  BOOKED = "BOOKED",
  PAID = "PAID",
  CLOSED = "CLOSED",
  DISCARDED = "DISCARDED",
  TRANSFERRED = "TRANSFERRED",
}

interface ExpensePlanStatisticsProps {
  planStats: ExpensePlanStatistics | null;
  statsLoading: boolean;
  statsError: Error | null;
  fetchPlanStatistics: () => void;
  activeFilter: ExpenseStatus | null;
  onFilterChange: (filter: ExpenseStatus | null) => void;
}

const ExpensePlanStatisticsDisplay: React.FC<ExpensePlanStatisticsProps> = ({
  planStats,
  statsLoading,
  statsError,
  fetchPlanStatistics,
  activeFilter,
  onFilterChange,
}) => {
  // Handle card click
  const handleCardClick = useCallback((filterKey: ExpenseStatus | null) => {
    if (activeFilter === filterKey) {
      onFilterChange(null); // Toggle off if already active
    } else {
      onFilterChange(filterKey);
    }
  }, [activeFilter, onFilterChange]);

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = useMemo(() => {
    if (!planStats) return [];
    
    return [
      {
        key: 'pending-approval',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.pending_approval', 'Pending Approval'),
        value: planStats.pendingCount,
        prefix: <PiCalendar />,
        color: activeFilter === ExpenseStatus.PENDING ? '#1890ff' : '#faad14',
        span: { xs: 24, sm: 6 },
        description: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.requires_action', 'Requires action'),
        onClick: () => handleCardClick(ExpenseStatus.PENDING)
      },
      {
        key: 'pending-amount',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.pending_amount', 'Pending Amount'),
        value: planStats.pendingAmount ? formatCurrency(planStats.pendingAmount, 'EUR') : 'EUR 0,00',
        prefix: <PiCurrencyEur />,
        color: '#faad14',
        valueIsString: true,
        span: { xs: 24, sm: 6 },
        description: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.awaiting_approval', 'Awaiting approval')
      },
      {
        key: 'total-plans',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.total_plans_submitted', 'Total Plans (Submitted)'),
        value: planStats.totalCount,
        prefix: <PiFileText />,
        color: '#1890ff',
        span: { xs: 24, sm: 6 },
        description: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.all_submitted_plans', 'All submitted plans')
      },
      {
        key: 'total-amount',
        title: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.total_amount_submitted', 'Total Amount (Submitted)'),
        value: planStats.sumTotalAmount ? formatCurrency(planStats.sumTotalAmount, 'EUR') : 'EUR 0,00',
        prefix: <PiCurrencyEur />,
        color: '#3f8600',
        valueIsString: true,
        span: { xs: 24, sm: 6 },
        description: getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.across_all_plans', 'Across all plans')
      }
    ];
  }, [planStats, activeFilter, handleCardClick]);

  if (statsError) {
    console.error('Error loading expense plan statistics:', statsError);
  }

  return (
      <WidgetGroup
        widgets={widgets}
        isLoading={statsLoading}
        error={statsError ? 'Failed to load statistics' : undefined}
        onRetry={fetchPlanStatistics}
        skeletonCount={4}
        emptyText= {getTranslationFromI18nKeyAndLabel('lowcoder:team_expenses_page.expense_plans_tab.no_expense_plan_statistics_available', 'No expense plan statistics available.')}
        cardBackground="transparent"
        className="gba:py-0"
      />
  );

};

export default ExpensePlanStatisticsDisplay;
