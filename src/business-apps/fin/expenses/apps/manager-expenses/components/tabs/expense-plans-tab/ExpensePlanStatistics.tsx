import React, { useCallback, useMemo } from 'react';
import { CalendarOutlined, FileOutlined, DollarOutlined } from '@ant-design/icons';
import { ExpensePlanStatistics } from '../../../hooks/useGetExpensePlans'; // Assuming this type is exported from your hook
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { formatAmount } from '../../../utils/currencyUtils';
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
        title: 'Pending Approval',
        value: planStats.pendingCount,
        prefix: <CalendarOutlined />,
        color: activeFilter === ExpenseStatus.PENDING ? '#1890ff' : '#faad14',
        span: { xs: 24, sm: 6 },
        description: 'Requires action',
        onClick: () => handleCardClick(ExpenseStatus.PENDING)
      },
      {
        key: 'pending-amount',
        title: 'Pending Amount',
        value: planStats.pendingAmount ? formatAmount(planStats.pendingAmount) : '0,00',
        prefix: <DollarOutlined />,
        suffix: '€',
        color: '#faad14',
        valueIsString: true,
        span: { xs: 24, sm: 6 },
        description: 'Awaiting approval'
      },
      {
        key: 'total-plans',
        title: 'Total Plans (Submitted)',
        value: planStats.totalCount,
        prefix: <FileOutlined />,
        color: '#1890ff',
        span: { xs: 24, sm: 6 },
        description: 'All submitted plans'
      },
      {
        key: 'total-amount',
        title: 'Total Amount (Submitted)',
        value: planStats.sumTotalAmount ? formatAmount(planStats.sumTotalAmount) : '0,00',
        prefix: <DollarOutlined />,
        suffix: '€',
        color: '#3f8600',
        valueIsString: true,
        span: { xs: 24, sm: 6 },
        description: 'Across all plans'
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
        emptyText="No expense plan statistics available."
        cardBackground="transparent"
      />
  );

};

export default ExpensePlanStatisticsDisplay;
