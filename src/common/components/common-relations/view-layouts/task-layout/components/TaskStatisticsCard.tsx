import React, { useMemo } from 'react'
import { UserIcon, ClockIcon, CheckCircleIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'

export interface TaskStatisticItem {
  value: number
  changePercent: number
  isPositive: boolean
}

export interface TaskStatisticsData {
  totalTasks: TaskStatisticItem
  inProgress: TaskStatisticItem
  completed: TaskStatisticItem
  overdue: TaskStatisticItem
}

export interface TaskStatisticsCardProps {
  statistics: TaskStatisticsData
  isLoading?: boolean
  error?: Error | null
  onRetry?: () => void
}

/**
 * Task Statistics Card Component
 * Displays 4 task KPIs using WidgetGroup following the EXACT pattern as LeadStatisticsLayout
 * Consistent with the rest of the Investment and Customer Relations KPI displays
 */
export const TaskStatisticsCard: React.FC<TaskStatisticsCardProps> = ({
  statistics,
  isLoading = false,
  error = null,
  onRetry
}) => {
  // Helper function to format trend percentage with proper sign (same as LeadStatisticsLayout)
  const formatTrendPercent = (changePercent: number): string => {
    const sign = changePercent >= 0 ? '+' : ''
    return `${sign}${changePercent.toFixed(1)}%`
  }

  // Transform statistics into WidgetItems following LeadStatisticsLayout pattern
  const widgets: WidgetItem[] = useMemo(
    () => [
      {
        key: 'total-tasks',
        title: 'Total Tasks',
        value: statistics.totalTasks.value,
        prefix: <UserIcon size={16} />,
        color: '#1677ff',
        span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
        description: 'All assigned tasks',
        trend: {
          value: formatTrendPercent(statistics.totalTasks.changePercent),
          positive: statistics.totalTasks.isPositive,
          description: 'vs last week'
        }
      },
      {
        key: 'in-progress',
        title: 'In Progress',
        value: statistics.inProgress.value,
        prefix: <ClockCircleOutlined />,
        color: '#faad14',
        span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
        description: 'Currently active tasks',
        trend: {
          value: formatTrendPercent(statistics.inProgress.changePercent),
          positive: statistics.inProgress.isPositive,
          description: 'vs last week'
        }
      },
      {
        key: 'completed',
        title: 'Completed',
        value: statistics.completed.value,
        prefix: <CheckCircleIcon size={16} />,
        color: '#52c41a',
        span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
        description: 'Successfully finished',
        trend: {
          value: formatTrendPercent(statistics.completed.changePercent),
          positive: statistics.completed.isPositive,
          description: 'vs last week'
        }
      },
      {
        key: 'overdue',
        title: 'Overdue',
        value: statistics.overdue.value,
        prefix: <WarningCircleIcon size={16} />,
        color: '#ff4d4f',
        span: { xs: 24, sm: 12, md: 8, lg: 5, xl: 5 },
        description: 'Past due date',
        trend: {
          value: formatTrendPercent(statistics.overdue.changePercent),
          positive: statistics.overdue.isPositive,
          description: 'vs last week'
        }
      }
    ],
    [statistics]
  )

  return (
    <div data-testid="task-statistics-card">
      <WidgetGroup widgets={widgets} isLoading={isLoading} error={error} onRetry={onRetry} skeletonCount={4} />
    </div>
  )
}

export default TaskStatisticsCard
