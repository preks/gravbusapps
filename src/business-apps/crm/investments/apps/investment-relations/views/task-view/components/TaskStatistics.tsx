import React from 'react';
import { Card } from '@newwork/nw-design-system';
import { 
  UserOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  TeamOutlined
} from '@ant-design/icons';

interface TaskStatisticsData {
  totalTasks: { value: number };
  inProgress: { value: number };
  completed: { value: number };
  overdue: { value: number };
}

interface TaskStatisticsProps {
  myTasksStatistics: TaskStatisticsData;
  teamTasksStatistics: TaskStatisticsData;
  isLoading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
}

const TaskStatistics: React.FC<TaskStatisticsProps> = ({ 
  myTasksStatistics, 
  teamTasksStatistics, 
  isLoading = false, 
  error = null, 
  onRetry 
}) => {
  if (isLoading) {
    return (
      <div data-testid="task-statistics-container" className="gba:flex gba:gap-4 gba:mb-6">
        <Card className="gba:flex-1 gba:p-6">
          <div className="gba:animate-pulse">
            <div className="gba:h-6 gba:bg-gray-200 gba:rounded gba:mb-4"></div>
            <div className="gba:space-y-3">
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
            </div>
          </div>
        </Card>
        <Card className="gba:flex-1 gba:p-6">
          <div className="gba:animate-pulse">
            <div className="gba:h-6 gba:bg-gray-200 gba:rounded gba:mb-4"></div>
            <div className="gba:space-y-3">
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:h-4 gba:bg-gray-200 gba:rounded"></div>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div data-testid="task-statistics-container" className="gba:flex gba:gap-4 gba:mb-6">
        <Card className="gba:flex-1 gba:p-6">
          <div className="gba:text-center gba:text-red-500">
            <p>Error loading statistics</p>
            {onRetry && (
              <button 
                onClick={onRetry}
                className="gba:mt-2 gba:px-4 gba:py-2 gba:bg-blue-500 gba:text-white gba:rounded gba:hover:bg-blue-600"
              >
                Retry
              </button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  const StatItem = ({ 
    icon, 
    label, 
    value, 
    colorClass 
  }: { 
    icon: React.ReactNode; 
    label: string; 
    value: number; 
    colorClass: string; 
  }) => (
    <div className="gba:flex gba:flex-col gba:items-center gba:text-center gba:px-2">
      <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
        {icon}
        <span className={`gba:text-2xl gba:font-bold ${colorClass}`}>
          {value}
        </span>
      </div>
      <span className="gba:text-xs gba:text-gray-600 gba:leading-tight">
        {label}
      </span>
    </div>
  );

  return (
    <div data-testid="task-statistics-container" className="gba:flex gba:gap-4 gba:mb-6">
      {/* My Tasks Card */}
      <Card className="gba:flex-1 gba:p-6">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <UserOutlined className="gba:text-blue-500" />
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800">My Tasks</h3>
        </div>
        <div className="gba:grid gba:grid-cols-4 gba:gap-4">
          <StatItem
            icon={<UserOutlined className="gba:text-info" />}
            label="Total Tasks"
            value={myTasksStatistics.totalTasks.value}
            colorClass="gba:text-info"
          />
          <StatItem
            icon={<ClockCircleOutlined className="gba:text-warning" />}
            label="In Progress"
            value={myTasksStatistics.inProgress.value}
            colorClass="gba:text-warning"
          />
          <StatItem
            icon={<CheckCircleOutlined className="gba:text-success" />}
            label="Completed"
            value={myTasksStatistics.completed.value}
            colorClass="gba:text-success"
          />
          <StatItem
            icon={<WarningOutlined className="gba:text-destructive" />}
            label="Overdue"
            value={myTasksStatistics.overdue.value}
            colorClass="gba:text-destructive"
          />
        </div>
      </Card>

      {/* Team Tasks Card */}
      <Card className="gba:flex-1 gba:p-6">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
          <TeamOutlined className="gba:text-blue-500" />
          <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800">Team Tasks</h3>
        </div>
        <div className="gba:grid gba:grid-cols-4 gba:gap-4">
          <StatItem
            icon={<TeamOutlined className="gba:text-info" />}
            label="Total Tasks"
            value={teamTasksStatistics.totalTasks.value}
            colorClass="gba:text-info"
          />
          <StatItem
            icon={<ClockCircleOutlined className="gba:text-warning" />}
            label="In Progress"
            value={teamTasksStatistics.inProgress.value}
            colorClass="gba:text-warning"
          />
          <StatItem
            icon={<CheckCircleOutlined className="gba:text-success" />}
            label="Completed"
            value={teamTasksStatistics.completed.value}
            colorClass="gba:text-success"
          />
          <StatItem
            icon={<WarningOutlined className="gba:text-destructive" />}
            label="Overdue"
            value={teamTasksStatistics.overdue.value}
            colorClass="gba:text-destructive"
          />
        </div>
      </Card>
    </div>
  );
};

export default TaskStatistics;

