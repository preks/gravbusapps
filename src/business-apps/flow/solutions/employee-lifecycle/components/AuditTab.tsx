import React, { useState, useEffect, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  Alert,
  Button,
  Badge,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { DebouncedInput } from '@/components/data-filter/DebouncedInput'
import { WidgetGroup, WidgetItem } from '@/components/widget-group'
import {
  FileSearch,
  Calendar,
  User,
  Activity,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Play,
  Pause,
  Search,
  Filter,
  RefreshCw,
  Download,
  Eye
} from 'lucide-react'
import { EmployeeLifecycleFlowService } from '../services/EmployeeLifecycleFlowService'
import { showToast } from '@/business-apps/fin/expenses/utils/notificationUtils'

export interface AuditTabProps extends BusinessAppContextProps {}

interface AuditLogEntry {
  id: string
  workflowId: string
  templateName: string
  eventType: 'STARTED' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'TASK_ASSIGNED' | 'TASK_COMPLETED'
  timestamp: string
  userId: string
  userName: string
  stepTitle?: string
  details?: string
  duration?: number // in minutes
  metadata?: Record<string, any>
}

interface AuditMetrics {
  totalEvents: number
  successfulCompletions: number
  failedExecutions: number
  averageDuration: number
  activeWorkflows: number
  eventsToday: number
  eventsThisWeek: number
  eventsThisMonth: number
}

export const AuditTab: React.FC<AuditTabProps> = context => {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([])
  const [auditMetrics, setAuditMetrics] = useState<AuditMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('all')
  const [timeRangeFilter, setTimeRangeFilter] = useState<string>('7d')
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize] = useState(20)

  const loadAuditData = useCallback(async () => {
    if (!context.accessToken) return

    try {
      setIsLoading(true)
      setError(null)

      // For now, we'll simulate audit data since the actual service implementation
      // would need to be extended. In a real implementation, this would call:
      // const auditData = await EmployeeLifecycleFlowService.getAuditLogs(context.accessToken, {
      //   timeRange: timeRangeFilter,
      //   eventType: eventTypeFilter,
      //   limit: pageSize,
      //   offset: (currentPage - 1) * pageSize
      // });

      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 800))

      // Mock audit logs
      const mockLogs: AuditLogEntry[] = [
        {
          id: '1',
          workflowId: 'wf-onb-001',
          templateName: 'Employee Onboarding Process',
          eventType: 'STARTED',
          timestamp: '2024-12-24T10:00:00Z',
          userId: 'user-123',
          userName: 'John Manager',
          details: 'Onboarding workflow initiated for new hire',
          metadata: { employeeName: 'Alice Johnson', department: 'Engineering' }
        },
        {
          id: '2',
          workflowId: 'wf-onb-001',
          templateName: 'Employee Onboarding Process',
          eventType: 'TASK_ASSIGNED',
          timestamp: '2024-12-24T10:01:00Z',
          userId: 'user-456',
          userName: 'IT Support',
          stepTitle: 'Request Employee Equipment & Workspace Setup',
          details: 'Task assigned to IT department for equipment preparation'
        },
        {
          id: '3',
          workflowId: 'wf-rec-002',
          templateName: 'Employee Recruiting Process',
          eventType: 'COMPLETED',
          timestamp: '2024-12-24T09:30:00Z',
          userId: 'user-789',
          userName: 'HR Specialist',
          duration: 180,
          details: 'Recruiting workflow completed successfully',
          metadata: { candidateName: 'Bob Smith', position: 'Software Engineer' }
        },
        {
          id: '4',
          workflowId: 'wf-onb-001',
          templateName: 'Employee Onboarding Process',
          eventType: 'TASK_COMPLETED',
          timestamp: '2024-12-24T11:00:00Z',
          userId: 'user-456',
          userName: 'IT Support',
          stepTitle: 'Request Employee Equipment & Workspace Setup',
          duration: 45,
          details: 'Equipment request completed and approved'
        },
        {
          id: '5',
          workflowId: 'wf-off-003',
          templateName: 'Employee Offboarding Process',
          eventType: 'FAILED',
          timestamp: '2024-12-24T08:15:00Z',
          userId: 'user-999',
          userName: 'HR Manager',
          details: 'Workflow failed due to missing approval',
          metadata: { error: 'APPROVAL_TIMEOUT', employeeName: 'Charlie Brown' }
        },
        {
          id: '6',
          workflowId: 'wf-train-004',
          templateName: 'Employee Training',
          eventType: 'STARTED',
          timestamp: '2024-12-23T14:20:00Z',
          userId: 'user-111',
          userName: 'Training Coordinator',
          details: 'Training workflow initiated for compliance training',
          metadata: { trainingType: 'Security Awareness', employeeCount: 15 }
        }
      ]

      // Mock metrics
      const mockMetrics: AuditMetrics = {
        totalEvents: 156,
        successfulCompletions: 132,
        failedExecutions: 8,
        averageDuration: 125, // minutes
        activeWorkflows: 16,
        eventsToday: 12,
        eventsThisWeek: 89,
        eventsThisMonth: 156
      }

      setAuditLogs(mockLogs)
      setAuditMetrics(mockMetrics)
    } catch (err) {
      console.error('Error loading employee lifecycle audit data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load audit data')
    } finally {
      setIsLoading(false)
    }
  }, [context.accessToken, timeRangeFilter, eventTypeFilter, currentPage, pageSize])

  // Load audit data on mount and when filters change
  useEffect(() => {
    loadAuditData()
  }, [loadAuditData])

  // Filter logs based on search term and event type
  useEffect(() => {
    let filtered = auditLogs

    // Filter by event type
    if (eventTypeFilter !== 'all') {
      filtered = filtered.filter(log => log.eventType === eventTypeFilter)
    }

    // Filter by search term
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase()
      filtered = filtered.filter(
        log =>
          log.templateName.toLowerCase().includes(searchLower) ||
          log.userName.toLowerCase().includes(searchLower) ||
          log.workflowId.toLowerCase().includes(searchLower) ||
          log.stepTitle?.toLowerCase().includes(searchLower) ||
          log.details?.toLowerCase().includes(searchLower)
      )
    }

    setFilteredLogs(filtered)
  }, [auditLogs, searchTerm, eventTypeFilter])

  // Calculate widgets from metrics
  const widgets: WidgetItem[] = auditMetrics
    ? [
        {
          key: 'total-events',
          title: 'Total Events',
          value: auditMetrics.totalEvents,
          prefix: <Activity className="gba:h-5 gba:w-5 gba:text-blue-600" />,
          color: '#3b82f6',
          description: `Past ${timeRangeFilter === '7d' ? '7 days' : timeRangeFilter === '30d' ? '30 days' : 'year'}`
        },
        {
          key: 'successful-completions',
          title: 'Successful Completions',
          value: auditMetrics.successfulCompletions,
          prefix: <CheckCircle className="gba:h-5 gba:w-5 gba:text-green-600" />,
          color: '#16a34a',
          description: `${((auditMetrics.successfulCompletions / auditMetrics.totalEvents) * 100).toFixed(1)}% success rate`
        },
        {
          key: 'active-workflows',
          title: 'Active Workflows',
          value: auditMetrics.activeWorkflows,
          prefix: <Play className="gba:h-5 gba:w-5 gba:text-orange-600" />,
          color: '#ea580c',
          description: 'Currently running'
        },
        {
          key: 'avg-duration',
          title: 'Avg. Duration',
          value: auditMetrics.averageDuration,
          suffix: 'min',
          prefix: <Clock className="gba:h-5 gba:w-5 gba:text-purple-600" />,
          color: '#9333ea',
          description: 'Average completion time'
        }
      ]
    : []

  const getEventTypeIcon = (eventType: string) => {
    switch (eventType) {
      case 'STARTED':
        return <Play className="gba:h-3 gba:w-3" />
      case 'COMPLETED':
        return <CheckCircle className="gba:h-3 gba:w-3" />
      case 'FAILED':
        return <XCircle className="gba:h-3 gba:w-3" />
      case 'CANCELLED':
        return <Pause className="gba:h-3 gba:w-3" />
      case 'TASK_ASSIGNED':
        return <User className="gba:h-3 gba:w-3" />
      case 'TASK_COMPLETED':
        return <CheckCircle className="gba:h-3 gba:w-3" />
      default:
        return <Activity className="gba:h-3 gba:w-3" />
    }
  }

  const getEventTypeBadgeVariant = (eventType: string) => {
    switch (eventType) {
      case 'STARTED':
        return 'gba:bg-blue-100 gba:text-blue-800'
      case 'COMPLETED':
        return 'gba:bg-green-100 gba:text-green-800'
      case 'FAILED':
        return 'gba:bg-red-100 gba:text-red-800'
      case 'CANCELLED':
        return 'gba:bg-gray-100 gba:text-gray-800'
      case 'TASK_ASSIGNED':
        return 'gba:bg-purple-100 gba:text-purple-800'
      case 'TASK_COMPLETED':
        return 'gba:bg-emerald-100 gba:text-emerald-800'
      default:
        return 'gba:bg-gray-100 gba:text-gray-800'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  }

  return (
    <div className="gba:space-y-6" data-testid="employee-lifecycle-audit-tab">
      {/* Page Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-6">
        <FileSearch className="gba:h-8 gba:w-8 gba:text-blue-600" />
        <div>
          <h1 className="gba:text-2xl gba:font-bold gba:text-gray-900">Audit Trail</h1>
          <p className="gba:text-gray-600">Complete audit log of employee lifecycle workflow activities</p>
        </div>
      </div>

      {/* Audit Metrics */}
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={loadAuditData}
        skeletonCount={4}
        emptyText="No audit metrics available."
        data-testid="employee-lifecycle-audit-metrics"
      />

      {/* Filters */}
      <div className="gba:bg-white gba:p-4 gba:rounded-lg gba:border">
        <div className="gba:flex gba:items-center gba:gap-4 gba:flex-wrap">
          <div className="gba:flex gba:items-center gba:gap-2">
            <Filter className="gba:h-4 gba:w-4 gba:text-gray-500" />
            <span className="gba:text-sm gba:font-medium gba:text-gray-700">Filters:</span>
          </div>

          {/* Search */}
          <div className="gba:flex-1 gba:min-w-[200px] gba:max-w-xs">
            <DebouncedInput
              placeholder="Search workflows, users..."
              value={searchTerm}
              onChange={setSearchTerm}
              debounceDelay={300}
              className="gba:w-full"
              data-testid="audit-search-input"
              icon={<Search className="gba:h-4 gba:w-4" />}
            />
          </div>

          {/* Event Type Filter */}
          <Select value={eventTypeFilter} onValueChange={setEventTypeFilter}>
            <SelectTrigger className="gba:w-36" data-testid="audit-event-type-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Events</SelectItem>
              <SelectItem value="STARTED">Started</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="TASK_ASSIGNED">Task Assigned</SelectItem>
              <SelectItem value="TASK_COMPLETED">Task Completed</SelectItem>
            </SelectContent>
          </Select>

          {/* Time Range Filter */}
          <Select value={timeRangeFilter} onValueChange={setTimeRangeFilter}>
            <SelectTrigger className="gba:w-32" data-testid="audit-time-range-filter">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1d">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>

          {/* Actions */}
          <Button
            variant="outline"
            size="sm"
            onClick={loadAuditData}
            data-testid="audit-refresh-button"
            disabled={isLoading}
            title="Refresh audit logs"
          >
            <RefreshCw className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
          </Button>

          <Button variant="outline" size="sm" data-testid="audit-export-button" title="Export audit logs">
            <Download className="gba:h-4 gba:w-4" />
          </Button>
        </div>
      </div>

      {/* Audit Logs Table */}
      {isLoading ? (
        <Card>
          <CardContent className="gba:p-6">
            <div className="gba:space-y-4">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="gba:flex gba:items-center gba:gap-4">
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-24 gba:animate-pulse"></div>
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-48 gba:animate-pulse"></div>
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-32 gba:animate-pulse"></div>
                  <div className="gba:h-4 gba:bg-gray-200 gba:rounded gba:w-40 gba:animate-pulse"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : error ? (
        <Alert variant="destructive" data-testid="audit-error-alert">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div className="gba:flex gba:items-center gba:justify-between gba:w-full">
            <div>
              <h4 className="gba:font-medium">Error Loading Audit Data</h4>
              <p className="gba:text-sm">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={loadAuditData} data-testid="audit-retry-button">
              Retry
            </Button>
          </div>
        </Alert>
      ) : filteredLogs.length === 0 ? (
        <Card data-testid="audit-empty-state">
          <CardContent className="gba:text-center gba:py-12">
            <FileSearch className="gba:h-16 gba:w-16 gba:mx-auto gba:text-gray-400 gba:mb-4" />
            <h3 className="gba:text-lg gba:font-medium gba:text-gray-900 gba:mb-2">
              {searchTerm || eventTypeFilter !== 'all' ? 'No matching audit logs found' : 'No audit logs available'}
            </h3>
            <p className="gba:text-gray-600">
              {searchTerm || eventTypeFilter !== 'all'
                ? 'Try adjusting your search criteria or filters.'
                : 'Audit logs will appear here as workflows are executed.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card data-testid="audit-logs-table">
          <CardHeader>
            <CardTitle className="gba:flex gba:items-center gba:justify-between">
              <span>Audit Logs ({filteredLogs.length})</span>
              <Badge variant="secondary">
                {timeRangeFilter === '7d' ? 'Last 7 days' : timeRangeFilter === '30d' ? 'Last 30 days' : 'All time'}
              </Badge>
            </CardTitle>
            <CardDescription>Detailed log of all workflow events and activities</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Step</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLogs.map(log => {
                  const { date, time } = formatTimestamp(log.timestamp)
                  return (
                    <TableRow key={log.id} data-testid={`audit-log-row-${log.id}`}>
                      <TableCell>
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium">{date}</div>
                          <div className="gba:text-xs gba:text-gray-500">{time}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getEventTypeBadgeVariant(log.eventType)}>
                          <div className="gba:flex gba:items-center gba:gap-1">
                            {getEventTypeIcon(log.eventType)}
                            <span className="gba:text-xs">{log.eventType.replace('_', ' ')}</span>
                          </div>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="gba:space-y-1">
                          <div className="gba:text-sm gba:font-medium">{log.templateName}</div>
                          <div className="gba:text-xs gba:text-gray-500 gba:font-mono">{log.workflowId}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.stepTitle ? (
                          <div className="gba:text-sm gba:text-gray-900">{log.stepTitle}</div>
                        ) : (
                          <span className="gba:text-xs gba:text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <User className="gba:h-3 gba:w-3 gba:text-gray-500" />
                          <span className="gba:text-sm">{log.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {log.duration ? (
                          <div className="gba:flex gba:items-center gba:gap-1">
                            <Clock className="gba:h-3 gba:w-3 gba:text-gray-500" />
                            <span className="gba:text-sm">{log.duration}m</span>
                          </div>
                        ) : (
                          <span className="gba:text-xs gba:text-gray-500">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" data-testid={`view-audit-details-${log.id}`}>
                          <Eye className="gba:h-3 gba:w-3" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

export default AuditTab
