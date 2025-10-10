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
import {
  BarChart3,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  Users,
  PieChart,
  Target,
  ClipboardCheck,
  MessageSquare
} from 'lucide-react'
import {
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Cell,
  Pie
} from 'recharts'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import {
  useFlowManagementAnalytics,
  useTemplatePerformanceAnalytics,
  useTaskPerformanceAnalytics
} from '@/business-apps/flow/apps/success/hooks/useFlowAnalytics'

interface AnalyticsTabProps extends BusinessAppContextProps {}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ accessToken, ..._context }) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('mtd')

  // Fetch flow analytics filtered for surveys
  const {
    data: flowAnalytics,
    isLoading: flowLoading,
    error: flowError,
    refetch: refetchFlows
  } = useFlowManagementAnalytics({
    timeframe,
    accessToken,
    // @ts-ignore extend hook to append tag.solution on request
    tags: { solution: 'survey' }
  } as any)

  // Template performance for survey flows
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
    tags: { solution: 'survey' }
  } as any)

  // Task performance for survey flows
  const {
    data: taskAnalytics,
    isLoading: taskLoading,
    error: taskError,
    refetch: refetchTasks
  } = useTaskPerformanceAnalytics({
    timeframe,
    accessToken,
    // @ts-ignore extend hook to append tag.solution on request
    tags: { solution: 'survey' }
  } as any)

  useEffect(() => {
    // reset state on timeframe change if needed
  }, [timeframe])

  const isLoading = flowLoading || templateLoading || taskLoading
  const error = flowError || templateError || taskError || null

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:h-64" data-testid="survey-analytics-tab-loading">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" data-testid="survey-analytics-tab-error">
        <div>
          <h3>Error Loading Survey Data</h3>
          <p>{error.message}</p>
          <Button
            onClick={() => {
              refetchFlows()
              refetchTemplates()
              refetchTasks()
            }}
            variant="secondary"
            className="gba:mt-2"
            data-testid="survey-analytics-tab-retry-button"
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

  // Survey-specific KPI widgets: Response metrics and participation
  const responseKpis: WidgetItem[] = [
    {
      key: 'active-surveys',
      title: 'Active Surveys',
      value: statusMetrics?.pending_workflows || 0,
      prefix: <ClipboardCheck className="gba:h-4 gba:w-4" />,
      color: '#3b82f6',
      description: 'Currently open for responses'
    },
    {
      key: 'completed-surveys',
      title: 'Completed Surveys',
      value: statusMetrics?.completed_workflows || 0,
      prefix: <CheckCircle2 className="gba:h-4 gba:w-4" />,
      color: '#16a34a',
      description: 'Successfully completed surveys'
    },
    {
      key: 'response-rate',
      title: 'Response Rate',
      value: (() => {
        const completed =
          taskAnalytics?.userProductivity?.reduce((sum, user) => sum + (user.tasksCompleted || 0), 0) || 0
        const total = (taskAnalytics?.pendingTasks || 0) + completed
        return total > 0 ? Math.round((completed / total) * 100) : 0
      })(),
      suffix: '%',
      prefix: <MessageSquare className="gba:h-4 gba:w-4" />,
      color: '#52c41a',
      description: 'Overall survey response rate'
    },
    {
      key: 'avg-completion-time',
      title: 'Avg Completion Time',
      value: (() => {
        const times = taskAnalytics?.taskTypePerformance || []
        const avgMinutes =
          times.length > 0 ? Math.round(times.reduce((s, t) => s + (t.avgResponseTime || 0), 0) / times.length) : 0
        return avgMinutes > 60 ? `${Math.round(avgMinutes / 60)}h` : `${avgMinutes}m`
      })(),
      prefix: <Clock className="gba:h-4 gba:w-4" />,
      color: '#8b5cf6',
      description: 'Average time to complete survey',
      valueIsString: true
    }
  ]

  const participationKpis: WidgetItem[] = [
    {
      key: 'total-participants',
      title: 'Total Participants',
      value: (taskAnalytics?.userProductivity || []).length || 0,
      prefix: <Users className="gba:h-4 gba:w-4" />,
      color: '#0ea5e9',
      description: 'Unique survey participants'
    },
    {
      key: 'pending-responses',
      title: 'Pending Responses',
      value: taskAnalytics?.pendingTasks || 0,
      prefix: <Clock className="gba:h-4 gba:w-4" />,
      color: '#f59e0b',
      description: 'Surveys awaiting response'
    },
    {
      key: 'survey-types',
      title: 'Survey Types',
      value: templates.length || 0,
      prefix: <Target className="gba:h-4 gba:w-4" />,
      color: '#ef4444',
      description: 'Different survey templates active'
    },
    {
      key: 'total-responses',
      title: 'Total Responses',
      value: (taskAnalytics?.userProductivity || []).reduce((sum, user) => sum + (user.tasksCompleted || 0), 0) || 0,
      prefix: <MessageSquare className="gba:h-4 gba:w-4" />,
      color: '#7c3aed',
      description: 'All collected responses'
    }
  ]

  // Survey performance derived
  const surveyTypePerformance = taskAnalytics?.taskTypePerformance ?? []
  const surveyTypeChartData = surveyTypePerformance
    .filter(t => t && typeof t.taskType !== 'undefined')
    .slice(0, 8)
    .map(survey => {
      const fullName = String(survey.taskType ?? 'UNKNOWN')
      const name = fullName.length > 20 ? fullName.substring(0, 20) + '...' : fullName
      return {
        name,
        fullName,
        responseRate: survey.completionRate ?? 0,
        totalSurveys: survey.totalTasks ?? 0,
        avgResponseTime: survey.avgResponseTime ?? 0
      }
    })

  const responseStatusData = (taskAnalytics as any)?.taskStatusDistribution ?? []

  // Colors for pie chart
  const COLORS = ['#3b82f6', '#16a34a', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

  return (
    <div className="gba:space-y-6" data-testid="survey-analytics-tab">
      {/* Header with timeframe */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Survey Analytics</h2>
          <p className="gba:text-gray-600">
            Response rates, participation metrics, and survey insights
            {templateSummary && (
              <span className="gba:ml-2 gba:text-sm gba:text-blue-600">
                {' '}
                • {templateSummary.totalTemplates} survey types
              </span>
            )}
          </p>
        </div>
        <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
          <SelectTrigger className="gba:w-[180px]" data-testid="survey-data-timeframe">
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

      {/* KPI widgets: Response metrics then Participation */}
      <WidgetGroup widgets={responseKpis} isLoading={false} skeletonCount={4} data-testid="survey-data-response-kpis" />
      <WidgetGroup
        widgets={participationKpis}
        isLoading={false}
        skeletonCount={4}
        data-testid="survey-data-participation-kpis"
      />

      {/* Survey Performance table */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <ClipboardCheck className="gba:h-5 gba:w-5" />
            Survey Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:overflow-x-auto">
            <table className="gba:w-full gba:border-collapse">
              <thead>
                <tr className="gba:border-b gba:border-gray-200">
                  <th className="gba:text-left gba:p-3 gba:font-semibold">Survey Name</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Total Surveys</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Completed</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Response Rate</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Avg Response Time</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Responses Collected</th>
                </tr>
              </thead>
              <tbody>
                {templates.length > 0 ? (
                  templates.map((template: any, index: number) => (
                    <tr
                      key={template.templateId}
                      className={`gba:border-b gba:border-gray-100 ${index % 2 === 0 ? 'gba:bg-gray-50' : ''}`}
                      data-testid={`survey-data-template-row-${index}`}
                    >
                      <td className="gba:p-3 gba:font-medium">{template.templateName}</td>
                      <td className="gba:p-3 gba:text-right">{template.totalWorkflows}</td>
                      <td className="gba:p-3 gba:text-right">{template.completedWorkflows}</td>
                      <td className="gba:p-3 gba:text-right">
                        <span
                          className={`gba:inline-flex gba:items-center gba:px-2 gba:py-1 gba:rounded-full gba:text-xs gba:font-medium ${
                            template.completionRate >= 90
                              ? 'gba:bg-green-100 gba:text-green-800'
                              : template.completionRate >= 70
                                ? 'gba:bg-yellow-100 gba:text-yellow-800'
                                : 'gba:bg-red-100 gba:text-red-800'
                          }`}
                        >
                          {template.completionRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="gba:p-3 gba:text-right">{template.avgCycleTime}</td>
                      <td className="gba:p-3 gba:text-right">
                        {typeof template.completedTasks !== 'undefined' ? template.completedTasks : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="gba:p-8 gba:text-center gba:text-gray-500">
                      <ClipboardCheck className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-300" />
                      <p>No survey performance data available</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Survey charts section: Response trends and distribution */}
      <div className="gba:mt-6 gba:w-full">
        <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:w-full">
          <Card data-testid="survey-response-distribution" className="gba:w-full">
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
                <PieChart className="gba:h-4 gba:w-4" />
                Survey Response Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:pt-0">
              <div className="gba:h-[250px]">
                {responseStatusData.length > 0 ? (
                  <ChartContainer
                    config={{ percentage: { label: 'Percentage', color: 'hsl(200, 85%, 55%)' } }}
                    className="gba:h-full gba:w-full"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <RechartsPieChart>
                        <Pie
                          data={responseStatusData.map((item: any, index: number) => ({
                            name: item.status,
                            value: item.totalTasks,
                            percentage: item.percentage,
                            fill: COLORS[index % COLORS.length]
                          }))}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, percentage }) => `${name}: ${percentage}%`}
                        >
                          {responseStatusData.map((_: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </RechartsPieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <div className="gba:text-center gba:py-8 gba:text-gray-500">
                    <PieChart className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-300" />
                    <p>No response distribution data available</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card data-testid="survey-response-trends" className="gba:w-full">
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
                <TrendingUp className="gba:h-5 gba:w-5" />
                Survey Response Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:pt-0">
              <div className="gba:h-[250px]">
                {timeSeries.length > 0 ? (
                  <ChartContainer
                    config={{
                      workflows_started: { label: 'Surveys Launched', color: 'hsl(200, 85%, 70%)' },
                      workflows_completed: { label: 'Surveys Completed', color: 'hsl(200, 85%, 55%)' }
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
                      <Bar dataKey="workflows_started" fill="hsl(200, 85%, 70%)" name="Launched" />
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

      {/* Survey Response Rate Analysis */}
      <Card data-testid="survey-response-rate-analysis" className="gba:w-full">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <BarChart3 className="gba:h-4 gba:w-4" />
            Survey Type Response Rate Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:h-[300px]">
            {surveyTypeChartData.length > 0 ? (
              <ChartContainer
                config={{ responseRate: { label: 'Response Rate (%)', color: 'hsl(200, 85%, 55%)' } }}
                className="gba:w-full gba:h-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={surveyTypeChartData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} interval={0} />
                    <YAxis domain={[0, 100]} />
                    <ChartTooltip
                      content={<ChartTooltipContent />}
                      formatter={(value: any, _name: any, props: any) => {
                        const item = props?.payload
                        if (!item) return [`${value}%`, 'Response Rate']
                        return [`${value}%`, `${item.fullName} (${item.totalSurveys} surveys)`]
                      }}
                    />
                    <Bar dataKey="responseRate" fill="hsl(200, 85%, 55%)" name="Response Rate" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="gba:text-center gba:py-8 gba:text-gray-500">
                <BarChart3 className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-300" />
                <p>No survey type performance data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
