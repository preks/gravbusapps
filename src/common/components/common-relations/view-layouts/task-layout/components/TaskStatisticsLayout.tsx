import React, { useMemo } from 'react'
import { Card } from '@newwork/nw-design-system'
import { UserIcon, ClockIcon, CheckCircleIcon, WarningIcon, UsersIcon } from '@phosphor-icons/react'

export interface TaskStatisticItem {
  value: number
}

export interface TaskStatisticsData {
  totalTasks: TaskStatisticItem
  inProgress: TaskStatisticItem
  completed: TaskStatisticItem
  overdue: TaskStatisticItem
}

export interface TaskStatisticsLayoutProps {
  myTasksStatistics: TaskStatisticsData
  teamTasksStatistics: TaskStatisticsData
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

interface StatItemProps {
  icon: React.ReactNode
  label: string
  value: number
  colorClass: string
}

const StatItem: React.FC<StatItemProps> = ({ icon, label, value, colorClass }) => (
  <div className="gba:flex gba:flex-col gba:items-center gba:text-center gba:px-2">
    <div className="gba:flex gba:items-center gba:gap-1 gba:mb-1">
      {icon}
      <span className={`gba:text-2xl gba:font-bold ${colorClass}`}>{value}</span>
    </div>
    <span className="gba:text-xs gba:text-gray-600 gba:leading-tight">{label}</span>
  </div>
)

const LoadingSkeleton: React.FC = () => (
  <div className="gba:animate-pulse">
    <div className="gba:h-6 gba:bg-gray-200 gba:rounded gba:mb-4"></div>
    <div className="gba:grid gba:grid-cols-4 gba:gap-4">
      {Array.from({ length: 4 }, (_, index) => index).map(skeletonIndex => (
        <div
          key={`skeleton-${skeletonIndex}`}
          className="gba:flex gba:flex-col gba:items-center gba:text-center gba:px-2"
        >
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

interface ErrorContentProps {
  onRetry?: () => void
}

const ErrorContent: React.FC<ErrorContentProps> = ({ onRetry }) => (
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

interface DataContentProps {
  title: string
  icon: React.ReactNode
  statistics: TaskStatisticsData
}

const DataContent: React.FC<DataContentProps> = ({ title, icon, statistics }) => (
  <>
    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
      {icon}
      <h3 className="gba:text-lg gba:font-semibold gba:text-gray-800">{title}</h3>
    </div>
    <div className="gba:grid gba:grid-cols-4 gba:gap-4">
      <StatItem
        icon={<UserIcon className="gba:text-info" />}
        label="Total Tasks"
        value={statistics.totalTasks.value}
        colorClass="gba:text-info"
      />
      <StatItem
        icon={<ClockIcon className="gba:text-WarningIcon" />}
        label="In Progress"
        value={statistics.inProgress.value}
        colorClass="gba:text-WarningIcon"
      />
      <StatItem
        icon={<CheckCircleIcon className="gba:text-success" />}
        label="Completed"
        value={statistics.completed.value}
        colorClass="gba:text-success"
      />
      <StatItem
        icon={<WarningIcon className="gba:text-destructive" />}
        label="Overdue"
        value={statistics.overdue.value}
        colorClass="gba:text-destructive"
      />
    </div>
  </>
)

/**
 * TaskStatisticsLayout
 * Shared statistics component for task views (CRM + IRM)
 * Two-card layout with My Tasks and Team Tasks
 */
export const TaskStatisticsLayout: React.FC<TaskStatisticsLayoutProps> = ({
  myTasksStatistics,
  teamTasksStatistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Memoize My Tasks card content to prevent unnecessary re-renders
  const myTasksContent = useMemo(() => {
    if (isLoading) return <LoadingSkeleton />
    if (error) return <ErrorContent onRetry={onRetry} />
    return (
      <DataContent title="My Tasks" icon={<UserIcon className="gba:text-blue-500" />} statistics={myTasksStatistics} />
    )
  }, [isLoading, error, onRetry, myTasksStatistics])

  // Memoize Team Tasks card content to prevent unnecessary re-renders
  const teamTasksContent = useMemo(() => {
    if (isLoading) return <LoadingSkeleton />
    if (error) return <ErrorContent onRetry={onRetry} />
    return (
      <DataContent
        title="Team Tasks"
        icon={<UsersIcon className="gba:text-blue-500" />}
        statistics={teamTasksStatistics}
      />
    )
  }, [isLoading, error, onRetry, teamTasksStatistics])

  return (
    <div data-testid="task-statistics-layout-container" className="gba:flex gba:gap-4 gba:mb-6">
      {/* My Tasks Card */}
      <Card className="gba:flex-1 gba:p-6 gba:min-h-[160px]">{myTasksContent}</Card>

      {/* Team Tasks Card */}
      <Card className="gba:flex-1 gba:p-6 gba:min-h-[160px]">{teamTasksContent}</Card>
    </div>
  )
}
