import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Alert, Badge, Button } from '@newwork/nw-design-system'
import { TrendingUp, Target, Clock, Award, Workflow, Calendar, AlertCircle, GitBranch, CheckCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { useFlowAnalytics, useFlowsList } from '../../hooks/useFlowAnalytics'
import { FlowDetailView } from '../../../../common/components/flow-detail/FlowDetailView'

// Helper function to calculate days running from start time
const calculateDaysRunning = (startTime: string): number => {
  if (!startTime) return 0
  const start = new Date(startTime)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}

// Helper function to format last activity
const formatLastActivity = (flow: any): { label: string; time: string } => {
  const formatDateTime = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })
  }

  // Use lastActivityTime if it's more recent than updateTime, otherwise fall back to updateTime or startTime
  const lastActivity = flow.lastActivityTime || flow.updateTime || flow.startTime
  const isRecentActivity =
    flow.lastActivityTime && (!flow.updateTime || new Date(flow.lastActivityTime) > new Date(flow.updateTime))

  // Debug logging for OverviewTab
  console.debug('OverviewTab formatLastActivity for', flow.flowId, {
    lastActivityTime: flow.lastActivityTime,
    updateTime: flow.updateTime,
    startTime: flow.startTime,
    isRecentActivity,
    label: isRecentActivity ? 'Last activity' : 'Started'
  })

  return {
    label: isRecentActivity ? 'Last activity' : 'Started',
    time: formatDateTime(lastActivity)
  }
}

interface OverviewTabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  prefixDataTestId = 'flow-success-overview',
  accessToken
}) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('mtd')
  const [flowsSearch, setFlowsSearch] = useState('')
  const [flowsStatus, setFlowsStatus] = useState<string>('')
  const [flowsPage, setFlowsPage] = useState(0)
  const [flowsPageSize] = useState(10)
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null)

  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
    refetch: refetchAnalytics
  } = useFlowAnalytics({
    timeframe,
    includeBusinessMetrics: true,
    includeOperationalMetrics: false,
    accessToken
  })

  const {
    data: flowsList,
    isLoading: flowsLoading,
    error: flowsError
  } = useFlowsList({
    search: flowsSearch,
    status: flowsStatus || undefined,
    limit: flowsPageSize,
    offset: flowsPage * flowsPageSize,
    orderBy: 'updated_time',
    orderDirection: 'DESC',
    accessToken
  })

  const businessKpis = analytics?.businessKpis

  const error = analyticsError || flowsError

  // Reset paging when filters change
  React.useEffect(() => {
    setFlowsPage(0)
  }, [flowsSearch, flowsStatus])

  // If a flow is selected, show the detail view
  if (selectedFlowId) {
    return (
      <FlowDetailView
        flowId={selectedFlowId}
        variant="monitoring"
        onBack={() => setSelectedFlowId(null)}
        showBackButton={true}
        showActions={true}
        accessToken={accessToken}
      />
    )
  }

  // Helper function to format cycle time
  const formatCycleTime = (hours: number) => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60)
      return {
        value: minutes,
        suffix: minutes === 1 ? 'min' : 'min',
        precision: 0
      }
    } else {
      return {
        value: hours,
        suffix: 'h',
        precision: 1
      }
    }
  }

  // Prepare metrics data for WidgetGroup (without trend for now to fix layout)
  const avgCycleTimeHours = businessKpis?.avgCycleTime || 0
  const formattedCycleTime = formatCycleTime(avgCycleTimeHours)

  const kpiWidgets: WidgetItem[] = [
    {
      key: 'total-workflows',
      title: 'Total Workflows',
      value: businessKpis?.totalWorkflows || 0,
      prefix: <Target className="gba:h-5 gba:w-5" />,
      color: '#3b82f6',
      description: 'Workflows initiated this time period'
    },
    {
      key: 'completion-rate',
      title: 'Completion Rate',
      value: businessKpis?.completionRate || 0,
      suffix: '%',
      precision: 1,
      prefix: <Award className="gba:h-5 gba:w-5" />,
      color: '#10b981',
      description: 'Successfully completed flows'
    },
    {
      key: 'avg-cycle-time',
      title: 'Avg Cycle Time',
      value: formattedCycleTime.value,
      suffix: formattedCycleTime.suffix,
      precision: formattedCycleTime.precision,
      prefix: <Clock className="gba:h-5 gba:w-5" />,
      color: '#f59e0b',
      description: 'Average completion time'
    },
    {
      key: 'sla-adherence',
      title: 'SLA Adherence',
      value: businessKpis?.slaAdherence || 0,
      suffix: '%',
      precision: 1,
      prefix: <TrendingUp className="gba:h-5 gba:w-5" />,
      color: '#8b5cf6',
      description: 'On-time delivery rate'
    }
  ]

  if (error) {
    return (
      <div className="gba:space-y-6" data-testid={prefixDataTestId}>
        <Alert variant="destructive">
          <div>
            <h4 className="gba:font-semibold">Error Loading Dashboard Data</h4>
            <p className="gba:text-sm gba:mt-1">
              {error instanceof Error ? error.message : 'Failed to load analytics data'}
            </p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">Business Overview</h2>
          <p className="gba:text-gray-600">Key performance indicators and business outcomes</p>
        </div>

        {/* Timeframe Selector */}
        <div className="gba:flex gba:bg-white gba:rounded-lg gba:border gba:p-1">
          {[
            { key: 'wtd', label: 'Week' },
            { key: 'mtd', label: 'Month' },
            { key: 'qtd', label: 'Quarter' },
            { key: 'ytd', label: 'Year' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTimeframe(key as any)}
              className={`gba:px-3 gba:py-2 gba:text-sm gba:font-medium gba:rounded-md gba:transition-colors ${
                timeframe === key ? 'gba:bg-blue-100 gba:text-blue-700' : 'gba:text-gray-500 hover:gba:text-gray-700'
              }`}
              data-testid={`${prefixDataTestId}-timeframe-${key}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards - 4 Most Important Metrics */}
      <WidgetGroup
        widgets={kpiWidgets}
        isLoading={analyticsLoading}
        error={analyticsError}
        onRetry={refetchAnalytics}
        skeletonCount={4}
        emptyText="No KPI data available"
        data-testid={`${prefixDataTestId}-kpi-cards`}
      />

      {/* Recent Flows Section */}
      <Card>
        <CardHeader>
          <div className="gba:flex gba:items-center gba:justify-between">
            <div>
              <CardTitle className="gba:flex gba:items-center gba:gap-3 gba:text-xl gba:font-semibold">
                <div className="gba:flex gba:items-center gba:justify-center gba:w-10 gba:h-10 gba:bg-gradient-to-br gba:from-blue-500 gba:to-blue-600 gba:rounded-lg gba:shadow-sm">
                  <GitBranch className="gba:h-5 gba:w-5 gba:text-white" />
                </div>
                Recent Flows
              </CardTitle>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="gba:flex gba:gap-4 gba:mt-4">
            <div className="gba:flex-1">
              <DebouncedInput
                placeholder="Search flows..."
                value={flowsSearch}
                onChange={setFlowsSearch}
                className="gba:w-full gba:px-3 gba:py-2 gba:border gba:border-gray-300 gba:rounded-md gba:text-sm gba:bg-white gba:focus:outline-none gba:focus:ring-2 gba:focus:ring-blue-500 gba:focus:border-blue-500"
                data-testid={`${prefixDataTestId}-flows-search`}
              />
            </div>
            <select
              value={flowsStatus}
              onChange={e => setFlowsStatus(e.target.value)}
              className="gba:px-3 gba:py-2 gba:border gba:rounded-md gba:text-sm gba:bg-white"
              data-testid={`${prefixDataTestId}-flows-status-filter`}
            >
              <option value="">All Status</option>
              <option value="RUNNING">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="TIMED_OUT">Timed out</option>
              <option value="FAILED">Failed</option>
            </select>
          </div>
        </CardHeader>
        <CardContent>
          {flowsLoading ? (
            <div className="gba:space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg">
                  <div className="gba:w-10 gba:h-10 gba:bg-gray-200 gba:rounded gba:animate-pulse" />
                  <div className="gba:flex-1 gba:space-y-2">
                    <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:animate-pulse gba:w-2/3" />
                    <div className="gba:h-3 gba:bg-gray-200 gba:rounded gba:animate-pulse gba:w-1/2" />
                  </div>
                  <div className="gba:w-16 gba:h-6 gba:bg-gray-200 gba:rounded gba:animate-pulse" />
                </div>
              ))}
            </div>
          ) : flowsError ? (
            <Alert variant="destructive">
              <AlertCircle className="gba:h-4 gba:w-4" />
              <div>
                <h4 className="gba:font-semibold">Error Loading Flows</h4>
                <p className="gba:text-sm gba:mt-1">
                  {flowsError && typeof flowsError === 'object' && 'message' in flowsError
                    ? (flowsError as Error).message
                    : 'Failed to load flows'}
                </p>
              </div>
            </Alert>
          ) : !flowsList?.flows?.length ? (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <Workflow className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-3 gba:text-gray-300" />
              <p>No flows found</p>
            </div>
          ) : (
            <div className="gba:space-y-3">
              {flowsList.flows.map((flow, index) => (
                <div
                  key={flow.flowId}
                  className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:border gba:border-gray-200 gba:rounded-xl gba:hover:bg-gray-50 gba:hover:shadow-md gba:transition-all gba:duration-200 gba:cursor-pointer gba:bg-white"
                  data-testid={`${prefixDataTestId}-flow-${index}`}
                  onClick={() => {
                    setSelectedFlowId(flow.flowId)
                  }}
                >
                  <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:bg-gradient-to-br gba:from-blue-50 gba:to-blue-100 gba:rounded-lg gba:flex-shrink-0 gba:shadow-sm">
                    <Workflow className="gba:h-6 gba:w-6 gba:text-blue-600" />
                  </div>

                  <div className="gba:flex-1 gba:min-w-0">
                    <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                      <h4 className="gba:font-semibold gba:text-base gba:truncate gba:text-gray-900">
                        {flow.flowName || `Flow ${flow.flowId.slice(-8)}`}
                      </h4>
                      {(() => {
                        const status = flow.status
                        const statusClassName =
                          status === 'COMPLETED'
                            ? 'gba:bg-success gba:text-success-foreground'
                            : status === 'RUNNING' || status === 'IN_PROGRESS'
                              ? 'gba:bg-info gba:text-info-foreground'
                              : status === 'TIMED_OUT'
                                ? 'gba:bg-warning gba:text-warning-foreground'
                                : status === 'FAILED'
                                  ? 'gba:bg-destructive gba:text-destructive-foreground'
                                  : 'gba:bg-muted gba:text-muted-foreground'

                        return (
                          <Badge
                            variant="outline"
                            className={`gba:text-xs gba:font-medium gba:px-3 gba:py-1 gba:border-0 ${statusClassName}`}
                          >
                            {flow.status === 'COMPLETED'
                              ? 'COMPLETED'
                              : flow.status === 'RUNNING' || flow.status === 'IN_PROGRESS'
                                ? 'IN PROGRESS'
                                : flow.status === 'TIMED_OUT'
                                  ? 'TIMED OUT'
                                  : flow.status}
                          </Badge>
                        )
                      })()}
                    </div>
                    {/* Unified Progress and Status Line */}
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-gray-500 gba:mb-2">
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <Calendar className="gba:h-3 gba:w-3" />
                        {formatLastActivity(flow).label}: {formatLastActivity(flow).time}
                      </span>
                      <span>Progress: {flow.progressPercentage || 0}%</span>
                      <span>
                        {flow.stepStatus?.completed || 0}/{flow.stepStatus?.total || 0} steps
                      </span>
                    </div>

                    {/* Enhanced Time Insights with End Dates */}
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-gray-600 gba:flex-wrap">
                      {(flow.timeInsights || flow.startTime) && (
                        <>
                          {/* Show end date for completed flows, running time for active flows */}
                          {['COMPLETED', 'TIMED_OUT', 'TERMINATED', 'FAILED'].includes(flow.status) && flow.endTime ? (
                            <span className="gba:flex gba:items-center gba:gap-1 gba:text-gray-600">
                              <CheckCircle className="gba:h-3 gba:w-3" />
                              {flow.status === 'COMPLETED'
                                ? 'Completed'
                                : flow.status === 'TIMED_OUT'
                                  ? 'Timed out'
                                  : flow.status === 'TERMINATED'
                                    ? 'Terminated'
                                    : 'Failed'}
                              :{' '}
                              {new Date(flow.endTime).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          ) : (
                            <span className="gba:flex gba:items-center gba:gap-1 gba:text-blue-600 gba:font-medium">
                              <Clock className="gba:h-3 gba:w-3" />
                              Running {flow.timeInsights?.daysRunning || calculateDaysRunning(flow.startTime)} day
                              {(flow.timeInsights?.daysRunning || calculateDaysRunning(flow.startTime)) !== 1
                                ? 's'
                                : ''}
                            </span>
                          )}

                          {flow.timeInsights?.avgStepDurationHours && (
                            <span>~{flow.timeInsights.avgStepDurationHours.toFixed(1)}h per step</span>
                          )}

                          {flow.timeInsights?.estimatedCompletionDate &&
                            !['COMPLETED', 'TIMED_OUT', 'TERMINATED', 'FAILED'].includes(flow.status) && (
                              <span className="gba:text-blue-600 gba:font-medium">
                                Due:{' '}
                                {new Date(flow.timeInsights.estimatedCompletionDate).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            )}
                        </>
                      )}
                    </div>
                  </div>

                  <div className="gba:text-right gba:text-xs gba:text-gray-500 gba:flex-shrink-0">
                    <div>{flow.flowId.slice(-8)}</div>
                  </div>
                </div>
              ))}

              {/* Pagination */}
              {flowsList.totalCount > flowsPageSize && (
                <div className="gba:flex gba:items-center gba:justify-between gba:pt-4 gba:border-t">
                  <p
                    className="gba:text-sm gba:text-gray-500"
                    data-testid={`${prefixDataTestId}-flows-pagination-text`}
                  >
                    Showing {flowsPage * flowsPageSize + 1}-
                    {Math.min((flowsPage + 1) * flowsPageSize, flowsList.totalCount)} of {flowsList.totalCount} flows
                  </p>
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFlowsPage(Math.max(0, flowsPage - 1))}
                      disabled={flowsPage === 0}
                      data-testid={`${prefixDataTestId}-flows-prev-page`}
                    >
                      Previous
                    </Button>
                    <span className="gba:text-sm gba:text-gray-600" data-testid={`${prefixDataTestId}-flows-page`}>
                      Page {flowsPage + 1} of {Math.ceil(flowsList.totalCount / flowsPageSize)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFlowsPage(flowsPage + 1)}
                      disabled={!flowsList.hasMore}
                      data-testid={`${prefixDataTestId}-flows-next-page`}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
