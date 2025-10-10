import React, { useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Alert,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Badge
} from '@newwork/nw-design-system'
import { Spinner } from '@newwork/nw-design-system'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@newwork/nw-design-system'
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Bar, BarChart } from 'recharts'
import { Users, AlertTriangle, CheckCircle2, BarChart3, Activity, Gauge, UserX } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useUserCapacityAnalytics } from '../../hooks/useFlowAnalytics'

interface CapacityPlanningTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const CapacityPlanningTab: React.FC<CapacityPlanningTabProps> = ({
  prefixDataTestId = 'user-capacity-tab',
  accessToken,
  ...context
}) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('mtd')

  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useUserCapacityAnalytics({
    timeframe,
    includeWorkloadDistribution: true,
    includeCapacityTrends: true,
    includeRecommendations: true,
    accessToken
  })

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <AlertTriangle className="gba:h-4 gba:w-4" />
        <div>
          <h4>Error Loading User Capacity Analytics</h4>
          <p>{error.message}</p>
          <Button variant="outline" size="sm" onClick={refetch} className="gba:mt-2">
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  if (!analytics) {
    return (
      <div className="gba:text-center gba:text-gray-500 gba:py-8" data-testid={`${prefixDataTestId}-no-data`}>
        No user capacity data available
      </div>
    )
  }

  const { workloadDistribution, capacityTrends, bottlenecks } = analytics

  // Create workload distribution KPI widgets
  const workloadDistributionKpis: WidgetItem[] = [
    {
      key: 'total-active-users',
      title: 'Active Users',
      value: workloadDistribution.totalActiveUsers,
      prefix: <Users />,
      color: '#1890ff',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Users currently working on tasks'
    },
    {
      key: 'avg-tasks-per-user',
      title: 'Avg Tasks per User',
      value: workloadDistribution.averageTasksPerUser,
      precision: 1,
      prefix: <Activity />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average workload distribution'
    },
    {
      key: 'utilization-rate',
      title: 'Team Utilization',
      value: workloadDistribution.utilizationRate,
      suffix: '%',
      precision: 1,
      prefix: <Gauge />,
      color:
        workloadDistribution.utilizationRate > 85
          ? '#ff4d4f'
          : workloadDistribution.utilizationRate > 70
            ? '#faad14'
            : '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Overall team capacity utilization'
    },
    {
      key: 'overloaded-users',
      title: 'Overloaded Users',
      value: workloadDistribution.overloadedUsers,
      prefix: <UserX />,
      color:
        workloadDistribution.overloadedUsers > 2
          ? '#ff4d4f'
          : workloadDistribution.overloadedUsers > 0
            ? '#faad14'
            : '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Users exceeding optimal workload'
    }
  ]

  // Prepare capacity trends data for chart
  const capacityTrendsChartData = capacityTrends.slice(-14).map(trend => ({
    period: new Date(trend.period).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    totalTasks: trend.totalTasks,
    activeUsers: trend.activeUsers,
    avgUtilization: trend.avgUtilization,
    efficiency: trend.efficiency
  }))

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header with filters */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">User Capacity Planning</h2>
          <p className="gba:text-gray-600">Team workload analysis and capacity optimization recommendations</p>
        </div>
        <div className="gba:flex gba:items-center gba:gap-4">
          <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
            <SelectTrigger className="gba:w-40" data-testid={`${prefixDataTestId}-timeframe-select`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wtd">Week to Date</SelectItem>
              <SelectItem value="mtd">Month to Date</SelectItem>
              <SelectItem value="qtd">Quarter to Date</SelectItem>
              <SelectItem value="ytd">Year to Date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Workload Distribution Overview */}
      <div>
        <h3 className="gba:text-lg gba:font-semibold gba:mb-4 gba:flex gba:items-center gba:gap-2">
          <Users className="gba:h-5 gba:w-5" />
          Team Workload Distribution
        </h3>
        <WidgetGroup
          widgets={workloadDistributionKpis}
          isLoading={false}
          skeletonCount={4}
          data-testid={`${prefixDataTestId}-workload-distribution`}
        />
      </div>

      {/* Bottlenecks Alert */}
      {bottlenecks.length > 0 && (
        <Alert>
          <AlertTriangle className="gba:h-4 gba:w-4" />
          <div>
            <h4 className="gba:font-semibold">Capacity Bottlenecks Detected</h4>
            <div className="gba:mt-1 gba:space-y-2">
              {bottlenecks.map((bottleneck, index) => (
                <div key={index}>
                  <p>
                    <strong>{bottleneck.name}:</strong> {bottleneck.description}
                  </p>
                  <p className="gba:text-sm gba:text-gray-600">
                    <strong>Impact:</strong> {bottleneck.impact}
                  </p>
                  <p className="gba:text-sm gba:text-gray-600">
                    <strong>Recommendation:</strong> {bottleneck.recommendation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Alert>
      )}

      {/* Capacity Trends Chart */}
      <Card data-testid={`${prefixDataTestId}-capacity-trends`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <BarChart3 className="gba:h-5 gba:w-5" />
            Team Capacity Trends (Last 14 Days)
          </CardTitle>
          <p className="gba:text-sm gba:text-gray-600">Daily task volume, active users, and utilization trends</p>
        </CardHeader>
        <CardContent>
          {capacityTrendsChartData.length > 0 ? (
            <ChartContainer
              config={{
                totalTasks: {
                  label: 'Total Tasks',
                  color: 'hsl(214, 95%, 48%)'
                },
                activeUsers: {
                  label: 'Active Users',
                  color: 'hsl(142, 76%, 36%)'
                },
                avgUtilization: {
                  label: 'Avg Utilization (%)',
                  color: 'hsl(45, 93%, 47%)'
                }
              }}
              className="gba:h-[350px]"
            >
              <LineChart data={capacityTrendsChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="period" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <ChartTooltip content={<ChartTooltipContent />} labelFormatter={label => `Date: ${label}`} />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="totalTasks"
                  stroke="hsl(214, 95%, 48%)"
                  strokeWidth={2}
                  name="Total Tasks"
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="activeUsers"
                  stroke="hsl(142, 76%, 36%)"
                  strokeWidth={2}
                  name="Active Users"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgUtilization"
                  stroke="hsl(45, 93%, 47%)"
                  strokeWidth={2}
                  name="Avg Utilization (%)"
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ChartContainer>
          ) : (
            <div className="gba:text-center gba:text-gray-500 gba:py-8">No capacity trend data available</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
