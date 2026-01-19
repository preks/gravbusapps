import React, { useState, useEffect } from 'react'
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
import {
  Timer,
  Target,
  AlertTriangle,
  Workflow,
  CheckCircle2,
  BarChart3,
  Clock,
  Activity,
  TrendingUp
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useFlowManagementAnalytics, useTemplatePerformanceAnalytics } from '../../hooks/useFlowAnalytics'

interface FlowTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const FlowTab: React.FC<FlowTabProps> = ({
  prefixDataTestId = 'flow-analytics-tab',
  accessToken,
  ..._context
}) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('mtd')
  const [tablePage, setTablePage] = useState(0)
  const [tablePageSize] = useState(10)

  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useFlowManagementAnalytics({
    timeframe,
    accessToken
  })

  const {
    data: templateData,
    isLoading: templateLoading,
    error: templateError,
    refetch: refetchTemplates
  } = useTemplatePerformanceAnalytics({
    timeframe,
    accessToken,
    limit: tablePageSize,
    offset: tablePage * tablePageSize,
    sortBy: 'totalWorkflows', // Show by total workflows for comprehensive view
    sortOrder: 'desc'
  })

  // Reset table page when timeframe changes
  useEffect(() => {
    setTablePage(0)
  }, [timeframe])

  if (isLoading || templateLoading) {
    return (
      <div
        className="gba:flex gba:justify-center gba:items-center gba:h-64"
        data-testid={`${prefixDataTestId}-loading`}
      >
        <Spinner />
      </div>
    )
  }

  if (error || templateError) {
    return (
      <Alert variant="destructive" data-testid={`${prefixDataTestId}-error`}>
        <AlertTriangle className="gba:h-4 gba:w-4" />
        <div>
          <h3>Error Loading Flow Analytics</h3>
          <p>{(error || templateError)?.message || 'Failed to load flow analytics'}</p>
          <Button
            onClick={() => {
              refetch()
              refetchTemplates()
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

  const statusMetrics = analytics?.statusMetrics
  const timeSeries = analytics?.timeSeries || []
  const templates = templateData?.templates || []
  const templateSummary = templateData?.summary

  // Helper function to format cycle time
  const formatCycleTime = (hours: number): string => {
    if (hours > 8760) {
      // More than a year
      return `${Math.round(hours / 8760)} years`
    } else if (hours > 168) {
      // More than a week
      return `${Math.round(hours / 168)} weeks`
    } else if (hours > 24) {
      // More than a day
      return `${Math.round(hours / 24)} days`
    } else {
      return `${Math.round(hours)} hours`
    }
  }

  // Overview KPIs following task tab pattern
  const overviewKpis: WidgetItem[] = [
    {
      key: 'pending-workflows',
      title: 'Pending Workflows',
      value: statusMetrics?.pending_workflows || 0,
      prefix: <Clock className="gba:h-4 gba:w-4" />,
      color: '#f59e0b',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Workflows currently in progress'
    },
    {
      key: 'completed-workflows',
      title: 'Completed Workflows',
      value: statusMetrics?.completed_workflows || 0,
      prefix: <CheckCircle2 className="gba:h-4 gba:w-4" />,
      color: '#52c41a',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Successfully completed workflows'
    },
    {
      key: 'avg-completion-rate',
      title: 'Avg Completion Rate',
      value: statusMetrics?.workflow_completion_rate || 0,
      suffix: '%',
      prefix: <Target className="gba:h-4 gba:w-4" />,
      color: '#3b82f6',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'Workflow completion percentage'
    },
    {
      key: 'total-workflows',
      title: 'Total Workflows',
      value: statusMetrics?.total_workflows || 0,
      prefix: <Workflow className="gba:h-4 gba:w-4" />,
      color: '#8b5cf6',
      span: { xs: 24, sm: 12, lg: 6 },
      description: 'All workflows in this period'
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header with Timeframe Selector */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Flow Performance Analytics</h2>
          <p className="gba:text-gray-600">
            Detailed insights into workflow efficiency and template performance
            {templateSummary && (
              <span className="gba:ml-2 gba:text-sm gba:text-blue-600">
                • {templateSummary.totalTemplates} templates • Avg: {templateSummary.avgCompletionRate.toFixed(1)}%
                completion
              </span>
            )}
          </p>
        </div>

        <Select value={timeframe} onValueChange={(value: any) => setTimeframe(value)}>
          <SelectTrigger className="gba:w-[180px]" data-testid={`${prefixDataTestId}-timeframe-select`}>
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

      {/* Overview KPIs */}
      <WidgetGroup
        widgets={overviewKpis}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No workflow data available"
        data-testid={`${prefixDataTestId}-overview-kpis`}
      />

      {/* Flow Template Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <Timer className="gba:h-5 gba:w-5" />
            Flow Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:overflow-x-auto">
            <table className="gba:w-full gba:border-collapse">
              <thead>
                <tr className="gba:border-b gba:border-gray-200">
                  <th className="gba:text-left gba:p-3 gba:font-semibold">Template Name</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Total Workflows</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Completed</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Completion Rate</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Avg Cycle Time</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Median Cycle Time</th>
                  <th className="gba:text-right gba:p-3 gba:font-semibold">Tasks (Completed/Total)</th>
                </tr>
              </thead>
              <tbody>
                {templates.length > 0 ? (
                  templates.map((template, index) => (
                    <tr
                      key={template.templateId}
                      className={`gba:border-b gba:border-gray-100 ${index % 2 === 0 ? 'gba:bg-gray-50' : ''}`}
                      data-testid={`${prefixDataTestId}-template-row-${index}`}
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
                      <td className="gba:p-3 gba:text-right">{formatCycleTime(template.avgCycleTime)}</td>
                      <td className="gba:p-3 gba:text-right">
                        {formatCycleTime(template.medianCycleTime)}
                        <div className="gba:text-xs gba:text-gray-500">
                          p75 {formatCycleTime(template.p75CycleTime)} · p95 {formatCycleTime(template.p95CycleTime)}
                        </div>
                      </td>
                      <td className="gba:p-3 gba:text-right">
                        {typeof (template as any).completedTasks !== 'undefined' &&
                        typeof (template as any).totalTasks !== 'undefined'
                          ? `${(template as any).completedTasks}/${(template as any).totalTasks}`
                          : '—'}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="gba:p-8 gba:text-center gba:text-gray-500">
                      <Workflow className="gba:h-8 gba:w-8 gba:mx-auto gba:mb-2 gba:text-gray-300" />
                      <p>No template performance data available</p>
                      <p className="gba:text-sm">
                        Try adjusting the timeframe or check if workflows have been executed
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {templateData && templateData.totalCount > tablePageSize && (
            <div className="gba:flex gba:justify-between gba:items-center gba:mt-4 gba:px-6 gba:pb-4">
              <div className="gba:text-sm gba:text-gray-600">
                Showing {tablePage * tablePageSize + 1}-
                {Math.min((tablePage + 1) * tablePageSize, templateData.totalCount)} of {templateData.totalCount}{' '}
                templates
              </div>
              <div className="gba:flex gba:items-center gba:gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTablePage(Math.max(0, tablePage - 1))}
                  disabled={tablePage === 0}
                  data-testid={`${prefixDataTestId}-table-prev-page`}
                >
                  Previous
                </Button>
                <span className="gba:text-sm gba:text-gray-600">
                  Page {tablePage + 1} of {Math.ceil(templateData.totalCount / tablePageSize)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setTablePage(tablePage + 1)}
                  disabled={!templateData.hasMore}
                  data-testid={`${prefixDataTestId}-table-next-page`}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Section - 2 charts side by side */}
      <div className="gba:mt-6 gba:w-full">
        <div className="gba:grid gba:grid-cols-2 gba:gap-6 gba:w-full">
          {/* Workflow Status Distribution Chart */}
          <Card data-testid={`${prefixDataTestId}-workflow-status-distribution`} className="gba:w-full">
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
                <BarChart3 className="gba:h-4 gba:w-4" />
                Workflow Status Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:pt-0">
              <ChartContainer
                config={{
                  count: {
                    label: 'Workflows',
                    color: 'hsl(200, 85%, 55%)'
                  }
                }}
                className="gba:h-[250px] gba:w-full"
              >
                <BarChart
                  data={[
                    {
                      status: 'Completed',
                      count: statusMetrics?.completed_workflows || 0,
                      percentage: statusMetrics?.workflow_completion_rate || 0
                    },
                    {
                      status: 'Pending',
                      count: statusMetrics?.pending_workflows || 0,
                      percentage: 100 - (statusMetrics?.workflow_completion_rate || 0)
                    }
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

          {/* Flow Performance Trends Chart */}
          <Card data-testid={`${prefixDataTestId}-flow-performance-trends`} className="gba:w-full">
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:font-medium">
                <TrendingUp className="gba:h-5 gba:w-5" />
                Flow Performance Trends
              </CardTitle>
            </CardHeader>
            <CardContent className="gba:pt-0">
              <div className="gba:h-[250px]">
                {timeSeries.length > 0 ? (
                  <ChartContainer
                    config={{
                      workflows_started: {
                        label: 'Started',
                        color: 'hsl(200, 85%, 70%)'
                      },
                      workflows_completed: {
                        label: 'Completed',
                        color: 'hsl(200, 85%, 55%)'
                      }
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
    </div>
  )
}
