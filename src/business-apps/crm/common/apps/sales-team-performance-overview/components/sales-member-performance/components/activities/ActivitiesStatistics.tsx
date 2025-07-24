import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { 
  PiChartBar,
  PiUsers,
  PiTarget,
  PiTrophy
} from 'react-icons/pi';
import { ActivitiesStatisticsProps } from '../../types/activitiesTypes';
import { useEmployeeActivitiesStatistics } from '../../hooks/useEmployeeActivitiesStatistics';

const DATA_TEST_ID_PREFIX = 'ActivitiesStatistics';

export const ActivitiesStatistics: React.FC<ActivitiesStatisticsProps> = ({
  employeeId,
  onRetry,
  accessToken,
  ...context
}) => {
  // Fetch real activities statistics
  const { statistics, loading, error, refetch } = useEmployeeActivitiesStatistics({
    employeeId,
    accessToken,
    periodInMonths: 1 // Across all references
  });

  // Handle retry
  const handleRetry = () => {
    refetch();
    if (onRetry) {
      onRetry();
    }
  };

  // Transform stats data into widgets format
  const widgets: WidgetItem[] = statistics ? [
    {
      key: 'total-activities',
      title: 'Total Activities',
      value: statistics.totalActivities.count,
      prefix: <PiChartBar />,
      color: '#1890ff',
      description: statistics.totalActivities.period
    },
    {
      key: 'most-common-activity',
      title: 'Most Common Activity',
      value: statistics.totalActivities.count === 0 ? 'No data' : statistics.mostCommonActivity.type,
      prefix: <PiUsers />,
      color: '#722ed1',
      valueIsString: true,
      description: statistics.totalActivities.count === 0 ? 'No activities found' : `${statistics.mostCommonActivity.count} activities`
    },
    {
      key: 'most-worked-entity',
      title: 'Most Worked Entity',
      value: statistics.totalActivities.count === 0 ? 'No data' : statistics.mostWorkedEntity.entityType,
      prefix: <PiTarget />,
      color: '#52c41a',
      valueIsString: true,
      description: statistics.totalActivities.count === 0 ? 'No activities found' : `${statistics.mostWorkedEntity.count} activities`
    },
    {
      key: 'average-activity-score',
      title: 'Average Activity Score',
      value: statistics.averageActivityScore.score,
      prefix: <PiTrophy />,
      color: '#fa8c16',
      suffix: '%',
      description: 'Performance rating'
    }
  ] : [];

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={loading}
        error={error}
        onRetry={handleRetry}
        skeletonCount={4}
        emptyText="No activity statistics available."
        data-testid={`${DATA_TEST_ID_PREFIX}-widget-group`}
      />
    </div>
  );
};

export default ActivitiesStatistics; 