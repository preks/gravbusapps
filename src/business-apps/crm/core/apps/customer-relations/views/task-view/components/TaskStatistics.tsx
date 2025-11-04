import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UserOutlined, ClockCircleOutlined, CheckCircleOutlined } from '@ant-design/icons'

interface TaskStatisticItem {
  value: number
}

interface TaskStatisticsData {
  totalTasks: TaskStatisticItem
  inProgress: TaskStatisticItem
  completed: TaskStatisticItem
  overdue: TaskStatisticItem
}

interface TaskStatisticsProps {
  myTasksStatistics: TaskStatisticsData
  teamTasksStatistics: TaskStatisticsData
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

const TaskStatistics: React.FC<TaskStatisticsProps> = ({
  myTasksStatistics,
  teamTasksStatistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Combine my tasks and team tasks statistics for widgets
  const widgets: WidgetItem[] = [
    {
      key: 'my-total-tasks',
      title: 'My Tasks',
      value: myTasksStatistics.totalTasks.value,
      prefix: <UserOutlined />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Tasks assigned to me'
    },
    {
      key: 'my-in-progress',
      title: 'My In Progress',
      value: myTasksStatistics.inProgress.value,
      prefix: <ClockCircleOutlined />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'My tasks in progress'
    },
    {
      key: 'team-total-tasks',
      title: 'Team Tasks',
      value: teamTasksStatistics.totalTasks.value,
      prefix: <UserOutlined />,
      color: '#722ed1',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All team tasks'
    },
    {
      key: 'team-completed',
      title: 'Team Completed',
      value: teamTasksStatistics.completed.value,
      prefix: <CheckCircleOutlined />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Team tasks completed'
    }
  ]

  return (
    <div data-testid="task-statistics-container" className="gba:flex gba:gap-4 gba:mb-6">
      {/* My Tasks Card */}
      <Card className="gba:flex-1 gba:p-6 gba:min-h-[160px]">
        {renderCardContent('My Tasks', <User className="gba:text-blue-500" />, myTasks)}
      </Card>

      {/* Team Tasks Card */}
      <Card className="gba:flex-1 gba:p-6 gba:min-h-[160px]">
        {renderCardContent('Team Tasks', <Users className="gba:text-blue-500" />, teamTasks)}
      </Card>
    </div>
  )
}

export default TaskStatistics
