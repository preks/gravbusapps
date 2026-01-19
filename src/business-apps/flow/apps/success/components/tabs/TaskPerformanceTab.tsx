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
  SelectValue
} from '@newwork/nw-design-system'
import { Spinner } from '@newwork/nw-design-system'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@newwork/nw-design-system'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { Timer, Target, AlertTriangle, BarChart3, CheckCircle2, PieChart } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useTaskPerformanceAnalytics } from '../../hooks/useFlowAnalytics'

interface TaskPerformanceTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const TaskPerformanceTab: React.FC<TaskPerformanceTabProps> = ({
  prefixDataTestId = 'task-performance-tab',
  accessToken,
  ..._context
}) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('mtd')

  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useTaskPerformanceAnalytics({
    timeframe,
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
          <h4>Error Loading Task Performance Analytics</h4>
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
        No task performance data available
      </div>
    )
  }

  const taskTypePerformance = analytics?.taskTypePerformance ?? []
  const assignmentModeAnalytics = analytics?.assignmentModeAnalytics ?? []
  const userProductivity = analytics?.userProductivity ?? []

  // Create overview KPI widgets
  const overviewKpis: WidgetItem[] = [
    {
      key: 'pending-tasks',
      title: 'Pending Tasks',
      value: analytics.pendingTasks,
      prefix: <Timer />,
      color: '#3b82f6',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Currently active tasks'
    },
    {
      key: 'overdue-tasks',
      title: 'Overdue Tasks',
      value: analytics.overdueTasks,
      prefix: <AlertTriangle />,
      color: '#ef4444',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Tasks exceeding due date'
    },
    {
      key: 'avg-completion-rate',
      title: 'Avg Completion Rate',
      value:
        taskTypePerformance.length > 0
          ? Math.round(taskTypePerformance.reduce((sum, t) => sum + t.completionRate, 0) / taskTypePerformance.length)
          : 0,
      suffix: '%',
      prefix: <CheckCircle2 />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average completion rate (excl. canceled)'
    },
    {
      key: 'avg-tasks-per-user',
      title: 'Avg Tasks per User',
      value:
        userProductivity.length > 0
          ? Math.round(userProductivity.reduce((sum, u) => sum + u.tasksCompleted, 0) / userProductivity.length)
          : 0,
      prefix: <CheckCircle2 />,
      color: '#fa8c16',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Average tasks completed per user'
    }
  ]

  // Prepare chart data
  const taskTypeChartData = (taskTypePerformance || [])
    .filter(t => t && typeof t.taskType !== 'undefined')
    .slice(0, 10)
    .map(task => {
      const fullName = String(task.taskType ?? 'UNKNOWN')
      const name = fullName.length > 15 ? fullName.substring(0, 15) + '...' : fullName
      return {
        name,
        fullName,
        completionRate: task.completionRate ?? 0,
        totalTasks: task.totalTasks ?? 0,
        avgResponseTime: task.avgResponseTime ?? 0
      }
    })

  const assignmentModeChartData = assignmentModeAnalytics.map(mode => ({
    name: mode.assignmentMode,
    completionRate: mode.completionRate,
    avgCompletionTime: mode.avgCompletionTime,
    totalTasks: mode.totalTasks
  }))

  // Task status distribution (type-safe local projection)
  const taskStatusData =
    (analytics as { taskStatusDistribution?: { status: string; totalTasks: number; percentage: number }[] } | null)
      ?.taskStatusDistribution ?? []

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header with filters */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Task Performance Analytics</h2>
          <p className="gba:text-gray-600">Detailed insights into task efficiency and user productivity</p>
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

      {/* Overview KPIs */}
      <WidgetGroup
        widgets={overviewKpis}
        isLoading={false}
        skeletonCount={4}
        data-testid={`${prefixDataTestId}-overview-widgets`}
      />

      {/* Detailed Performance Table */}
      <Card data-testid={`${prefixDataTestId}-detailed-performance`}>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Timer className="gba:h-5 gba:w-5" />
            Detailed Performance Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:overflow-x-auto">
            <table className="gba:w-full gba:border-collapse">
              <thead>
                <tr className="gba:border-b gba:border-gray-200">
                  <th className="gba:text-left gba:p-3 gba:font-semibold">Task Type</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Total Tasks</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Completed</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Completion Rate</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Avg Response Time</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Median Response Time</th>
                </tr>
              </thead>
              <tbody>
                {taskTypePerformance.map((task, index) => (
                  <tr
                    key={task.taskType}
                    className={`gba:border-b gba:border-gray-100 ${index % 2 === 0 ? 'gba:bg-gray-50' : ''}`}
                  >
                    <td className="gba:p-3 gba:font-medium">{task.taskType}</td>
                    <td className="gba:p-3 gba:text-right">{task.totalTasks}</td>
                    <td className="gba:p-3 gba:text-right">{task.completedTasks}</td>
                    <td className="gba:p-3 gba:text-right">
                      <span
                        className={`gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${
                          task.completionRate >= 80
                            ? 'gba:bg-green-100 gba:text-green-800'
                            : task.completionRate >= 60
                              ? 'gba:bg-yellow-100 gba:text-yellow-800'
                              : 'gba:bg-red-100 gba:text-red-800'
                        }`}
                      >
                        {task.completionRate.toFixed(1)}%
                      </span>
                    </td>
                    <td className="gba:p-3 gba:text-right">{task.avgResponseTime.toFixed(2)}m</td>
                    <td className="gba:p-3 gba:text-right">
                      {task.medianResponseTime.toFixed(2)}m
                      {(typeof task.p75ResponseTime === 'number' || typeof task.p95ResponseTime === 'number') && (
                        <div className="gba:text-xs gba:text-gray-500">
                          {typeof task.p75ResponseTime === 'number' && `p75 ${task.p75ResponseTime.toFixed(2)}m`}
                          {typeof task.p75ResponseTime === 'number' &&
                            typeof task.p95ResponseTime === 'number' &&
                            ' · '}
                          {typeof task.p95ResponseTime === 'number' && `p95 ${task.p95ResponseTime.toFixed(2)}m`}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Charts Section - Fixed row layout with smaller charts */}
      <div className="gba:mt-6 gba:w-full gba:overflow-x-auto">
        <div className="gba:grid gba:grid-cols-3 gba:gap-3 gba:min-w-0 gba:w-full">
          {/* Task Status Distribution Chart */}
          <Card data-testid={`${prefixDataTestId}-task-status-distribution`} className="gba:w-full gba:h-full">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                <PieChart className="gba:h-4 gba:w-4" />
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {taskStatusData.length > 0 ? (
                <ChartContainer
                  config={{
                    percentage: {
                      label: 'Percentage',
                      color: 'hsl(200, 85%, 55%)'
                    }
                  }}
                  className="gba:w-full gba:h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={taskStatusData.map(item => ({
                        name: item.status,
                        percentage: item.percentage,
                        totalTasks: item.totalTasks
                      }))}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value, _name, props) => {
                          const item = props?.payload
                          if (!item) return [`${value}%`, 'Percentage']
                          return [`${value}%`, `${item.totalTasks} tasks`]
                        }}
                      />
                      <Bar dataKey="percentage" fill="hsl(200, 85%, 55%)" name="Percentage" radius={[4, 4, 0, 0]}></Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="gba:text-center gba:py-8 gba:text-gray-500">
                  <PieChart className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-300" />
                  <p className="gba:text-sm">No status data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Task Type Performance Chart */}
          <Card data-testid={`${prefixDataTestId}-task-type-performance`} className="gba:w-full gba:h-full">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                <BarChart3 className="gba:h-4 gba:w-4" />
                Task Type Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              {taskTypeChartData.length > 0 ? (
                <ChartContainer
                  config={{
                    completionRate: {
                      label: 'Completion Rate',
                      color: 'hsl(200, 85%, 55%)'
                    }
                  }}
                  className="gba:w-full gba:h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={taskTypeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Bar
                        dataKey="completionRate"
                        fill="hsl(200, 85%, 55%)"
                        name="Completion Rate"
                        radius={[4, 4, 0, 0]}
                      ></Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="gba:text-center gba:py-8 gba:text-gray-500">
                  <BarChart3 className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-300" />
                  <p className="gba:text-sm">No task type data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Assignment Mode Analytics Chart */}
          <Card data-testid={`${prefixDataTestId}-assignment-mode-analytics`} className="gba:w-full gba:h-full">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                <Target className="gba:h-4 gba:w-4" />
                Assignment Mode Analytics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignmentModeChartData.length > 0 ? (
                <ChartContainer
                  config={{
                    completionRate: {
                      label: 'Completion Rate',
                      color: 'hsl(200, 85%, 55%)'
                    }
                  }}
                  className="gba:w-full gba:h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={assignmentModeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        formatter={(value, _name, props) => {
                          const item = props?.payload
                          if (!item) return [`${value}%`, 'Completion Rate']
                          return [
                            `${value}%`,
                            `Completion Rate (${item.totalTasks} tasks, ${item.avgCompletionTime.toFixed(1)}m avg)`
                          ]
                        }}
                      />
                      <Bar
                        dataKey="completionRate"
                        fill="hsl(200, 85%, 55%)"
                        name="Completion Rate"
                        radius={[4, 4, 0, 0]}
                      ></Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              ) : (
                <div className="gba:text-center gba:py-8 gba:text-gray-500">
                  <Target className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-300" />
                  <p className="gba:text-sm">No assignment mode data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional charts: Trend + Completion time distribution */}
      <div className="gba:mt-4 gba:grid gba:grid-cols-2 gba:gap-3">
        {/* Task Performance Trends (reuse from Flow tab but slimmer) */}
        <Card data-testid={`${prefixDataTestId}-task-trends`} className="gba:w-full">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <BarChart3 className="gba:h-4 gba:w-4" />
              Task Performance Trends (Last 7 Days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {Array.isArray(analytics.timeSeries) && analytics.timeSeries.length > 0 ? (
              <ChartContainer
                config={{
                  tasks_started: { label: 'Started', color: 'hsl(200,85%,70%)' },
                  tasks_completed: { label: 'Completed', color: 'hsl(200,85%,55%)' }
                }}
                className="gba:w-full gba:h-[220px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.timeSeries.slice(-7)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value: string) => {
                        const d = new Date(value)
                        const dd = String(d.getDate()).padStart(2, '0')
                        const mm = String(d.getMonth() + 1).padStart(2, '0')
                        return `${dd}.${mm}.`
                      }}
                    />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="tasks_started" fill="hsl(200,85%,70%)" name="Started" />
                    <Bar dataKey="tasks_completed" fill="hsl(200,85%,55%)" name="Completed" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="gba:text-center gba:py-8 gba:text-gray-500">No task trend data available</div>
            )}
          </CardContent>
        </Card>

        {/* Completion Time Distribution */}
        <Card data-testid={`${prefixDataTestId}-completion-time-distribution`} className="gba:w-full">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
              <BarChart3 className="gba:h-4 gba:w-4" />
              Completion Time Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {analytics.completionTimeDistribution?.length ? (
              <ChartContainer
                config={{ percentage: { label: 'Percentage', color: 'hsl(200,85%,55%)' } }}
                className="gba:w-full gba:h-[220px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.completionTimeDistribution}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="bucket" />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="percentage" fill="hsl(200,85%,55%)" name="Percentage" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="gba:text-center gba:py-8 gba:text-gray-500">No completion distribution available</div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
