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
import {
  AlertTriangle,
  Clock,
  TrendingDown,
  FileText,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  BarChart3
} from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import { useFlowManagementAnalytics } from '../../hooks/useFlowAnalytics'

interface SLATabProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

export const SLATab: React.FC<SLATabProps> = ({ prefixDataTestId = 'sla-tab', accessToken, ..._context }) => {
  const [timeframe, setTimeframe] = useState<'wtd' | 'mtd' | 'qtd' | 'ytd'>('mtd')

  const {
    data: analytics,
    isLoading,
    error,
    refetch
  } = useFlowManagementAnalytics({
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
          <h3>Error Loading SLA Analytics</h3>
          <p>{error instanceof Error ? error.message : 'Failed to load SLA analytics'}</p>
          <Button onClick={refetch} variant="secondary" className="gba:mt-2">
            Retry
          </Button>
        </div>
      </Alert>
    )
  }

  const statusMetrics = analytics?.statusMetrics
  const slaKillers = analytics?.slaKillers || []

  // SLA Alert Metrics Widgets
  const slaAlertWidgets: WidgetItem[] = [
    {
      key: 'overdue-tasks',
      title: 'Overdue Tasks',
      value: statusMetrics?.overdue_tasks || 0,
      prefix: <AlertTriangle className="gba:h-5 gba:w-5" />,
      color: '#ef4444',
      description: 'Tasks past their due date requiring immediate attention'
    },
    {
      key: 'overdue-percentage',
      title: 'Overdue Rate',
      value: statusMetrics?.overdue_percentage || 0,
      suffix: '%',
      precision: 1,
      prefix: <TrendingDown className="gba:h-5 gba:w-5" />,
      color: '#f59e0b',
      description: 'Percentage of pending tasks that are overdue'
    },
    {
      key: 'sla-violations',
      title: 'SLA Violations',
      value: slaKillers.reduce((sum, killer) => sum + killer.sla_violations, 0),
      prefix: <XCircle className="gba:h-5 gba:w-5" />,
      color: '#dc2626',
      description: 'Tasks completed after their due date (historical breaches)'
    },
    {
      key: 'critical-flows',
      title: 'Critical Flows',
      value: new Set(slaKillers.filter(killer => killer.violation_rate > 20).map(killer => killer.flow_name)).size,
      prefix: <AlertCircle className="gba:h-5 gba:w-5" />,
      color: '#7c2d12',
      description: 'Flow types where >20% of completed tasks finished late'
    }
  ]

  return (
    <div className="gba:space-y-6" data-testid={prefixDataTestId}>
      {/* Header with Timeframe Selector */}
      <div className="gba:flex gba:justify-between gba:items-center">
        <div>
          <h2 className="gba:text-2xl gba:font-bold gba:text-gray-900">SLA Monitoring & Alerts</h2>
          <p className="gba:text-gray-600">Real-time SLA compliance tracking and violation alerts</p>
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

      {/* SLA Alert KPIs */}
      <WidgetGroup
        widgets={slaAlertWidgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetch}
        skeletonCount={4}
        emptyText="No SLA alert data available"
        data-testid={`${prefixDataTestId}-alert-kpis`}
      />

      {/* SLA Violation Alerts - Critical Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-red-700">
            <AlertTriangle className="gba:h-5 gba:w-5" />
            Immediate Action Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(statusMetrics?.overdue_tasks || 0) === 0 ? (
            <div className="gba:text-center gba:py-8 gba:text-gray-500">
              <CheckCircle2 className="gba:h-12 gba:w-12 gba:mx-auto gba:mb-3 gba:text-green-500" />
              <p className="gba:text-lg gba:font-medium gba:text-green-700">No Overdue Tasks</p>
              <p>All pending tasks are within their SLA targets</p>
            </div>
          ) : (
            <div className="gba:space-y-4">
              <div className="gba:flex gba:items-center gba:gap-4 gba:p-4 gba:border gba:border-red-300 gba:bg-red-50 gba:rounded-lg">
                <div className="gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-lg gba:bg-red-200">
                  <AlertTriangle className="gba:h-6 gba:w-6 gba:text-red-700" />
                </div>

                <div className="gba:flex-1">
                  <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                    <h4 className="gba:font-semibold gba:text-gray-900">
                      {statusMetrics?.overdue_tasks} Overdue Tasks
                    </h4>
                    <Badge
                      variant="outline"
                      className="gba:text-xs gba:font-medium gba:border-red-500 gba:text-red-700"
                    >
                      {statusMetrics?.overdue_percentage?.toFixed(1)}% of pending tasks
                    </Badge>
                  </div>
                  <p className="gba:text-sm gba:text-gray-600 gba:mb-2">
                    Tasks that are past their due date and still pending completion
                  </p>
                  <div className="gba:flex gba:items-center gba:gap-6 gba:text-sm gba:text-gray-500">
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <FileText className="gba:h-3 gba:w-3" />
                      {statusMetrics?.pending_tasks} total pending
                    </span>
                    <span className="gba:flex gba:items-center gba:gap-1">
                      <Clock className="gba:h-3 gba:w-3" />
                      Immediate attention required
                    </span>
                  </div>
                </div>

                <div className="gba:flex gba:flex-col gba:gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gba:text-xs"
                    data-testid={`${prefixDataTestId}-view-overdue-tasks`}
                  >
                    <Eye className="gba:h-3 gba:w-3 gba:mr-1" />
                    View Tasks
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historical SLA Performance - For Analysis */}
      {slaKillers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:gap-2 gba:text-blue-700">
              <BarChart3 className="gba:h-5 gba:w-5" />
              Historical SLA Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="gba:space-y-4">
              {slaKillers.map((killer, index) => (
                <div
                  key={index}
                  className={`gba:flex gba:items-center gba:gap-4 gba:p-4 gba:border gba:rounded-lg ${
                    killer.violation_rate > 50
                      ? 'gba:border-red-300 gba:bg-red-50'
                      : killer.violation_rate > 20
                        ? 'gba:border-orange-300 gba:bg-orange-50'
                        : 'gba:border-yellow-300 gba:bg-yellow-50'
                  }`}
                  data-testid={`${prefixDataTestId}-sla-performance-${index}`}
                >
                  <div
                    className={`gba:flex gba:items-center gba:justify-center gba:w-12 gba:h-12 gba:rounded-lg ${
                      killer.violation_rate > 50
                        ? 'gba:bg-red-200'
                        : killer.violation_rate > 20
                          ? 'gba:bg-orange-200'
                          : 'gba:bg-yellow-200'
                    }`}
                  >
                    <BarChart3
                      className={`gba:h-6 gba:w-6 ${
                        killer.violation_rate > 50
                          ? 'gba:text-red-700'
                          : killer.violation_rate > 20
                            ? 'gba:text-orange-700'
                            : 'gba:text-yellow-700'
                      }`}
                    />
                  </div>

                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-3 gba:mb-2">
                      <h4 className="gba:font-semibold gba:text-gray-900">{killer.flow_name}</h4>
                      <Badge
                        variant="outline"
                        className={`gba:text-xs gba:font-medium ${
                          killer.violation_rate > 50
                            ? 'gba:border-red-500 gba:text-red-700'
                            : killer.violation_rate > 20
                              ? 'gba:border-orange-500 gba:text-orange-700'
                              : 'gba:border-yellow-500 gba:text-yellow-700'
                        }`}
                      >
                        {killer.violation_rate.toFixed(1)}% violation rate
                      </Badge>
                    </div>
                    <p className="gba:text-sm gba:text-gray-600 gba:mb-2">
                      Step: <span className="gba:font-medium">{killer.step_name}</span>
                    </p>
                    <div className="gba:flex gba:items-center gba:gap-6 gba:text-sm gba:text-gray-500">
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <FileText className="gba:h-3 gba:w-3" />
                        {killer.total_tasks} total tasks
                      </span>
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <XCircle className="gba:h-3 gba:w-3" />
                        {killer.sla_violations} violations
                      </span>
                      <span className="gba:flex gba:items-center gba:gap-1">
                        <Clock className="gba:h-3 gba:w-3" />
                        Avg overdue: {killer.avg_overdue_hours.toFixed(1)}h
                      </span>
                    </div>
                  </div>

                  <div className="gba:flex gba:flex-col gba:gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gba:text-xs"
                      data-testid={`${prefixDataTestId}-analyze-${index}`}
                    >
                      <Eye className="gba:h-3 gba:w-3 gba:mr-1" />
                      Analyze
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
