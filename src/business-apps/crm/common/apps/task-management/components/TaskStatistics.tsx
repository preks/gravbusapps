import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { TaskStatistics as TaskStatisticsType } from '../types/TaskTypes';
import { 
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined
} from '@ant-design/icons';

interface TaskStatisticsProps {
  statistics: TaskStatisticsType;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const TaskStatistics: React.FC<TaskStatisticsProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Helper function to format trend percentage with proper sign
  const formatTrendPercent = (growth?: number): string => {
    if (growth === undefined || growth === null) return '0.0%';
    const sign = growth >= 0 ? '+' : '';
    return `${sign}${growth.toFixed(1)}%`;
  };

  // Helper function to determine if trend is positive (with special logic for overdue)
  const isTrendPositive = (growthDirection?: 'up' | 'down' | 'stable', key?: string): boolean => {
    if (!growthDirection || growthDirection === 'stable') return false;
    
    // For overdue tasks, down trend is positive (fewer overdue tasks is good)
    if (key === 'overdue') {
      return growthDirection === 'down';
    }
    
    // For completed tasks, up trend is positive 
    if (key === 'completed') {
      return growthDirection === 'up';
    }
    
    // For total and in-progress, up trend is generally positive
    return growthDirection === 'up';
  };

  // Transform the statistics data into widgets format with trend information
  const widgets: WidgetItem[] = [
    {
      key: 'total-tasks',
      title: 'Total Tasks',
      value: statistics.totalTasks.value,
      prefix: <UserOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All tasks in the system',
      trend: statistics.totalTasks.growth !== undefined ? {
        value: formatTrendPercent(statistics.totalTasks.growth),
        positive: isTrendPositive(statistics.totalTasks.growthDirection, 'total-tasks'),
        description: 'vs 30 days ago'
      } : undefined
    },
    {
      key: 'in-progress',
      title: 'In Progress',
      value: statistics.inProgress.value,
      prefix: <ClockCircleOutlined />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently being worked on',
      trend: statistics.inProgress.growth !== undefined ? {
        value: formatTrendPercent(statistics.inProgress.growth),
        positive: isTrendPositive(statistics.inProgress.growthDirection, 'in-progress'),
        description: 'vs 30 days ago'
      } : undefined
    },
    {
      key: 'completed',
      title: 'Completed',
      value: statistics.completed.value,
      prefix: <CheckCircleOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Successfully finished',
      trend: statistics.completed.growth !== undefined ? {
        value: formatTrendPercent(statistics.completed.growth),
        positive: isTrendPositive(statistics.completed.growthDirection, 'completed'),
        description: 'vs 30 days ago'
      } : undefined
    },
    {
      key: 'overdue',
      title: 'Overdue',
      value: statistics.overdue.value,
      prefix: <WarningOutlined />,
      color: '#ff4d4f',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Past due date',
      trend: statistics.overdue.growth !== undefined ? {
        value: formatTrendPercent(statistics.overdue.growth),
        positive: isTrendPositive(statistics.overdue.growthDirection, 'overdue'),
        description: 'vs 30 days ago'
      } : undefined
    }
  ];

  return (
    <div data-testid="task-statistics-container">
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={onRetry}
        skeletonCount={4}
        emptyText="No task statistics available."
        data-testid="task-statistics"
      />
    </div>
  );
};

export default TaskStatistics; 