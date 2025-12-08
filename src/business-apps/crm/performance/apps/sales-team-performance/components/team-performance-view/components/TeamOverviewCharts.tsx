import React, { useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartContainer,
  ChartTooltip,
  ChartLegend,
  ChartLegendContent
} from '@newwork/nw-design-system'
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, ComposedChart, Area } from 'recharts'
import { PiChartPie, PiChartBar, PiTrendUp, PiUsers, PiTarget } from 'react-icons/pi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ActivityTimelineTooltip } from '@/common/components/common-relations/view-layouts/analytics-layout/shared/tooltips/ActivityTimelineTooltip'

const DATA_TEST_ID_PREFIX = 'TeamOverviewCharts'

// Tooltip Components
interface ActivityPieTooltipProps {
  active?: boolean
  payload?: readonly any[]
  activityTypesData: any[]
}

const ActivityPieTooltip: React.FC<ActivityPieTooltipProps> = ({ active, payload, activityTypesData }) => {
  if (active && payload?.length) {
    const data = payload[0]
    const total = activityTypesData.reduce((sum, item) => sum + item.value, 0)
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${data.payload.name})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{data.payload.type}</span>
        </div>
        <div className="gba:text-lg gba:font-semibold gba:text-gray-900">{data.value} activities</div>
        <div className="gba:text-sm gba:text-gray-500">{percentage}% of total</div>
      </div>
    )
  }
  return null
}

interface MemberBarTooltipProps {
  active?: boolean
  payload?: readonly any[]
}

const MemberBarTooltip: React.FC<MemberBarTooltipProps> = ({ active, payload }) => {
  if (active && payload?.length) {
    const data = payload[0]
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${data.payload.memberKey})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{data.payload.fullName}</span>
        </div>
        <div className="gba:text-lg gba:font-semibold gba:text-gray-900">{data.value} activities</div>
      </div>
    )
  }
  return null
}

interface EntityPieTooltipProps {
  active?: boolean
  payload?: readonly any[]
  entityTypesData: any[]
}

const EntityPieTooltip: React.FC<EntityPieTooltipProps> = ({ active, payload, entityTypesData }) => {
  if (active && payload?.length) {
    const data = payload[0]
    const total = entityTypesData.reduce((sum, item) => sum + item.value, 0)
    const percentage = total > 0 ? ((data.value / total) * 100).toFixed(1) : '0'
    return (
      <div className="gba:bg-white gba:p-3 gba:border gba:border-gray-200 gba:rounded-lg gba:shadow-lg">
        <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
          <div
            className="gba:w-3 gba:h-3 gba:rounded-full"
            style={{ backgroundColor: `var(--color-${data.payload.name})` }}
          />
          <span className="gba:font-medium gba:text-gray-700">{data.payload.type}</span>
        </div>
        <div className="gba:text-lg gba:font-semibold gba:text-gray-900">{data.value} activities</div>
        <div className="gba:text-sm gba:text-gray-500">{percentage}% of total</div>
      </div>
    )
  }
  return null
}

interface ActivityTypeAggregate {
  activityType: string
  count: number
}

interface EmployeeActivityAggregate {
  employeeId: string
  employeeName: string
  count: number
}

interface EntityTypeAggregate {
  entityType: string
  count: number
}

interface TimelineAggregate {
  date: string
  count: number
}

interface TeamOverviewChartsProps extends BusinessAppContextProps {
  activityTypeAggregates: ActivityTypeAggregate[]
  employeeActivityAggregates: EmployeeActivityAggregate[]
  entityTypeAggregates: EntityTypeAggregate[]
  timelineAggregates: TimelineAggregate[]
  totalActivities: number
  loading: boolean
}

export const TeamOverviewCharts: React.FC<TeamOverviewChartsProps> = ({
  activityTypeAggregates,
  employeeActivityAggregates,
  entityTypeAggregates,
  timelineAggregates,
  totalActivities,
  loading
}) => {
  // Data is passed from parent component (TeamPerformanceView)

  // Activity Types Distribution (Pie Chart Data) - Using aggregates with design system pattern
  const activityTypesData = useMemo(() => {
    if (!activityTypeAggregates.length) return []

    return activityTypeAggregates.map(aggregate => ({
      type: aggregate.activityType,
      name: aggregate.activityType.toLowerCase().replaceAll(/\s+/g, ''),
      value: aggregate.count
    }))
  }, [activityTypeAggregates])

  // Chart config for activity types
  const activityTypesChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    activityTypesData.forEach(item => {
      config[item.name] = { label: item.type }
    })
    return config
  }, [activityTypesData])

  // Team Member Activity Distribution (Bar Chart Data) - Using aggregates with design system pattern
  const memberActivityData = useMemo(() => {
    if (!employeeActivityAggregates.length) return []

    return employeeActivityAggregates
      .filter(aggregate => aggregate.employeeName) // Filter out null/undefined names
      .map(aggregate => {
        const firstName = aggregate.employeeName?.split(' ')[0] || 'Unknown'
        return {
          member: firstName,
          memberKey: firstName.toLowerCase().replaceAll(/\s+/g, ''),
          fullName: aggregate.employeeName || 'Unknown',
          activities: aggregate.count
        }
      })
      .sort((a, b) => b.activities - a.activities)
      .slice(0, 10) // Top 10 most active
  }, [employeeActivityAggregates])

  // Chart config for team members
  const memberActivityChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    memberActivityData.forEach(item => {
      config[item.memberKey] = { label: item.fullName }
    })
    return config
  }, [memberActivityData])

  // Activity Timeline - Format data for chart
  const activityTimelineData = useMemo(() => {
    if (!timelineAggregates.length) return []

    return timelineAggregates.map(aggregate => {
      // Format date as "MMM DD" for display
      const date = new Date(aggregate.date)
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

      return {
        date: formattedDate,
        fullDate: aggregate.date,
        activities: aggregate.count
      }
    })
  }, [timelineAggregates])

  // Chart config for timeline
  const timelineChartConfig = useMemo(
    () => ({
      activities: { label: 'Total Activities' }
    }),
    []
  )

  // Entity Type Distribution - Using design system pattern
  const entityTypesData = useMemo(() => {
    if (!entityTypeAggregates.length) return []

    return entityTypeAggregates.map(aggregate => ({
      type: aggregate.entityType,
      name: aggregate.entityType.toLowerCase(),
      value: aggregate.count
    }))
  }, [entityTypeAggregates])

  // Chart config for entity types
  const entityTypesChartConfig = useMemo(() => {
    const config: Record<string, { label: string }> = {}
    entityTypesData.forEach(item => {
      config[item.name] = { label: item.type }
    })
    return config
  }, [entityTypesData])

  // Memoized tooltip renderers
  const renderActivityTooltip = useCallback(
    (props: any) => <ActivityPieTooltip {...props} activityTypesData={activityTypesData} />,
    [activityTypesData]
  )

  const renderEntityTooltip = useCallback(
    (props: any) => <EntityPieTooltip {...props} entityTypesData={entityTypesData} />,
    [entityTypesData]
  )

  // Only show charts if we have data
  if (totalActivities === 0) {
    return (
      <Card data-testid={`${DATA_TEST_ID_PREFIX}-empty`}>
        <CardContent className="gba:text-center gba:p-8">
          <PiChartPie size={48} className="gba:text-gray-400 gba:mx-auto gba:mb-4" />
          <h3 className="gba:text-sm gba:font-medium gba:text-gray-900 gba:mb-2">No Activity Data</h3>
          <p className="gba:text-sm gba:text-gray-500">
            {loading ? 'Loading analytics...' : 'Analytics will appear here once the team has recorded activities.'}
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
        <span className="gba:text-gray-500 gba:text-sm">({totalActivities} activities analyzed)</span>
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
            <ChartContainer config={activityTypesChartConfig} className="gba:h-[300px] gba:w-full">
              <PieChart>
                <Pie
                  data={activityTypesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {activityTypesData.map(entry => (
                    <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Pie>
                <ChartTooltip content={renderActivityTooltip} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
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
            <ChartContainer config={memberActivityChartConfig} className="gba:h-[300px] gba:w-full">
              <BarChart data={memberActivityData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="0" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="member"
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  stroke="hsl(var(--border))"
                />
                <YAxis tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }} stroke="hsl(var(--border))" />
                <ChartTooltip content={MemberBarTooltip} />
                <Bar dataKey="activities" radius={[8, 8, 0, 0]}>
                  {memberActivityData.map(entry => (
                    <Cell key={`cell-${entry.memberKey}`} fill={`var(--color-${entry.memberKey})`} />
                  ))}
                </Bar>
              </BarChart>
            </ChartContainer>
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
              Activity Timeline (Last 30 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={timelineChartConfig} className="gba:h-[300px] gba:w-full">
              <ComposedChart data={activityTimelineData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  interval="preserveStartEnd"
                />
                <YAxis tick={{ fontSize: 12 }} />
                <ChartTooltip content={ActivityTimelineTooltip} />
                <ChartLegend content={<ChartLegendContent />} />
                <Area
                  type="monotone"
                  dataKey="activities"
                  fill="var(--color-activities)"
                  fillOpacity={0.2}
                  stroke="var(--color-activities)"
                  strokeWidth={2}
                  name="Total Activities"
                  dot={{ r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ChartContainer>
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
            <ChartContainer config={entityTypesChartConfig} className="gba:h-[300px] gba:w-full">
              <PieChart>
                <Pie
                  data={entityTypesData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                  nameKey="name"
                >
                  {entityTypesData.map(entry => (
                    <Cell key={`cell-${entry.name}`} fill={`var(--color-${entry.name})`} />
                  ))}
                </Pie>
                <ChartTooltip content={renderEntityTooltip} />
                <ChartLegend content={<ChartLegendContent />} />
              </PieChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default TeamOverviewCharts
