import React, { useMemo, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Spinner, Alert, Button } from '@newwork/nw-design-system'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Line,
  ComposedChart,
  Area,
  Legend
} from 'recharts'
import { PiChartPie, PiChartBar, PiTrendUp, PiUsers, PiTarget } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { SalesTeamMember } from '../../sales-members-list/types'
import { useTeamAnalyticsData } from '../hooks/useTeamAnalyticsData'
import dayjs from 'dayjs'

const DATA_TEST_ID_PREFIX = 'TeamOverviewCharts'

interface TeamOverviewChartsProps extends BusinessAppContextProps {
  teamMembers: SalesTeamMember[]
}

// Chart color palette
const CHART_COLORS = ['#1677ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#fadb14']
const ACTIVITY_TYPE_COLORS = {
  Call: '#52c41a', // Green
  Email: '#1677ff', // Blue
  Meeting: '#fa8c16', // Orange
  Task: '#722ed1', // Purple
  Other: '#8c8c8c' // Gray
}

export const TeamOverviewCharts: React.FC<TeamOverviewChartsProps> = ({ teamMembers, accessToken, userInfo }) => {
  // Get employee IDs for data fetching
  const employeeIds = useMemo(() => {
    const memberIds = teamMembers.map(member => member.employeeId || member.id).filter((id): id is string => !!id)

    const managerIds = teamMembers.map(member => member.manager?.id).filter((id): id is string => !!id)

    return Array.from(new Set([...memberIds, ...managerIds]))
  }, [teamMembers])

  // Use the specialized analytics data hook (no query limits for comprehensive data)
  const { activities, total, loading, error, loadAnalyticsData, retry } = useTeamAnalyticsData({
    employeeIds,
    accessToken,
    userInfo
  })

  // Load data when component mounts
  useEffect(() => {
    if (employeeIds.length > 0) {
      loadAnalyticsData()
    }
  }, [employeeIds, loadAnalyticsData])

  // Activity Types Distribution (Pie Chart Data)
  const activityTypesData = useMemo(() => {
    if (!activities.length) return []

    const typeCounts = activities.reduce(
      (acc, activity) => {
        const type = activity.activityType?.value || 'Other'
        acc[type] = (acc[type] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(typeCounts).map(([name, value]) => ({
      name,
      value,
      color: ACTIVITY_TYPE_COLORS[name as keyof typeof ACTIVITY_TYPE_COLORS] || ACTIVITY_TYPE_COLORS.Other
    }))
  }, [activities])

  // Team Member Activity Distribution (Bar Chart Data)
  const memberActivityData = useMemo(() => {
    if (!activities.length) return []

    const memberCounts = activities.reduce(
      (acc, activity) => {
        const memberName = activity.ownerEmployee?.fullName || 'Unknown'
        acc[memberName] = (acc[memberName] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(memberCounts)
      .map(([name, activities]) => ({
        name: name.split(' ')[0], // First name only for space
        fullName: name,
        activities
      }))
      .sort((a, b) => b.activities - a.activities)
      .slice(0, 10) // Top 10 most active
  }, [activities])

  // Activity Timeline (Line Chart Data) - Last 30 days
  const activityTimelineData = useMemo(() => {
    if (!activities.length) return []

    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = dayjs().subtract(29 - i, 'days')
      return {
        date: date.format('MMM DD'),
        fullDate: date.format('YYYY-MM-DD'),
        activities: 0,
        calls: 0,
        emails: 0,
        meetings: 0,
        tasks: 0
      }
    })

    activities.forEach(activity => {
      if (!activity.createdAt) return

      const activityDate = dayjs(activity.createdAt).format('YYYY-MM-DD')
      const dayData = last30Days.find(day => day.fullDate === activityDate)

      if (dayData) {
        dayData.activities += 1

        const type = activity.activityType?.value || 'Other'
        switch (type.toLowerCase()) {
          case 'call':
            dayData.calls += 1
            break
          case 'email':
            dayData.emails += 1
            break
          case 'meeting':
            dayData.meetings += 1
            break
          case 'task':
            dayData.tasks += 1
            break
        }
      }
    })

    return last30Days
  }, [activities])

  // Entity Type Distribution (Pie Chart Data)
  const entityTypesData = useMemo(() => {
    if (!activities.length) return []

    const entityCounts = activities.reduce(
      (acc, activity) => {
        let entityType = 'Other'
        if (activity.account?.name) entityType = 'Account'
        else if (activity.contact?.firstName || activity.contact?.lastName) entityType = 'Contact'
        else if (activity.lead?.name || activity.lead?.contact) entityType = 'Lead'
        else if (activity.opportunity?.name) entityType = 'Opportunity'

        acc[entityType] = (acc[entityType] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return Object.entries(entityCounts).map(([name, value], index) => ({
      name,
      value,
      color: CHART_COLORS[index % CHART_COLORS.length]
    }))
  }, [activities])

  // Loading state
  if (loading && activities.length === 0) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-loading`}>
        <CardContent className="gba:flex gba:justify-center gba:p-8">
          <Spinner size="lg" />
        </CardContent>
      </Card>
    )
  }

  // Error state
  if (error && activities.length === 0) {
    return (
      <Alert variant="destructive" data-testid={`${DATA_TEST_ID_PREFIX}-error`}>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <h4 className="gba:text-sm gba:font-medium">Error Loading Team Analytics</h4>
            <p className="gba:text-sm gba:text-muted-foreground">Failed to load team activity data for charts</p>
          </div>
          <Button variant="outline" size="sm" onClick={retry} data-testid={`${DATA_TEST_ID_PREFIX}-retry-button`}>
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  // No data state
  if (activities.length === 0) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-empty`}>
        <CardContent className="gba:text-center gba:p-8">
          <PiChartPie size={48} className="gba:text-gray-400 gba:mx-auto gba:mb-4" />
          <h3 className="gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">No Activity Data</h3>
          <p className="gba:text-sm gba:text-gray-500">
            Analytics will appear here once the team has recorded activities.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={DATA_TEST_ID_PREFIX}>
      {/* Section Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:mb-4">
        <PiChartBar className="gba:text-blue-600" size={24} />
        <h2 className="gba:text-xl gba:font-semibold gba:text-gray-900">Team Activity Analytics</h2>
        <span className="gba:text-gray-500 gba:text-sm">({total} activities analyzed)</span>
      </div>

      {/* First Row - Activity Types & Member Distribution */}
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        {/* Activity Types Pie Chart */}
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-activity-types-chart`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiChartPie className="gba:text-blue-600" size={20} />
              Activity Types Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={activityTypesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(1) : '0'}%`}
                >
                  {activityTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={value => [value, 'Activities']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Team Member Activity Bar Chart */}
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-member-activity-chart`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiUsers className="gba:text-green-600" size={20} />
              Top Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={memberActivityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip formatter={value => [value, 'Activities']} />
                <Bar dataKey="activities" fill="#1677ff" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Timeline & Entity Distribution */}
      <div className="gba:grid gba:grid-cols-1 lg:gba:grid-cols-2 gba:gap-6">
        {/* Activity Timeline Chart */}
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-timeline-chart`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiTrendUp className="gba:text-orange-600" size={20} />
              Activity Timeline (30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={activityTimelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="activities"
                  fill="#1677ff"
                  fillOpacity={0.3}
                  stroke="#1677ff"
                  name="Total Activities"
                />
                <Line type="monotone" dataKey="calls" stroke="#52c41a" name="Calls" strokeWidth={2} />
                <Line type="monotone" dataKey="emails" stroke="#1677ff" name="Emails" strokeWidth={2} />
                <Line type="monotone" dataKey="meetings" stroke="#fa8c16" name="Meetings" strokeWidth={2} />
              </ComposedChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Entity Types Pie Chart */}
        <Card data-testid={`${DATA_TEST_ID_PREFIX}-entity-types-chart`}>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <PiTarget className="gba:text-purple-600" size={20} />
              Activities by Entity Type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={entityTypesData}
                  cx="50%"
                  cy="50%"
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${percent ? (percent * 100).toFixed(1) : '0'}%`}
                >
                  {entityTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={value => [value, 'Activities']} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TeamOverviewCharts
