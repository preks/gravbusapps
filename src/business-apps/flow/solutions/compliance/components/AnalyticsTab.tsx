import React, { useEffect, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Alert,
  Button,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Spinner,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@newwork/nw-design-system'
import { BarChart3, TrendingUp, Calendar, Clock, CheckCircle2, Workflow, PieChart, Target } from 'lucide-react'
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import {
  useFlowManagementAnalytics,
  useTemplatePerformanceAnalytics,
  useTaskPerformanceAnalytics
} from '@/business-apps/flow/apps/success/hooks/useFlowAnalytics'

interface AnalyticsTabProps extends BusinessAppContextProps {}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ accessToken, ..._context }) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('mtd')

  // Fetch flow analytics filtered for compliance
  const {
    data: flowAnalytics,
    isLoading: flowLoading,
    error: flowError,
    refetch: refetchFlows
  } = useFlowManagementAnalytics({
    timeframe,
    accessToken,
    // @ts-ignore extend hook to append tag.solution on request
    tags: { solution: 'compliance' }
  } as any)

  // Template performance for compliance flows
  const {
    data: templateData,
    isLoading: templateLoading,
    error: templateError,
    refetch: refetchTemplates
  } = useTemplatePerformanceAnalytics({
    timeframe,
    accessToken,
    limit: 10,
    offset: 0,
    sortBy: 'totalWorkflows',
    sortOrder: 'desc',
    // @ts-ignore extend hook to append tag.solution on request
    tags: { solution: 'compliance' }
  } as any)

  // Task performance for compliance flows
  const {
    data: taskAnalytics,
    isLoading: taskLoading,
    error: taskError,
    refetch: refetchTasks
  } = useTaskPerformanceAnalytics({
    timeframe,
    accessToken,
    // @ts-ignore extend hook to append tag.solution on request
    tags: { solution: 'compliance' }
  } as any)

  useEffect(() => {
    // reset state on timeframe change if needed
  }, [timeframe])

  const isLoading = flowLoading || templateLoading || taskLoading
  const error = flowError || templateError || taskError || null

  if (isLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid="compliance-analytics-tab-loading"
      >
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="compliance-analytics-tab-error">
        <div>
          <h3>Error Loading Compliance Analytics</h3>
          <p>{error.message}</p>
          <Button
            onClick={() => {
              refetchFlows()
              refetchTemplates()
              refetchTasks()
            }}
            variant="secondary"
            className="gba:mt-2"
          >
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  const statusMetrics = flowAnalytics?.statusMetrics
  const timeSeries = flowAnalytics?.timeSeries || []
  const templates = templateData?.templates || []
  const templateSummary = templateData?.summary

  // Top KPI widgets: TASK metrics (explicit) and FLOW metrics (explicit)
  const taskKpis: WidgetItem[] = [
    {
      key: 'pending-tasks',
      title: 'Pending Tasks',
      value: taskAnalytics?.pendingTasks || 0,
      prefix: <Clock className="gba:h-4 gba:w-4" />,
      color: '#3b82f6',
      description: 'Currently active tasks'
    },
    {
      key: 'overdue-tasks',
      title: 'Overdue Tasks',
      value: taskAnalytics?.overdueTasks || 0,
      prefix: <Target className="gba:h-4 gba:w-4" />,
      color: '#ef4444',
      description: 'Tasks exceeding due date'
    },
    {
      key: 'avg-task-completion-rate',
      title: 'Avg Task Completion Rate',
      value: (() => {
        const list = taskAnalytics?.taskTypePerformance || []
        return list.length > 0 ? Math.round(list.reduce((s, t) => s + (t.completionRate || 0), 0) / list.length) : 0
      })(),
      suffix: '%',
      prefix: <CheckCircle2 className="gba:h-4 gba:w-4" />,
      color: '#52c41a',
      description: 'Average completion (by task type)'
    },
    {
      key: 'avg-tasks-per-user',
      title: 'Avg Tasks per User',
      value: (() => {
        const users = (taskAnalytics?.userProductivity || []).length || 0
        const completed = (taskAnalytics?.userProductivity || []).reduce((s, u) => s + (u.tasksCompleted || 0), 0)
        return users > 0 ? Math.round((completed / users) * 10) / 10 : 0
      })(),
      prefix: <Target className="gba:h-4 gba:w-4" />,
      color: '#8b5cf6',
      description: 'Average completed tasks across active users'
    }
  ]

  const flowKpis: WidgetItem[] = [
    {
      key: 'pending-workflows',
      title: 'Pending Flows',
      value: statusMetrics?.pending_workflows || 0,
      prefix: <Clock className="gba:h-4 gba:w-4" />,
      color: '#f59e0b',
      description: 'Flows currently in progress'
    },
    {
      key: 'completed-workflows',
      title: 'Completed Flows',
      value: statusMetrics?.completed_workflows || 0,
      prefix: <CheckCircle2 className="gba:h-4 gba:w-4" />,
      color: '#16a34a',
      description: 'Successfully completed flows'
    },
    {
      key: 'avg-flow-completion-rate',
      title: 'Avg Flow Completion Rate',
      value: statusMetrics?.workflow_completion_rate || 0,
      suffix: '%',
      prefix: <Workflow className="gba:h-4 gba:w-4" />,
      color: '#3b82f6',
      description: 'Workflow completion percentage'
    },
    {
      key: 'total-flows',
      title: 'Total Flows',
      value: statusMetrics?.total_workflows || templates.reduce((s, t) => s + (t.totalWorkflows || 0), 0) || 0,
      prefix: <Workflow className="gba:h-4 gba:w-4" />,
      color: '#0ea5e9',
      description: 'All compliance flows (filtered)'
    }
  ]

  // Additional KPI cards requested: Total Flows and Avg Tasks per User
  const extraKpis: WidgetItem[] = [
    {
      key: 'total-flows',
      title: 'Total Flows',
      value: statusMetrics?.total_workflows || templates.reduce((s, t) => s + (t.totalWorkflows || 0), 0) || 0,
      prefix: <Workflow className="gba:h-4 gba:w-4" />,
      color: '#0ea5e9',
      description: 'All compliance flows (filtered)'
    },
    {
      key: 'avg-tasks-per-user',
      title: 'Avg Tasks per User',
      value: (() => {
        // Approximate from task analytics: tasks completed divided by distinct users if available
        const users = (taskAnalytics?.userProductivity || []).length || 0
        const completed = (taskAnalytics?.userProductivity || []).reduce((s, u) => s + (u.tasksCompleted || 0), 0)
        return users > 0 ? Math.round((completed / users) * 10) / 10 : 0
      })(),
      prefix: <Target className="gba:h-4 gba:w-4" />,
      color: '#8b5cf6',
      description: 'Average completed tasks across active users'
    }
  ]

  // Task performance derived
  const taskTypePerformance = taskAnalytics?.taskTypePerformance ?? []
  const taskTypeChartData = taskTypePerformance
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

  const taskStatusData = (taskAnalytics as any)?.taskStatusDistribution ?? []

  return (
    <div className="gba:space-y-6" data-testid="compliance-analytics-tab">
      {/* Header with timeframe */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Compliance Analytics</h2>
          <p className="gba:text-gray-600">
            Task and flow performance for solution=compliance
            {templateSummary && (
              <span className="gba:ml-2 gba:text-sm gba:text-blue-600"> • {templateSummary.totalTemplates} flows</span>
            )}
          </p>
        </div>
        <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
          <SelectTrigger className="gba:w-[180px]" data-testid={`compliance-analytics-timeframe`}>
            <SelectValue placeholder="Select timeframe" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="wtd">Week to Date</SelectItem>
            <SelectItem value="mtd">Month to Date</SelectItem>
            <SelectItem value="qtd">Quarter to Date</SelectItem>
            <SelectItem value="ytd">Year to Date</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* KPI widgets: Tasks then Flows */}
      <WidgetGroup
        widgets={taskKpis}
        isLoading={false}
        skeletonCount={3}
        data-testid={'compliance-analytics-task-kpis'}
      />
      <WidgetGroup
        widgets={flowKpis}
        isLoading={false}
        skeletonCount={3}
        data-testid={'compliance-analytics-flow-kpis'}
      />

      {/* Flow Performance table (from FlowTab) */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Clock className="gba:h-5 gba:w-5" />
            Compliance Flow Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:overflow-x-auto">
            <table className="gba:w-full gba:border-collapse">
              <thead>
                <tr className="gba:border-b gba:border-gray-200">
                  <th className="gba:text-left gba:p-3 gba:font-semibold">Flow Name</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Total Flows</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Completed</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Flow Completion Rate</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Avg Cycle Time</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Median Cycle Time</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Tasks (Completed/Total)</th>
                </tr>
              </thead>
              <tbody>
                {templates.length > 0 ? (
                  templates.map((template: any, index: number) => (
                    <tr
                      key={template.templateId}
                      className={`gba:border-b gba:border-gray-100 ${index % 2 === 0 ? 'gba:bg-gray-50' : ''}`}
                      data-testid={`compliance-analytics-template-row-${index}`}
                    >
                      <td className="gba:p-3 gba:font-medium">{template.templateName}</td>
                      <td className="gba:p-3 gba:text-right">{template.totalWorkflows}</td>
                      <td className="gba:p-3 gba:text-right">{template.completedWorkflows}</td>
                      <td className="gba:p-3 gba:text-right">
                        <span
                          className={`gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${
                            template.completionRate >= 90
                              ? 'gba:bg-green-100 gba:text-green-800'
                              : template.completionRate >= 80
                                ? 'gba:bg-yellow-100 gba:text-yellow-800'
                                : 'gba:bg-red-100 gba:text-red-800'
                          }`}
                        >
                          {template.completionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="gba:p-3 gba:text-right">{template.avgCycleTime}</td>
                      <td className="gba:p-3 gba:text-right">{template.medianCycleTime}</td>
                      <td className="gba:p-3 gba:text-right">
                        {typeof template.completedTasks !== 'undefined' && typeof template.totalTasks !== 'undefined'
                          ? `${template.completedTasks}/${template.totalTasks}`
                          : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="gba:p-8 gba:text-center gba:text-gray-500">
                      <Workflow className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-300" />
                      <p>No template performance data available</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Flow charts (2) */}
      <div className="gba:mt-6 gba:w-full">
        <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:w-full">
          <Card data-testid={`compliance-workflow-status-distribution`} className="gba:w-full">
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
                <BarChart3 className="gba:h-4 gba:w-4" />
                Compliance Workflow Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:pt-0">
              <ChartContainer
                config={{ count: { label: 'Flows', color: 'hsl(200, 85%, 55%)' } }}
                className="gba:h-[250px] gba:w-full"
              >
                <BarChart
                  data={[
                    { status: 'Completed', count: statusMetrics?.completed_workflows || 0 },
                    { status: 'Pending', count: statusMetrics?.pending_workflows || 0 }
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="status" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(200, 85%, 55%)" />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card data-testid={`compliance-flow-performance-trends`} className="gba:w-full">
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
                <TrendingUp className="gba:h-5 gba:w-5" />
                Compliance Flow Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:pt-0">
              <div className="gba:h-[250px]">
                {timeSeries.length > 0 ? (
                  <ChartContainer
                    config={{
                      workflows_started: { label: 'Started', color: 'hsl(200, 85%, 70%)' },
                      workflows_completed: { label: 'Completed', color: 'hsl(200, 85%, 55%)' }
                    }}
                    className="gba:h-full gba:w-full"
                  >
                    <BarChart data={timeSeries.slice(-7)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tickFormatter={value =>
                          new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                        }
                      />
                      <YAxis />
                      <ChartTooltip
                        content={<ChartTooltipContent />}
                        labelFormatter={value =>
                          new Date(value).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
                        }
                      />
                      <Bar dataKey="workflows_started" fill="hsl(200, 85%, 70%)" name="Started" />
                      <Bar dataKey="workflows_completed" fill="hsl(200, 85%, 55%)" name="Completed" />
                    </BarChart>
                  </ChartContainer>
                ) : (
                  <div className="gba:text-center gba:py-8 gba:text-gray-500">
                    <TrendingUp className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-300" />
                    <p>No trend data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Task charts section: Status Distribution, Task Trends, Completion Time Distribution */}
      <div className="gba:mt-6 gba:w-full">
        <div className="gba:grid gba:grid-cols-3 gba:gap-3 gba:min-w-0 gba:w-full">
          <Card data-testid={`compliance-task-status-distribution`} className="gba:w-full gba:h-full">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                <PieChart className="gba:h-4 gba:w-4" />
                Task Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              {taskStatusData.length > 0 ? (
                <ChartContainer
                  config={{ percentage: { label: 'Percentage', color: 'hsl(200, 85%, 55%)' } }}
                  className="gba:w-full gba:h-[200px]"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={taskStatusData.map((item: any) => ({
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
                        formatter={(value: any, _name: any, props: any) => {
                          const item = props?.payload
                          if (!item) return [`${value}%`, 'Percentage']
                          return [`${value}%`, `${item.totalTasks} tasks`]
                        }}
                      />
                      <Bar dataKey="percentage" fill="hsl(200, 85%, 55%)" name="Percentage" radius={[4, 4, 0, 0]} />
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

          <Card data-testid={`compliance-task-trends`} className="gba:w-full">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                <BarChart3 className="gba:h-4 gba:w-4" />
                Task Performance Trends (Last 7 Days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:h-[220px]">
                {Array.isArray(taskAnalytics?.timeSeries) && (taskAnalytics?.timeSeries?.length || 0) > 0 ? (
                  <ChartContainer
                    config={{
                      tasks_started: { label: 'Started', color: 'hsl(200,85%,70%)' },
                      tasks_completed: { label: 'Completed', color: 'hsl(200,85%,55%)' }
                    }}
                    className="gba:w-full gba:h-[220px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={(taskAnalytics?.timeSeries || []).slice(-7)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
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
              </div>
            </CardContent>
          </Card>

          <Card data-testid={`compliance-task-completion-distribution`} className="gba:w-full">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-lg">
                <BarChart3 className="gba:h-4 gba:w-4" />
                Completion Time Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:h-[220px]">
                {(taskAnalytics?.completionTimeDistribution?.length || 0) > 0 ? (
                  <ChartContainer
                    config={{ percentage: { label: 'Percentage', color: 'hsl(200,85%,55%)' } }}
                    className="gba:w-full gba:h-[220px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={taskAnalytics?.completionTimeDistribution}>
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
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
