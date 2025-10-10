import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { User, Clock, CheckCircle, Warning, Users } from '@phosphor-icons/react'

interface TaskStatisticsData {
  totalTasks: { value: number }
  inProgress: { value: number }
  completed: { value: number }
  overdue: { value: number }
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
  const StatItem = ({
    icon,
    label,
    value,
    colorClass
  }: {
    icon: React.ReactNode
    label: string
    value: number
    colorClass: string
  }) => (
    <div className="gba:flex gba:flex-col gba:items-center gba:text-center gba:px-2">
      <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
        {icon}
        <span className={`gba:text-2xl gba:font-bold ${colorClass}`}>{value}</span>
      </div>
      <span className="gba:text-xs gba:text-gray-600 gba:leading-tight">{label}</span>
    </div>
  )

  const LoadingSkeleton = () => (
    <div className="gba:animate-pulse">
      <div className="gba:h-6 gba:bg-gray-200 gba:rounded gba:mb-4"></div>
      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="gba:flex gba:flex-col gba:items-center gba:text-center gba:px-2">
            <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
              <div className="gba:w-5 gba:h-5 gba:bg-gray-200 gba:rounded"></div>
              <div className="gba:w-8 gba:h-8 gba:bg-gray-200 gba:rounded"></div>
            </div>
            <div className="gba:w-16 gba:h-3 gba:bg-gray-200 gba:rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )

  const ErrorContent = () => (
    <div className="gba:flex gba:items-center gba:justify-center gba:h-full gba:min-h-[120px]">
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
    </div>
  )

  const DataContent = ({
    title,
    icon,
    statistics
  }: {
    title: string
    icon: React.ReactNode
    statistics: TaskStatisticsData
  }) => (
    <>
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        {icon}
        <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800">{title}</h3>
      </div>
      <div className="gba:grid gba:grid-cols-4 gba:gap-4">
        <StatItem
          icon={<User className="gba:text-info" />}
          label="Total Tasks"
          value={statistics.totalTasks.value}
          colorClass="gba:text-info"
        />
        <StatItem
          icon={<Clock className="gba:text-warning" />}
          label="In Progress"
          value={statistics.inProgress.value}
          colorClass="gba:text-warning"
        />
        <StatItem
          icon={<CheckCircle className="gba:text-success" />}
          label="Completed"
          value={statistics.completed.value}
          colorClass="gba:text-success"
        />
        <StatItem
          icon={<Warning className="gba:text-destructive" />}
          label="Overdue"
          value={statistics.overdue.value}
          colorClass="gba:text-destructive"
        />
      </div>
    </>
  )

  const renderCardContent = (title: string, icon: React.ReactNode, statistics: TaskStatisticsData) => {
    if (isLoading) return <LoadingSkeleton />
    if (error) return <ErrorContent />
    return <DataContent title={title} icon={icon} statistics={statistics} />
  }

  return (
    <div data-testid="task-statistics-container" className="gba:flex gba:gap-4 gba:mb-6">
      {/* My Tasks Card */}
      <Card className="gba:flex-1 gba:p-6 gba:min-h-[160px]">
        {renderCardContent('My Tasks', <User className="gba:text-blue-500" />, myTasksStatistics)}
      </Card>

      {/* Team Tasks Card */}
      <Card className="gba:flex-1 gba:p-6 gba:min-h-[160px]">
        {renderCardContent('Team Tasks', <Users className="gba:text-blue-500" />, teamTasksStatistics)}
      </Card>
    </div>
  )
}

export default TaskStatistics
