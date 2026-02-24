import React, { useState } from 'react'
import { Button, Badge, Tabs, TabsContent, TabsList, TabsTrigger, Alert } from '@newwork/nw-design-system'
import { ArrowLeft, Calendar, Clock, AlertCircle, CheckCircle } from 'lucide-react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getFlowEngineApiBaseUrl } from '@/common/network/flows/flowEngineUrl'
import { OverviewTab, WorkflowTab, DataTab, AuditTab } from './tabs'

// Helper function to calculate running time from start time (for incomplete workflows)
const calculateRunningTimeFromStart = (startTime: string): number => {
  const start = new Date(startTime)
  const now = new Date()
  return Math.round((now.getTime() - start.getTime()) / (1000 * 60))
}

// Helper function to format duration with minutes resolution
const formatDuration = (minutesDuration: number): string => {
  if (minutesDuration < 60) {
    const roundedMinutes = Math.round(minutesDuration)
    return `${roundedMinutes} minute${roundedMinutes === 1 ? '' : 's'}`
  } else if (minutesDuration < 1440) {
    // Less than 1 day (1440 minutes)
    const hours = Math.floor(minutesDuration / 60)
    const remainingMinutes = Math.round(minutesDuration % 60)
    if (remainingMinutes === 0) {
      return `${hours} hour${hours === 1 ? '' : 's'}`
    } else {
      return `${hours}h ${remainingMinutes}m`
    }
  } else {
    // For 1+ days, show days
    const days = Math.round(minutesDuration / 1440)
    return `${days} day${days === 1 ? '' : 's'}`
  }
}

// Helper function to format flow duration based on status
const formatFlowDuration = (flowData: FlowDetailData, minutesRunning: number): { label: string; duration: string } => {
  const isCompleted = flowData.status === 'COMPLETED' || flowData.endTime
  const duration = formatDuration(minutesRunning)

  return {
    label: isCompleted ? 'Completed in' : 'Running',
    duration: duration
  }
}

// Enhanced interfaces matching our backend data
interface StepStatus {
  completed: number
  total: number
  remaining: number
}

interface ProcessHealth {
  isOnTrack: boolean
  hasFailures: boolean
  isStalled: boolean
  statusMessage: string
}

interface TimeInsights {
  avgStepDurationMinutes?: number
  avgTaskCompletionMinutes?: number
  estimatedCompletionDate?: string
  isOverdue: boolean
  minutesRunning: number
  minutesSinceLastUpdate: number
  workflowStartTime: string
  lastActivityTime?: string
}

interface FlowDetailData {
  flowId: string
  flowName: string
  templateId: string
  status: string
  startTime: string
  updateTime: string
  endTime?: string
  progressPercentage: number
  stepStatus: StepStatus
  currentStep: number
  processHealth: ProcessHealth
  timeInsights: TimeInsights
  durationHours?: number
  durationMinutes?: number
}

// Real history data interfaces (from inbox implementation)
interface HistoryEvent {
  type: 'step' | 'assignment' | 'comment' | 'flow' | 'status'
  timestamp: string
  stepIndex: number
  stepTitle: string
  eventTitle: string
  description: string
  action?: string
  userId?: string
  userName?: string
  comment?: string
  metadata?: any
}

interface HistorySummary {
  totalSteps: number
  completedSteps: number
  totalAssignmentEvents: number
  totalComments: number
  participants: string[]
}

interface FlowDetailViewProps extends BusinessAppContextProps {
  flowId: string
  onBack?: () => void
  hiddenTabs?: string[]
  showBackButton?: boolean
}

function getWorkflowStatusMessage(status: string): string {
  if (status === 'RUNNING' || status === 'IN_PROGRESS') return 'On Track'
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'FAILED') return 'Failed'
  if (status === 'TIMED_OUT') return 'Timed Out'
  if (status === 'PAUSED') return 'Paused'
  if (status === 'TERMINATED') return 'Terminated'
  return 'Unknown'
}

function getStatusBadgeColor(status: string): string {
  if (status === 'COMPLETED') return '#10b981'
  if (status === 'IN_PROGRESS' || status === 'RUNNING') return '#3b82f6'
  if (status === 'TIMED_OUT') return '#f59e0b'
  return '#6b7280'
}

function getStatusEndLabel(status: string): string {
  if (status === 'COMPLETED') return 'Completed'
  if (status === 'TIMED_OUT') return 'Timed out'
  if (status === 'TERMINATED') return 'Terminated'
  return 'Failed'
}

function getTabGridCols(hiddenCount: number): string {
  if (hiddenCount === 0) return 'gba:grid-cols-4'
  if (hiddenCount === 1) return 'gba:grid-cols-3'
  if (hiddenCount === 2) return 'gba:grid-cols-2'
  return 'gba:grid-cols-1'
}

function transformFlowStep(step: any): Record<string, unknown> {
  return {
    id: step.id || `step-${step.stepIndex}`,
    title: step.title || 'Untitled Step',
    status: step.status || 'QUEUED',
    stepIndex: step.stepIndex || 0,
    assignedTo: step.assignedTo || undefined,
    completedBy: step.completedBy || undefined,
    totalForks: step.totalForks || undefined,
    completedForks: step.completedForks || undefined,
    totalTasks: step.totalTasks ?? step.total_tasks ?? undefined,
    completedTasks: step.completedTasks ?? step.completed_tasks ?? undefined,
    rejectedForks: step.rejectedForks || undefined,
    inProgressForks: step.inProgressForks || undefined,
    assignmentMode: step.assignmentMode || undefined,
    dueDate: step.dueDate || undefined,
    completedAt: step.completedAt || undefined,
    startedAt: step.startedAt || undefined,
    scheduledAt: step.scheduledAt || undefined,
    availableAt: step.availableAt || undefined,
    expectedStartAt: step.expectedStartAt || undefined,
    expectedFinishAt: step.expectedFinishAt || undefined,
    completionTimeMinutes: step.completionTimeMinutes || undefined
  }
}

function generateFallbackSteps(total: number, completed: number, currentStep: number): Record<string, unknown>[] {
  const steps: Record<string, unknown>[] = []
  for (let i = 1; i <= total; i++) {
    let stepStatus = 'QUEUED'
    if (i <= completed) stepStatus = 'COMPLETED'
    else if (i === currentStep) stepStatus = 'IN_PROGRESS'
    steps.push({
      id: `step-${i}`,
      title: `Step ${i}`,
      status: stepStatus,
      stepIndex: i - 1,
      assignedTo: undefined,
      dueDate: undefined,
      completedAt:
        i <= completed ? new Date(Date.now() - (completed - i) * 24 * 60 * 60 * 1000).toISOString() : undefined
    })
  }
  return steps
}

function transformAuditEntry(entry: any, index: number): HistoryEvent {
  let eventType: 'step' | 'assignment' | 'comment' | 'flow' | 'status' = 'step'
  const stepTitle = entry.taskName || 'Unknown Step'
  let eventTitle = entry.action || 'Unknown Action'
  let description = `${entry.userName || entry.userId || 'Unknown User'} performed ${entry.action}`
  const stepMatch = stepTitle.match(/Step (\d+)/i)
  let stepIndex = stepMatch ? Number.parseInt(stepMatch[1], 10) - 1 : index

  if (entry.action === 'WORKFLOW_STARTED' || entry.action === 'WORKFLOW_COMPLETED') {
    eventType = 'flow'
    stepIndex = entry.action === 'WORKFLOW_STARTED' ? -1 : 999
    eventTitle = entry.action === 'WORKFLOW_STARTED' ? 'Flow Started' : 'Flow Completed'
    description =
      entry.action === 'WORKFLOW_STARTED' ? 'Workflow was initiated by the system' : 'Workflow completed successfully'
  } else if (entry.action === 'CLAIM') {
    eventType = 'assignment'
    eventTitle = `${stepTitle} claimed`
    description = `${entry.userName || 'User'} claimed the task "${stepTitle}"`
  } else if (entry.action === 'UNCLAIM') {
    eventType = 'assignment'
    eventTitle = `${stepTitle} released`
    description = `${entry.userName || 'User'} released the task "${stepTitle}" back to available pool`
  } else if (entry.action === 'COMPLETE') {
    eventTitle = `${stepTitle} completed`
    description = `${entry.userName || 'User'} completed the step "${stepTitle}"`
  } else if (entry.details?.comment) {
    eventType = 'comment'
    eventTitle = `Comment on ${stepTitle}`
    description = entry.details.comment
  }

  return {
    type: eventType,
    timestamp: entry.timestamp,
    stepIndex,
    stepTitle:
      entry.action === 'WORKFLOW_STARTED' || entry.action === 'WORKFLOW_COMPLETED' ? 'Flow Execution' : stepTitle,
    eventTitle,
    description,
    action: entry.action,
    userId: entry.userId,
    userName: entry.userName || entry.userId,
    comment: entry.details?.comment,
    metadata: entry.details || {}
  }
}

export const FlowDetailView: React.FC<FlowDetailViewProps> = ({
  flowId,
  onBack,
  hiddenTabs = [],
  showBackButton = true,
  accessToken
}) => {
  const [flowData, setFlowData] = useState<FlowDetailData | null>(null)
  const [flowSteps, setFlowSteps] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')

  // Real history data state
  const [historyEvents, setHistoryEvents] = useState<HistoryEvent[]>([])
  const [historySummary, setHistorySummary] = useState<HistorySummary | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set())
  const [filteredEvents, setFilteredEvents] = useState<HistoryEvent[]>([])

  // Load comprehensive audit data from audit API
  const loadHistoryData = async () => {
    setHistoryLoading(true)
    setHistoryError(null)

    try {
      const API_BASE = getFlowEngineApiBaseUrl()
      // Use audit API instead of history API for comprehensive event data
      const response = await fetch(`${API_BASE}/audit/logs?flowId=${flowId}&limit=100`, {
        headers: {
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch audit data: ${response.status}`)
      }

      const auditData = await response.json()
      const auditEntries = auditData.data?.entries || []

      // Transform audit entries to HistoryEvent format
      const transformedEvents: HistoryEvent[] = auditEntries.map(transformAuditEntry)

      // Create additional comment events for entries that have comments
      const additionalCommentEvents: HistoryEvent[] = []
      auditEntries.forEach((entry: any, index: number) => {
        if (entry.details?.comment && entry.action !== 'COMMENT') {
          const stepTitle = entry.taskName || 'Unknown Step'
          const stepMatch = stepTitle.match(/Step (\d+)/i)
          const stepIndex = stepMatch ? Number.parseInt(stepMatch[1], 10) - 1 : index

          additionalCommentEvents.push({
            type: 'comment',
            timestamp: entry.timestamp,
            stepIndex: stepIndex,
            stepTitle: stepTitle,
            eventTitle: `Comment on ${stepTitle}`,
            description: `${entry.userName || 'User'} added: "${entry.details.comment}"`,
            action: 'COMMENT',
            userId: entry.userId,
            userName: entry.userName || entry.userId,
            comment: entry.details.comment,
            metadata: entry.details || {}
          })
        }
      })

      // Combine all events and sort by timestamp
      const allEvents = [...transformedEvents, ...additionalCommentEvents].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      // Calculate summary from combined audit data
      const workflowEvents = allEvents.filter(e => e.type === 'flow')
      const assignmentEvents = allEvents.filter(e => e.type === 'assignment')
      const stepEvents = allEvents.filter(e => e.type === 'step')
      const commentEvents = allEvents.filter(e => e.type === 'comment')
      const uniqueParticipants = [...new Set(allEvents.map(e => e.userId).filter(Boolean))]

      const summary: HistorySummary = {
        totalSteps: stepEvents.length,
        completedSteps: stepEvents.length,
        totalAssignmentEvents: assignmentEvents.length,
        totalComments: commentEvents.length,
        participants: uniqueParticipants as string[]
      }

      console.log('Audit Summary:', {
        totalEvents: allEvents.length,
        workflowEvents: workflowEvents.length,
        assignmentEvents: assignmentEvents.length,
        stepEvents: stepEvents.length,
        commentEvents: commentEvents.length,
        participants: uniqueParticipants.length
      })

      setHistoryEvents(allEvents) // Use combined events including separate comment events
      setHistorySummary(summary)
    } catch (err) {
      setHistoryError(err instanceof Error ? err.message : 'Failed to load audit data')
    } finally {
      setHistoryLoading(false)
    }
  }

  const toggleFilter = (filterType: string) => {
    const newFilters = new Set(activeFilters)
    if (newFilters.has(filterType)) {
      newFilters.delete(filterType)
    } else {
      newFilters.add(filterType)
    }
    setActiveFilters(newFilters)
  }

  const clearAllFilters = () => {
    setActiveFilters(new Set())
  }

  // Filter events whenever events or activeFilters change
  React.useEffect(() => {
    if (activeFilters.size === 0) {
      setFilteredEvents(historyEvents)
    } else {
      const filtered = historyEvents.filter(event => {
        if (activeFilters.has('steps') && (event.type === 'step' || event.action === 'COMPLETE')) return true
        if (activeFilters.has('assignmentEvents') && event.type === 'assignment') return true
        if (activeFilters.has('statusChanges') && event.type === 'status') return true
        if (activeFilters.has('comments') && event.type === 'comment') return true
        if (activeFilters.has('flowEvents') && event.type === 'flow') return true
        return false
      })
      setFilteredEvents(filtered)
    }
  }, [historyEvents, activeFilters])

  // Load history when tab becomes active or flowId changes
  React.useEffect(() => {
    if (activeTab === 'audit' && flowId) {
      loadHistoryData()
    }
  }, [activeTab, flowId, accessToken])

  // Fetch real flow data from enhanced progress API
  React.useEffect(() => {
    const fetchFlowDetail = async () => {
      try {
        setIsLoading(true)
        setError(null)

        const API_BASE = getFlowEngineApiBaseUrl()

        // Fetch both progress and steps data in parallel
        const [progressResponse, stepsResponse] = await Promise.all([
          fetch(`${API_BASE}/flows/${flowId}/progress`, {
            headers: {
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              'Content-Type': 'application/json'
            }
          }),
          fetch(`${API_BASE}/flows/${flowId}`, {
            headers: {
              ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
              'Content-Type': 'application/json'
            }
          })
        ])

        if (!progressResponse.ok) {
          throw new Error(`Failed to fetch progress: ${progressResponse.status} ${progressResponse.statusText}`)
        }

        if (!stepsResponse.ok) {
          throw new Error(`Failed to fetch flow details: ${stepsResponse.status} ${stepsResponse.statusText}`)
        }

        const [progressData, flowDetailData] = await Promise.all([progressResponse.json(), stepsResponse.json()])

        const progress = progressData.data?.flow
        const flowDetails = flowDetailData // API returns data directly, not under .data

        if (!progress) {
          throw new Error('No progress data found')
        }

        // Debug: Log the timeInsights data
        console.log('🔍 Raw progress.timeInsights:', progress.timeInsights)
        console.log('🔍 Full progress data:', progress)
        console.log('🔍 Flow details data:', flowDetails)
        console.log('🔍 Steps from API:', flowDetails?.steps)

        // Transform API data to match FlowDetailData interface
        // Use smart progress calculation from backend (already accounts for step weights and future steps)
        const actualProgressPercentage = progress.userTaskProgressPercentage || 0

        const flowData: FlowDetailData = {
          flowId: progress.rootWorkflowId,
          flowName: progress.rootWorkflowName || 'Unknown Workflow',
          templateId: progress.templateId,
          status: progress.workflowStatus,
          startTime: progress.timeInsights?.workflowStartTime || new Date().toISOString(),
          updateTime: progress.timeInsights?.lastActivityTime || new Date().toISOString(),
          progressPercentage: actualProgressPercentage,
          stepStatus: {
            completed: progress.completedSteps || 0,
            total: progress.totalSteps || 0,
            remaining: (progress.totalSteps || 0) - (progress.completedSteps || 0)
          },
          currentStep: (progress.completedSteps || 0) + 1,
          processHealth: progress.processHealth || {
            isOnTrack: progress.workflowStatus === 'RUNNING' || progress.workflowStatus === 'IN_PROGRESS',
            hasFailures: progress.workflowStatus === 'FAILED' || progress.workflowStatus === 'TIMED_OUT',
            isStalled: progress.workflowStatus === 'PAUSED' || progress.workflowStatus === 'TERMINATED',
            statusMessage: getWorkflowStatusMessage(progress.workflowStatus)
          },
          timeInsights: progress.timeInsights || {
            avgStepDurationMinutes: undefined,
            avgTaskCompletionMinutes: undefined,
            estimatedCompletionDate: undefined,
            isOverdue: false,
            minutesRunning: 0,
            minutesSinceLastUpdate: 0,
            workflowStartTime: new Date().toISOString(),
            lastActivityTime: undefined
          },
          durationHours: progress.timeInsights?.avgStepDurationHours
            ? progress.timeInsights.daysRunning * 24
            : undefined,
          durationMinutes: progress.timeInsights?.avgStepDurationHours
            ? progress.timeInsights.daysRunning * 24 * 60
            : undefined
        }

        setFlowData(flowData)

        // Transform steps data if available from flow details
        if (flowDetails?.steps) {
          console.log('🔍 Found steps, transforming...', flowDetails.steps.length, 'steps')
          const transformedSteps = flowDetails.steps.map(transformFlowStep)
          console.log('🔍 Transformed steps:', transformedSteps)
          setFlowSteps(
            [...transformedSteps].sort((a, b) => ((a.stepIndex as number) ?? 0) - ((b.stepIndex as number) ?? 0))
          )
        } else {
          console.log('🔍 No steps found, creating fallback steps')
          const steps = generateFallbackSteps(
            flowData.stepStatus.total,
            flowData.stepStatus.completed,
            flowData.currentStep
          )
          setFlowSteps([...steps].sort((a, b) => ((a.stepIndex as number) ?? 0) - ((b.stepIndex as number) ?? 0)))
        }

        setIsLoading(false)
      } catch (err) {
        console.error('Failed to fetch flow details:', err)
        setError(err instanceof Error ? err.message : 'Failed to load flow details')
        setIsLoading(false)
      }
    }

    if (flowId && accessToken) {
      fetchFlowDetail()
    }
  }, [flowId, accessToken])

  if (isLoading) {
    return (
      <div className="gba:h-screen gba:flex gba:items-center gba:justify-center">
        <div className="gba:text-center">
          <div className="gba:animate-spin gba:rounded-full gba:h-12 gba:w-12 gba:border-b-2 gba:border-blue-600 gba:mx-auto gba:mb-4"></div>
          <p className="gba:text-gray-600">Loading flow details...</p>
        </div>
      </div>
    )
  }

  if (error || !flowData) {
    return (
      <div className="gba:h-screen gba:flex gba:items-center gba:justify-center">
        <Alert variant="destructive" className="gba:max-w-md">
          <AlertCircle className="gba:h-4 gba:w-4" />
          <div>
            <h4 className="gba:font-semibold">Error Loading Flow</h4>
            <p className="gba:text-sm gba:mt-1">{error || 'Flow not found'}</p>
          </div>
        </Alert>
      </div>
    )
  }

  return (
    <div className="gba:flex gba:flex-col" style={{ backgroundColor: 'transparent' }}>
      {/* Header */}
      <div
        style={{
          backgroundColor: 'var(--color-surface-primary)',
          borderBottom: 'var(--border-width-thin) solid var(--color-border-default)',
          padding: `var(--spacing-6) ${showBackButton ? 'var(--spacing-6)' : '0'}`
        }}
      >
        {showBackButton && onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="gba:flex gba:items-center gba:gap-2 gba:mb-4"
            style={{ paddingLeft: 0 }}
          >
            <ArrowLeft className="gba:h-4 gba:w-4" />
            Back to Flows
          </Button>
        )}

        <div className="gba:flex gba:flex-col gba:gap-3 md:gba:flex-row md:gba:items-start md:gba:justify-between">
          <div className="gba:min-w-0">
            <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-3">
              <h1 className="gba:text-3xl gba:font-semibold gba:text-gray-900 gba:leading-tight gba:truncate">
                {flowData.flowName}
              </h1>
              <Badge
                variant="outline"
                className="gba:border-0 gba:text-white gba:rounded-full gba:px-4 gba:py-1 gba:text-sm gba:font-semibold"
                style={{ backgroundColor: getStatusBadgeColor(flowData.status) }}
              >
                {flowData.status}
              </Badge>
            </div>

            <div className="gba:mt-2 gba:flex gba:flex-wrap gba:items-center gba:gap-x-8 gba:gap-y-2 gba:text-sm gba:text-gray-600">
              <span className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:font-medium gba:text-gray-700">Flow ID:</span>
                <span className="gba:font-mono gba:px-3 gba:py-1 gba:rounded-full gba:bg-gray-100 gba:text-gray-800 gba:max-w-full gba:truncate">
                  {flowData.flowId}
                </span>
              </span>

              <span className="gba:flex gba:items-center gba:gap-2">
                <span className="gba:font-medium gba:text-gray-700">Progress:</span>
                <span>
                  {flowData.progressPercentage}% • {flowData.stepStatus.completed}/{flowData.stepStatus.total} steps
                </span>
              </span>

              <span className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4" />
                Started{' '}
                {new Date(flowData.startTime).toLocaleString('en-US', {
                  month: 'numeric',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true
                })}
              </span>

              <span className="gba:flex gba:items-center gba:gap-2">
                <Clock className="gba:h-4 gba:w-4" />
                {(() => {
                  const minutes =
                    flowData.timeInsights?.minutesRunning ?? calculateRunningTimeFromStart(flowData.startTime)
                  const { label, duration } = formatFlowDuration(flowData, minutes)
                  return `${label} ${duration}`
                })()}
              </span>

              {['COMPLETED', 'TIMED_OUT', 'TERMINATED', 'FAILED'].includes(flowData.status) && flowData.endTime && (
                <span className="gba:flex gba:items-center gba:gap-2 gba:text-gray-600">
                  <CheckCircle className="gba:h-4 gba:w-4" />
                  {getStatusEndLabel(flowData.status)}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:overflow-hidden">
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="gba:h-full gba:flex gba:flex-col"
          style={{ backgroundColor: 'var(--color-surface-primary)' }}
        >
          <div
            className="gba:mt-4 gba:pt-4 gba:pb-4"
            style={{
              backgroundColor: 'var(--color-surface-primary)',
              borderBottom: 'var(--border-width-thin) solid var(--color-border-default)',
              paddingLeft: showBackButton ? 'var(--spacing-6)' : '0',
              paddingRight: showBackButton ? 'var(--spacing-6)' : '0'
            }}
          >
            <TabsList
              className={`gba:grid gba:w-full gba:max-w-md ${getTabGridCols(hiddenTabs.length)}`}
              style={{ backgroundColor: 'transparent' }}
            >
              {!hiddenTabs.includes('overview') && <TabsTrigger value="overview">Overview</TabsTrigger>}
              {!hiddenTabs.includes('workflow') && <TabsTrigger value="workflow">Definition</TabsTrigger>}
              {!hiddenTabs.includes('data') && <TabsTrigger value="data">Data</TabsTrigger>}
              {!hiddenTabs.includes('audit') && <TabsTrigger value="audit">Audit</TabsTrigger>}
            </TabsList>
          </div>

          <div
            className="gba:flex-1 gba:overflow-auto"
            style={{
              backgroundColor: 'var(--color-surface-primary)',
              padding: 'var(--spacing-6)',
              paddingLeft: showBackButton ? 'var(--spacing-6)' : '0',
              paddingRight: showBackButton ? 'var(--spacing-6)' : '0'
            }}
          >
            {!hiddenTabs.includes('overview') && (
              <TabsContent value="overview">
                <OverviewTab flowData={flowData} flowSteps={flowSteps} />
              </TabsContent>
            )}

            {!hiddenTabs.includes('workflow') && (
              <TabsContent value="workflow">
                <WorkflowTab flowSteps={flowSteps} />
              </TabsContent>
            )}

            {!hiddenTabs.includes('data') && (
              <TabsContent value="data">
                <DataTab flowData={flowData} flowSteps={flowSteps} accessToken={accessToken} />
              </TabsContent>
            )}

            {!hiddenTabs.includes('audit') && (
              <TabsContent value="audit">
                <AuditTab
                  flowId={flowId}
                  historyEvents={historyEvents}
                  historySummary={historySummary}
                  historyLoading={historyLoading}
                  historyError={historyError}
                  activeFilters={activeFilters}
                  filteredEvents={filteredEvents}
                  toggleFilter={toggleFilter}
                  clearAllFilters={clearAllFilters}
                  loadHistoryData={loadHistoryData}
                />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  )
}
