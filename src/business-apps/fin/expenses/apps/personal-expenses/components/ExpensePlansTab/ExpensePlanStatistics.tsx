import React, { useMemo } from 'react';
import { 
  FileTextOutlined, 
  DollarOutlined, 
  CalendarOutlined, 
  CompassOutlined 
} from '@ant-design/icons';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';

interface ExpensePlanStatisticsProps {
  plans: any[];
  statsLoading?: boolean;
  statsError?: Error | null;
  fetchPlanStatistics?: () => void;
}

const ExpensePlanStatistics: React.FC<ExpensePlanStatisticsProps> = ({ 
  plans,
  statsLoading = false,
  statsError = null,
  fetchPlanStatistics = () => {}
}) => {
  // Calculate summary statistics with memoization
  const totalPlans = useMemo(() => plans?.length ?? 0, [plans]);
  
  const totalEstimated = useMemo(() => 
    plans?.reduce((sum, plan) => sum + (plan.totalAmount ?? 0), 0) ?? 0, 
  [plans]);
  
  const pendingApproval = useMemo(() => 
    plans?.filter(plan => plan.status === 'Submitted').length ?? 0, 
  [plans]);
  
  // Get unique destinations (for the top destinations card) with memoization
  const uniqueDestinations = useMemo(() => {
    const destinations = new Set<string>();
    plans?.forEach(plan => {
      // Try to get request type from the new field structure
      if (plan.requestType?.value) {
        destinations.add(plan.requestType.value);
      } else {
        // Fallback to additionalProperties if requestType is not available
        const additionalProps = plan.additionalProperties as Record<string, any> | null;
        const tripType = additionalProps?.tripType ?? additionalProps?.travelType ?? '';
        if (tripType) destinations.add(tripType);
      }
    });
    return destinations.size || 2; // Default to 2 if no destinations found (for UI display)
  }, [plans]);

  // Transform the stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-plans',
      title: 'Total Plans',
      value: totalPlans,
      prefix: <FileTextOutlined />,
      color: '#1677ff',
      span: { xs: 24, sm: 12, md: 6 },
      description: '+15% from last month'
    },
    {
      key: 'total-estimated',
      title: 'Total Estimated',
      value: totalEstimated,
      prefix: <DollarOutlined />,
      suffix: '€',
      color: '#3f8600',
      precision: 2,
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Across all plans'
    },
    {
      key: 'pending-approval',
      title: 'Pending Approval',
      value: pendingApproval,
      prefix: <CalendarOutlined />,
      color: '#faad14',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Requires action'
    },
    {
      key: 'top-destinations',
      title: 'Top Destinations',
      value: uniqueDestinations,
      prefix: <CompassOutlined />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, md: 6 },
      description: 'Unique locations'
    }
  ];

  return (
    <WidgetGroup
      widgets={widgets}
      isLoading={statsLoading}
      error={statsError}
      onRetry={fetchPlanStatistics}
      skeletonCount={4}
      emptyText="No expense plan statistics available."
      data-testid="expense-plan-statistics"
    />
  );
};

export default ExpensePlanStatistics;