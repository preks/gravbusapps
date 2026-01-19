import React from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { UsersIcon, TargetIcon, TrendUpIcon, TrendDownIcon, ChartLineIcon } from '@phosphor-icons/react'
import { ActivitiesStatisticsProps } from '../../types/activitiesTypes'
import { useEmployeeActivitiesStatistics } from '../../hooks/useEmployeeActivitiesStatistics'
import { useEmployeeActivitiesTrendData } from '../../hooks/useEmployeeActivitiesTrendData'

const DATA_TEST_ID_PREFIX = 'ActivitiesStatistics'

export const ActivitiesStatistics: React.FC<ActivitiesStatisticsProps> = ({
  employeeId,
  onRetry,
  accessToken,
  userInfo
}) => {
  // Fetch real activities statistics (includes totalCount)
  const { statistics, loading, error, totalCount, refetch } = useEmployeeActivitiesStatistics({
    employeeId,
    accessToken,
    userInfo, // Now passing real userInfo for proper createdBy filtering
    periodInMonths: 1 // Across all references
  })

  // Fetch trend data for real comparisons
  const { trends, refetch: refetchTrends } = useEmployeeActivitiesTrendData(accessToken, employeeId)

  // Handle retry
  const handleRetry = () => {
    refetch()
    refetchTrends()
    if (onRetry) {
      onRetry()
    }
  }

  // Helper functions for trend visualization
  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendUpIcon />
      case 'down':
        return <TrendDownIcon />
      default:
        return <ChartLineIcon />
    }
  }

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'hsl(var(--success))'
      case 'down':
        return '#ef4444'
      default:
        return '#6b7280'
    }
  }

  const getTrendDescription = (trend: 'up' | 'down' | 'stable', percentage: number, baseDescription: string) => {
    if (trend === 'stable') return `${baseDescription} • Stable vs last month`
    const direction = trend === 'up' ? 'increase' : 'decrease'
    return `${baseDescription} • ${percentage.toFixed(1)}% ${direction} vs last month`
  }

  // Transform stats data into widgets format with real trend comparisons
  const widgets: WidgetItem[] = statistics
    ? [
        {
          key: 'total-activities',
          title: 'Total Activities',
          value: statistics.totalActivities.count,
          prefix: getTrendIcon(trends.totalActivities.trend),
          color: getTrendColor(trends.totalActivities.trend),
          description: getTrendDescription(
            trends.totalActivities.trend,
            trends.totalActivities.trendPercentage,
            statistics.totalActivities.period
          ),
          trend: {
            value: `${Math.round((trends.completedActivities.currentValue / totalCount) * 100)}%`,
            positive: trends.completedActivities.currentValue / totalCount >= 0.8,
            description: 'completion rate'
          }
        },
        {
          key: 'completed-activities',
          title: 'Completed Activities',
          value: trends.completedActivities.currentValue,
          prefix: getTrendIcon(trends.completedActivities.trend),
          color: getTrendColor(trends.completedActivities.trend),
          description: getTrendDescription(
            trends.completedActivities.trend,
            trends.completedActivities.trendPercentage,
            `Execution focus`
          ),
          precision: 0,
          trend: {
            value: `${Math.round((trends.completedActivities.currentValue / totalCount) * 100)}%`,
            positive: trends.completedActivities.currentValue / totalCount >= 0.8,
            description: 'completion rate'
          }
        },
        {
          key: 'most-common-activity',
          title: 'Most Common Activity',
          value:
            trends.mostCommonActivityType.current.count === 0 ? 'No data' : trends.mostCommonActivityType.current.type,
          prefix: <UsersIcon />,
          color: '#722ed1',
          valueIsString: true,
          description:
            trends.mostCommonActivityType.current.count === 0
              ? 'No activities found'
              : `${trends.mostCommonActivityType.current.count} activities (${trends.mostCommonActivityType.current.percentage}%)`,
          trend:
            trends.mostCommonActivityType.current.count > 0
              ? {
                  value: `${trends.mostCommonActivityType.current.percentage}%`,
                  positive: trends.mostCommonActivityType.current.percentage >= 40,
                  description: 'of total activities'
                }
              : undefined
        },
        {
          key: 'most-worked-entity',
          title: 'Most Worked Entity',
          value:
            trends.mostWorkedEntityType.current.count === 0
              ? 'No data'
              : trends.mostWorkedEntityType.current.entityType,
          prefix: <TargetIcon />,
          color: '#52c41a',
          valueIsString: true,
          description:
            trends.mostWorkedEntityType.current.count === 0
              ? 'No activities found'
              : `${trends.mostWorkedEntityType.current.count} activities (${trends.mostWorkedEntityType.current.percentage}%)`,
          trend:
            trends.mostWorkedEntityType.current.count > 0
              ? {
                  value: `${trends.mostWorkedEntityType.current.percentage}%`,
                  positive: trends.mostWorkedEntityType.current.percentage >= 30,
                  description: 'focus distribution'
                }
              : undefined
        }
      ]
    : []

  return (
    <div data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <WidgetGroup
        widgets={widgets}
        isLoading={loading || trends.isLoading}
        error={error || (trends.error ? new Error(trends.error) : null)}
        onRetry={handleRetry}
        skeletonCount={4}
        emptyText="No activity statistics available."
        data-testid={`${DATA_TEST_ID_PREFIX}-widget-group`}
      />
    </div>
  )
}

export default ActivitiesStatistics
