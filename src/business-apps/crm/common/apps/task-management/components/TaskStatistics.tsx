import React from 'react';
import { WidgetGroup, WidgetItem } from '@/components/widget-group';
import { TaskStatistics as TaskStatisticsType } from '../types/TaskTypes';
import { 
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
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
  // Transform stats data into widgets format
  const widgets: WidgetItem[] = [
    {
      key: 'total-tasks',
      title: 'Total Tasks',
      value: statistics.totalTasks,
      prefix: <UserOutlined />,
      color: '#1677ff',
      description: 'All tasks in the system'
    },
    {
      key: 'in-progress',
      title: 'In Progress',
      value: statistics.inProgress,
      prefix: <ClockCircleOutlined />,
      color: '#fa8c16',
      description: 'Currently being worked on'
    },
    {
      key: 'completed',
      title: 'Completed',
      value: statistics.completed,
      prefix: <CheckCircleOutlined />,
      color: '#52c41a',
      description: 'Successfully finished'
    },
    {
      key: 'overdue',
      title: 'Overdue',
      value: statistics.overdue,
      prefix: <ExclamationCircleOutlined />,
      color: '#ff4d4f',
      description: 'Past due date'
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
        emptyText="No statistics available."
        data-testid="task-statistics"
      />
    </div>
  );
};

export default TaskStatistics; 