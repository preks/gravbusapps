import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Badge, Progress } from '@newwork/nw-design-system'
import { Activity, Clock, User, Calendar } from 'lucide-react'

// Interfaces for the Overview tab
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

interface FlowStep {
  id: string
  title: string
  status: string
  assignedTo?: string
  completedBy?: string
  totalForks?: number
  completedForks?: number
  totalTasks?: number
  completedTasks?: number
  rejectedForks?: number
  inProgressForks?: number
  assignmentMode?: string
  dueDate?: string
  completedAt?: string
}

interface OverviewTabProps {
  flowData: FlowDetailData
  flowSteps: FlowStep[]
}

// Helper function to format date with time (hours and minutes)
const formatDateTime = (dateString: string): string => {
  const date = new Date(dateString)
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// Helper function to calculate running time from start time (for incomplete workflows)
const calculateRunningTimeFromStart = (startTime: string): number => {
  const start = new Date(startTime)
  const now = new Date()
  return Math.round((now.getTime() - start.getTime()) / (1000 * 60))
}

// Helper function to format running time with minutes resolution
const formatRunningTime = (minutesRunning: number): string => {
  // Handle edge cases
  if (!minutesRunning || minutesRunning <= 0) {
    return '0 minutes'
  }

  if (minutesRunning < 60) {
    const roundedMinutes = Math.round(minutesRunning)
    return `${roundedMinutes} minute${roundedMinutes === 1 ? '' : 's'}`
  } else if (minutesRunning < 1440) {
    // Less than 1 day (1440 minutes)
    const hours = Math.floor(minutesRunning / 60)
    const remainingMinutes = Math.round(minutesRunning % 60)
    if (remainingMinutes === 0) {
      return `${hours} hour${hours === 1 ? '' : 's'}`
    } else {
      return `${hours}h ${remainingMinutes}m`
    }
  } else {
    // For 1+ days, show days
    const days = Math.round(minutesRunning / 1440)
    return `${days} day${days === 1 ? '' : 's'}`
  }
}

// Helper function to format date with time (hours and minutes)
const formatDateTimeWithTime = (dateString: string): string => {
  if (!dateString) return 'N/A'
  try {
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'Invalid Date'
    return (
      date.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      }) +
      ' ' +
      date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    )
  } catch {
    return 'N/A'
  }
}

// ASSIGN mode: forks represent parallel assignments to specific users
const getAssignModeText = (step: FlowStep): string => {
  switch (step.assignedTo) {
    case 'MULTIPLE': {
      const completedCount = step.completedForks || 0
      const rejectedCount = step.rejectedForks || 0
      const totalCount = step.totalForks || 0
      if (step.status === 'COMPLETED') {
        return rejectedCount > 0
          ? `${completedCount} approved, ${rejectedCount} rejected of ${totalCount}`
          : `${completedCount} of ${totalCount} completed`
      }
      if (step.status === 'IN_PROGRESS') {
        return `${step.inProgressForks || 0} of ${totalCount} people`
      }
      return `${totalCount} people assigned`
    }
    case 'PENDING':
      return 'Will be assigned'
    case 'UNASSIGNED':
      return step.status === 'COMPLETED' ? 'Completed' : 'In Progress'
    default:
      return step.assignedTo ?? ''
  }
}

// CLAIM mode: multiple tasks represent claimable instances of the same work
const getClaimModeText = (step: FlowStep): string => {
  switch (step.assignedTo) {
    case 'AVAILABLE':
      return step.totalForks && step.totalForks > 1 ? `${step.totalForks} claimable task actions` : 'Available to claim'
    case 'PENDING':
      return step.status === 'SCHEDULED' ? 'Scheduled' : 'Queued'
    case 'UNASSIGNED':
      return step.status === 'COMPLETED' ? 'Completed' : 'In Progress'
    default:
      if (step.status === 'COMPLETED' && step.totalForks && step.totalForks > 1) {
        return `Completed by ${step.assignedTo} (${step.totalForks} task actions)`
      }
      return step.assignedTo ?? ''
  }
}

// Helper to determine background color for a step row
const getStepBackgroundColor = (status: string): string => {
  switch (status) {
    case 'COMPLETED':
      return 'rgba(16, 185, 129, 0.05)'
    case 'TIMED_OUT':
      return 'rgba(245, 158, 11, 0.05)'
    case 'FAILED':
      return 'rgba(239, 68, 68, 0.05)'
    case 'CANCELED':
      return 'rgba(107, 114, 128, 0.05)'
    default:
      return 'transparent'
  }
}

// Helper to determine step number circle style
const getStepNumberColor = (status: string): { backgroundColor: string; color: string } => {
  switch (status) {
    case 'COMPLETED':
      return { backgroundColor: '#10b981', color: 'white' }
    case 'IN_PROGRESS':
      return { backgroundColor: '#3b82f6', color: 'white' }
    case 'TIMED_OUT':
      return { backgroundColor: '#f59e0b', color: 'white' }
    case 'FAILED':
      return { backgroundColor: '#ef4444', color: 'white' }
    case 'CANCELED':
      return { backgroundColor: '#6b7280', color: 'white' }
    default:
      return { backgroundColor: '#e5e7eb', color: '#6b7280' }
  }
}

// Helper function to generate assignment display text based on step data
const getAssignmentDisplayText = (step: FlowStep): string => {
  if (!step.assignedTo) return ''
  return step.assignmentMode === 'ASSIGN' ? getAssignModeText(step) : getClaimModeText(step)
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ flowData, flowSteps }) => {
  // State to force re-render and update running time for incomplete workflows
  const [, setCurrentTime] = useState(Date.now())

  // Update the time every minute for running workflows
  useEffect(() => {
    // Only start interval if the workflow is still running (minutesRunning is null)
    if (flowData.timeInsights.minutesRunning === null) {
      const interval = setInterval(() => {
        setCurrentTime(Date.now())
      }, 60000) // Update every minute

      return () => clearInterval(interval)
    }
  }, [flowData.timeInsights.minutesRunning])
  return (
    <div className="gba:space-y-6 gba:mt-0">
      {/* Flow ID */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
        <span className="gba:font-medium gba:text-gray-700">Flow ID:</span>
        <code className="gba:bg-gray-100 gba:px-2 gba:py-1 gba:rounded gba:text-xs gba:font-mono">
          {flowData.flowId}
        </code>
      </div>

      <div className="gba:grid gba:grid-cols-2 gba:gap-6">
        {/* Progress Card */}
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              <Activity className="gba:h-5 gba:w-5" />
              Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-4">
            <div>
              <div className="gba:flex gba:justify-between gba:mb-2">
                <span className="gba:text-sm gba:text-gray-600">Overall Progress</span>
                <span className="gba:text-sm gba:font-medium">{flowData.progressPercentage}%</span>
              </div>
              <Progress value={flowData.progressPercentage} className="gba:h-2" />
            </div>

            <div className="gba:grid gba:grid-cols-3 gba:gap-4 gba:text-center">
              <div>
                <div className="gba:text-2xl gba:font-bold gba:text-green-600">{flowData.stepStatus.completed}</div>
                <div className="gba:text-xs gba:text-gray-600">Completed Steps</div>
              </div>
              <div>
                <div className="gba:text-2xl gba:font-bold gba:text-gray-600">{flowData.stepStatus.remaining}</div>
                <div className="gba:text-xs gba:text-gray-600">Remaining Steps</div>
              </div>
              <div>
                <div className="gba:text-2xl gba:font-bold gba:text-blue-600">{flowData.stepStatus.total}</div>
                <div className="gba:text-xs gba:text-gray-600">Total Steps</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Time Insights Card */}
        <Card>
          <CardHeader>
            <CardTitle className="gba:text-base gba:flex gba:items-center gba:gap-2">
              <Clock className="gba:h-5 gba:w-5" />
              Time Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="gba:space-y-3">
            <div className="gba:flex gba:justify-between">
              <span className="gba:text-sm gba:text-gray-600">Running Time</span>
              <span className="gba:text-sm gba:font-medium">
                {formatRunningTime(
                  flowData.timeInsights.minutesRunning ??
                    calculateRunningTimeFromStart(flowData.timeInsights.workflowStartTime)
                )}
              </span>
            </div>

            {/* Only show avg step duration if it's a valid positive number */}
            {flowData.timeInsights.avgStepDurationMinutes &&
            typeof flowData.timeInsights.avgStepDurationMinutes === 'number' &&
            flowData.timeInsights.avgStepDurationMinutes > 0 ? (
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-gray-600">Avg per Step</span>
                <span className="gba:text-sm gba:font-medium">
                  {formatRunningTime(flowData.timeInsights.avgStepDurationMinutes)}
                </span>
              </div>
            ) : null}

            {/* Only show avg task completion if it's a valid positive number */}
            {flowData.timeInsights.avgTaskCompletionMinutes &&
            typeof flowData.timeInsights.avgTaskCompletionMinutes === 'number' &&
            flowData.timeInsights.avgTaskCompletionMinutes > 0 ? (
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-gray-600">Avg Task Completion</span>
                <span className="gba:text-sm gba:font-medium">
                  {formatRunningTime(flowData.timeInsights.avgTaskCompletionMinutes)}
                </span>
              </div>
            ) : null}

            {flowData.timeInsights.minutesSinceLastUpdate !== undefined && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-gray-600">Since Last Update</span>
                <span className="gba:text-sm gba:font-medium">
                  {formatRunningTime(flowData.timeInsights.minutesSinceLastUpdate)}
                </span>
              </div>
            )}

            <div className="gba:flex gba:justify-between">
              <span className="gba:text-sm gba:text-gray-600">Started</span>
              <span className="gba:text-sm gba:font-medium">
                {formatDateTimeWithTime(flowData.timeInsights.workflowStartTime)}
              </span>
            </div>

            {flowData.timeInsights.lastActivityTime && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-gray-600">Last Activity</span>
                <span className="gba:text-sm gba:font-medium">
                  {formatDateTimeWithTime(flowData.timeInsights.lastActivityTime)}
                </span>
              </div>
            )}

            {flowData.timeInsights.estimatedCompletionDate && (
              <div className="gba:flex gba:justify-between">
                <span className="gba:text-sm gba:text-gray-600">Est. Completion</span>
                <span className="gba:text-sm gba:font-medium gba:text-blue-600">
                  {new Date(flowData.timeInsights.estimatedCompletionDate).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Steps Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="gba:text-base">Steps Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            {flowSteps.map((step, index) => {
              // Compute per-step progress from tasks when available
              const totalTasks = step.totalTasks ?? step.totalForks ?? 0
              const completedTasks = step.completedTasks ?? step.completedForks ?? 0
              const taskProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0
              const stepPercent = step.status === 'COMPLETED' ? 100 : taskProgress

              return (
                <div
                  key={step.id}
                  className="gba:flex gba:items-center gba:gap-4 gba:p-3 gba:border gba:rounded-lg"
                  style={{ backgroundColor: getStepBackgroundColor(step.status) }}
                >
                  <div
                    className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:rounded-full gba:text-sm gba:font-medium"
                    style={getStepNumberColor(step.status)}
                  >
                    {index + 1}
                  </div>

                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                      <h4 className="gba:font-medium gba:text-sm">{step.title}</h4>
                      <Badge variant="outline" className="gba:text-xs">
                        {step.status}
                      </Badge>
                    </div>
                    <div className="gba:mb-2">
                      <div className="gba:flex gba:items-center gba:justify-between gba:text-xs gba:text-gray-600 gba:mb-1">
                        <span>Step Progress</span>
                        <span>
                          {stepPercent}%{totalTasks > 0 ? ` • ${completedTasks}/${totalTasks} tasks` : ''}
                        </span>
                      </div>
                      <div className="gba:h-2 gba:bg-gray-100 gba:rounded-sm gba:overflow-hidden">
                        <div
                          className="gba:h-full gba:transition-all gba:duration-300"
                          style={{
                            width: `${Math.max(0, Math.min(100, stepPercent))}%`,
                            backgroundColor: step.status === 'COMPLETED' ? '#10b981' : '#3b82f6'
                          }}
                        />
                      </div>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-4 gba:text-xs gba:text-gray-600">
                      {step.assignedTo && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <User className="gba:w-3 gba:h-3" />
                          {getAssignmentDisplayText(step)}
                        </span>
                      )}
                      {step.dueDate && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Calendar className="gba:w-3 gba:h-3" />
                          Due: {formatDateTime(step.dueDate)}
                        </span>
                      )}
                      {step.completedAt && (
                        <span className="gba:text-green-600">✓ Completed {formatDateTime(step.completedAt)}</span>
                      )}
                      {step.completionTimeMinutes && (
                        <span className="gba:flex gba:items-center gba:gap-1">
                          <Clock className="gba:w-3 gba:h-3" />
                          {formatRunningTime(step.completionTimeMinutes)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
