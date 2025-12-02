import React, { useMemo } from 'react'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTeamMember } from '../../sales-members-list/types'
import { PiUsers, PiChartLine, PiTrendUp, PiCalendar } from 'react-icons/pi'

const DATA_TEST_ID_PREFIX = 'TeamActivitiesStatistics'

interface ActivityTypeAggregate {
  activityType: string
  count: number
}

interface TeamActivitiesStatisticsProps extends BusinessAppContextProps {
  teamMembers: SalesTeamMember[]
  activityTypeAggregates: ActivityTypeAggregate[]
  totalActivities: number
  totalActivitiesLast30Days: number
  thisWeekActivities: number
  thisWeekActivitiesLast30Days: number
  loading: boolean
  error: string | null
  retry: () => void
}

export const TeamActivitiesStatistics: React.FC<TeamActivitiesStatisticsProps> = ({
  teamMembers,
  activityTypeAggregates,
  totalActivities,
  totalActivitiesLast30Days,
  thisWeekActivities,
  thisWeekActivitiesLast30Days,
  loading,
  error,
  retry
}) => {
  // Data is passed from parent component (TeamPerformanceView)

  // Calculate trends (percentage change vs last 30 days)
  const calculateTrend = (current: number, previous: number): { value: string; positive: boolean } => {
    if (previous === 0) {
      return {
        value: current > 0 ? '+100%' : '0%',
        positive: current > 0
      }
    }

    const change = ((current - previous) / previous) * 100
    const positive = change >= 0

    return {
      value: `${positive ? '+' : ''}${change.toFixed(1)}%`,
      positive
    }
  }

  // Calculate team statistics using aggregates
  const teamStats = useMemo(() => {
    if (!activityTypeAggregates.length && totalActivities === 0) {
      return {
        totalActivities: 0,
        totalActivitiesTrend: calculateTrend(0, 0),
        thisWeekActivities: 0,
        thisWeekActivitiesTrend: calculateTrend(0, 0),
        avgPerMember: 0,
        avgPerMemberTrend: calculateTrend(0, 0),
        mostActiveType: 'N/A'
      }
    }

    const mostActiveType =
      activityTypeAggregates.length > 0
        ? activityTypeAggregates.toSorted((a, b) => b.count - a.count)[0].activityType
        : 'N/A'

    const avgPerMember = teamMembers.length > 0 ? totalActivities / teamMembers.length : 0
    const avgPerMemberLast30Days = teamMembers.length > 0 ? totalActivitiesLast30Days / teamMembers.length : 0

    return {
      totalActivities,
      totalActivitiesTrend: calculateTrend(totalActivities, totalActivitiesLast30Days),
      thisWeekActivities,
      thisWeekActivitiesTrend: calculateTrend(thisWeekActivities, thisWeekActivitiesLast30Days),
      avgPerMember,
      avgPerMemberTrend: calculateTrend(avgPerMember, avgPerMemberLast30Days),
      mostActiveType
    }
  }, [
    activityTypeAggregates,
    totalActivities,
    totalActivitiesLast30Days,
    thisWeekActivities,
    thisWeekActivitiesLast30Days,
    teamMembers.length
  ])

  // Create widget items for statistics
  const createStatisticsWidgets = (): WidgetItem[] => [
    {
      key: 'total-activities',
      title: 'Total Activities',
      value: teamStats.totalActivities,
      prefix: <PiChartLine />,
      color: '#1677ff',
      description: 'All team activities recorded',
      precision: 0,
      trend: {
        value: teamStats.totalActivitiesTrend.value,
        positive: teamStats.totalActivitiesTrend.positive,
        description: 'vs last 30 days'
      }
    },
    {
      key: 'this-week-activities',
      title: 'This Week',
      value: teamStats.thisWeekActivities,
      prefix: <PiTrendUp />,
      color: '#52c41a',
      description: 'Activities created this week',
      precision: 0,
      trend: {
        value: teamStats.thisWeekActivitiesTrend.value,
        positive: teamStats.thisWeekActivitiesTrend.positive,
        description: 'vs same week last month'
      }
    },
    {
      key: 'avg-per-member',
      title: 'Avg per Member',
      value: teamStats.avgPerMember,
      prefix: <PiUsers />,
      color: '#722ed1',
      description: 'Average activities per team member',
      precision: 1,
      trend: {
        value: teamStats.avgPerMemberTrend.value,
        positive: teamStats.avgPerMemberTrend.positive,
        description: 'vs last 30 days'
      }
    },
    {
      key: 'most-active-type',
      title: 'Most Active Type',
      value: teamStats.mostActiveType,
      prefix: <PiCalendar />,
      color: '#fa8c16',
      description: 'Most frequently used activity type',
      valueIsString: true
    }
  ]

  return (
    <div className="gba:mb-6" data-testid={`${DATA_TEST_ID_PREFIX}-container`}>
      <WidgetGroup
        widgets={createStatisticsWidgets()}
        isLoading={loading}
        error={error ? new Error(error) : null}
        onRetry={retry}
        skeletonCount={4}
        emptyText="No team activity statistics available."
        data-testid={`${DATA_TEST_ID_PREFIX}-widgets`}
      />
    </div>
  )
}

export default TeamActivitiesStatistics
