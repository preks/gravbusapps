/**
 * WorkflowStatusColumn Component
 *
 * Renders workflow status within a spreadsheet cell.
 * Shows status badge, progress indicator, and inline actions.
 */

import React, { useState, useCallback } from 'react'
import {
  Badge,
  Button,
  Popover,
  PopoverContent,
  PopoverTrigger,
  Progress,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
  Spinner
} from '@newwork/nw-design-system'
import {
  Play,
  Pause,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Hand,
  ChevronRight,
  MoreHorizontal
} from 'lucide-react'
import type {
  WorkflowRowLink,
  WorkflowStatus,
  WorkflowStepDetail,
  WorkflowStatusColumnConfig
} from '../../types/automation'
import { getWorkflowStatusLabel, getWorkflowStatusColor, isTerminalStatus } from '../../types/automation'

export interface WorkflowStatusColumnProps {
  /** Row ID */
  rowId: string
  /** Workflow link for this row (if exists) */
  workflowLink?: WorkflowRowLink
  /** Column configuration */
  config?: WorkflowStatusColumnConfig
  /** Callback when user wants to view workflow details */
  onViewDetails?: (workflowId: string) => void
  /** Callback when user wants to claim the current task */
  onClaimTask?: (workflowId: string, stepIndex: number) => Promise<void>
  /** Callback when user wants to complete the current task */
  onCompleteTask?: (workflowId: string, stepIndex: number) => Promise<void>
  /** Callback to trigger workflow for this row (when no workflow exists) */
  onTriggerWorkflow?: (rowId: string) => Promise<void>
  /** Current user ID for checking task assignment */
  currentUserId?: string
  /** Data test ID */
  'data-testid'?: string
}

/**
 * Get icon for workflow status
 */
function getStatusIcon(status: WorkflowStatus) {
  switch (status) {
    case 'PENDING':
      return Clock
    case 'RUNNING':
      return RefreshCw
    case 'COMPLETED':
      return CheckCircle
    case 'FAILED':
      return XCircle
    case 'CANCELED':
      return Pause
    case 'TIMED_OUT':
      return AlertTriangle
    default:
      return Clock
  }
}

/**
 * Format step status for display
 */
function getStepStatusBadge(status: WorkflowStepDetail['status']) {
  const variants: Record<WorkflowStepDetail['status'], 'success' | 'destructive' | 'warning' | 'info' | 'offline'> = {
    PENDING: 'offline',
    IN_PROGRESS: 'info',
    COMPLETED: 'success',
    REJECTED: 'destructive',
    SKIPPED: 'offline'
  }

  const labels: Record<WorkflowStepDetail['status'], string> = {
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    REJECTED: 'Rejected',
    SKIPPED: 'Skipped'
  }

  return { variant: variants[status], label: labels[status] }
}

/**
 * WorkflowStatusColumn Component
 */
export const WorkflowStatusColumn: React.FC<WorkflowStatusColumnProps> = ({
  rowId,
  workflowLink,
  config = {
    automationId: '',
    showProgress: true,
    allowActions: true,
    showStepDetails: true,
    clickToViewDetail: true
  },
  onViewDetails,
  onClaimTask,
  onCompleteTask,
  onTriggerWorkflow,
  currentUserId,
  'data-testid': testId = 'workflow-status-column'
}) => {
  const [isClaimingTask, setIsClaimingTask] = useState(false)
  const [isCompletingTask, setIsCompletingTask] = useState(false)
  const [isTriggeringWorkflow, setIsTriggeringWorkflow] = useState(false)

  // Handle claim task
  const handleClaimTask = useCallback(async () => {
    if (!workflowLink || !onClaimTask) return

    setIsClaimingTask(true)
    try {
      await onClaimTask(workflowLink.workflowId, workflowLink.currentStepIndex)
    } finally {
      setIsClaimingTask(false)
    }
  }, [workflowLink, onClaimTask])

  // Handle complete task
  const handleCompleteTask = useCallback(async () => {
    if (!workflowLink || !onCompleteTask) return

    setIsCompletingTask(true)
    try {
      await onCompleteTask(workflowLink.workflowId, workflowLink.currentStepIndex)
    } finally {
      setIsCompletingTask(false)
    }
  }, [workflowLink, onCompleteTask])

  // Handle trigger workflow
  const handleTriggerWorkflow = useCallback(async () => {
    if (!onTriggerWorkflow) return

    setIsTriggeringWorkflow(true)
    try {
      await onTriggerWorkflow(rowId)
    } finally {
      setIsTriggeringWorkflow(false)
    }
  }, [rowId, onTriggerWorkflow])

  // No workflow link - show trigger button or empty state
  if (!workflowLink) {
    if (onTriggerWorkflow) {
      return (
        <div className="gba:flex gba:items-center gba:justify-center" data-testid={testId}>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleTriggerWorkflow}
            disabled={isTriggeringWorkflow}
            className="gba:text-xs gba:text-muted-foreground gba:hover:text-foreground"
          >
            {isTriggeringWorkflow ? (
              <Spinner size="sm" className="gba:mr-1" />
            ) : (
              <Play className="gba:w-3 gba:h-3 gba:mr-1" />
            )}
            Run Workflow
          </Button>
        </div>
      )
    }

    return (
      <div className="gba:text-center gba:text-muted-foreground gba:text-xs" data-testid={testId}>
        —
      </div>
    )
  }

  const { workflowStatus, currentStepIndex, totalSteps, stepDetails, errorMessage } = workflowLink
  const StatusIcon = getStatusIcon(workflowStatus)
  const statusColor = getWorkflowStatusColor(workflowStatus)
  const statusLabel = getWorkflowStatusLabel(workflowStatus)
  const isTerminal = isTerminalStatus(workflowStatus)
  const progressPercent = totalSteps > 0 ? Math.round((currentStepIndex / totalSteps) * 100) : 0

  // Get current step details if available
  const currentStep = stepDetails?.[currentStepIndex]
  const isAssignedToCurrentUser = currentStep?.assignedTo === currentUserId
  const canClaim = currentStep?.status === 'PENDING' && config.allowActions && onClaimTask
  const canComplete = currentStep?.status === 'IN_PROGRESS' && isAssignedToCurrentUser && config.allowActions && onCompleteTask

  // Build badge variant based on status
  const badgeVariant =
    statusColor === 'success'
      ? 'success'
      : statusColor === 'destructive'
        ? 'destructive'
        : statusColor === 'warning'
          ? 'warning'
          : statusColor === 'info'
            ? 'info'
            : 'outline'

  // Simple status badge view
  const statusBadge = (
    <Badge variant={badgeVariant as 'default'} className="gba:gap-1 gba:cursor-default">
      <StatusIcon
        className={`gba:w-3 gba:h-3 ${workflowStatus === 'RUNNING' ? 'gba:animate-spin' : ''}`}
      />
      <span className="gba:text-xs">{statusLabel}</span>
    </Badge>
  )

  // Progress view
  const progressView = config.showProgress && !isTerminal && (
    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
      <Progress value={progressPercent} className="gba:h-1 gba:flex-1" />
      <span className="gba:text-xs gba:text-muted-foreground gba:whitespace-nowrap">
        {currentStepIndex + 1}/{totalSteps}
      </span>
    </div>
  )

  // If no details needed, just show badge with progress
  if (!config.showStepDetails && !config.allowActions) {
    return (
      <div className="gba:flex gba:flex-col gba:gap-1" data-testid={testId}>
        {statusBadge}
        {progressView}
      </div>
    )
  }

  // Full view with popover for details
  return (
    <TooltipProvider>
      <Popover>
        <PopoverTrigger asChild>
          <div
            className={`gba:flex gba:flex-col gba:gap-1 gba:p-1 gba:rounded-md gba:cursor-pointer gba:hover:bg-muted/50 gba:transition-colors ${
              config.clickToViewDetail ? '' : 'gba:cursor-default'
            }`}
            data-testid={testId}
          >
            {statusBadge}
            {progressView}
          </div>
        </PopoverTrigger>

        <PopoverContent className="gba:w-80" align="start">
          <div className="gba:space-y-4">
            {/* Header */}
            <div className="gba:flex gba:items-center gba:justify-between">
              <div>
                <h4 className="gba:font-semibold gba:text-foreground">Workflow Status</h4>
                <p className="gba:text-xs gba:text-muted-foreground">ID: {workflowLink.workflowId.slice(0, 8)}...</p>
              </div>
              {statusBadge}
            </div>

            {/* Progress */}
            {!isTerminal && (
              <div>
                <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
                  <span className="gba:text-sm gba:text-muted-foreground">Progress</span>
                  <span className="gba:text-sm gba:font-medium">
                    Step {currentStepIndex + 1} of {totalSteps}
                  </span>
                </div>
                <Progress value={progressPercent} className="gba:h-2" />
              </div>
            )}

            {/* Error message */}
            {errorMessage && (
              <div className="gba:bg-destructive/10 gba:text-destructive gba:text-sm gba:p-2 gba:rounded-md">
                {errorMessage}
              </div>
            )}

            {/* Step details */}
            {config.showStepDetails && stepDetails && stepDetails.length > 0 && (
              <div>
                <span className="gba:text-sm gba:font-medium gba:text-foreground gba:block gba:mb-2">Steps</span>
                <div className="gba:space-y-2">
                  {stepDetails.map((step, index) => {
                    const { variant, label } = getStepStatusBadge(step.status)
                    const isCurrent = index === currentStepIndex

                    return (
                      <div
                        key={index}
                        className={`gba:flex gba:items-center gba:justify-between gba:p-2 gba:rounded-md ${
                          isCurrent ? 'gba:bg-primary/10 gba:border gba:border-primary/20' : 'gba:bg-muted/50'
                        }`}
                      >
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <span className="gba:w-5 gba:h-5 gba:rounded-full gba:bg-muted gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-medium">
                            {index + 1}
                          </span>
                          <div>
                            <span className="gba:text-sm gba:font-medium">{step.title}</span>
                            {step.assignedTo && (
                              <span className="gba:text-xs gba:text-muted-foreground gba:block">
                                {step.assignedTo === currentUserId ? 'Assigned to you' : 'Assigned'}
                              </span>
                            )}
                          </div>
                        </div>
                        <Badge variant={variant as 'default'} className="gba:text-xs">
                          {label}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Actions */}
            {config.allowActions && !isTerminal && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:pt-2 gba:border-t">
                {canClaim && (
                  <Button size="sm" variant="outline" onClick={handleClaimTask} disabled={isClaimingTask}>
                    {isClaimingTask ? (
                      <Spinner size="sm" className="gba:mr-1" />
                    ) : (
                      <Hand className="gba:w-3 gba:h-3 gba:mr-1" />
                    )}
                    Claim Task
                  </Button>
                )}

                {canComplete && (
                  <Button size="sm" onClick={handleCompleteTask} disabled={isCompletingTask}>
                    {isCompletingTask ? (
                      <Spinner size="sm" className="gba:mr-1" />
                    ) : (
                      <CheckCircle className="gba:w-3 gba:h-3 gba:mr-1" />
                    )}
                    Complete
                  </Button>
                )}

                {config.clickToViewDetail && onViewDetails && (
                  <Button size="sm" variant="ghost" onClick={() => onViewDetails(workflowLink.workflowId)}>
                    <Eye className="gba:w-3 gba:h-3 gba:mr-1" />
                    View Details
                  </Button>
                )}
              </div>
            )}

            {/* Completed actions */}
            {isTerminal && config.clickToViewDetail && onViewDetails && (
              <div className="gba:pt-2 gba:border-t">
                <Button size="sm" variant="ghost" onClick={() => onViewDetails(workflowLink.workflowId)}>
                  <Eye className="gba:w-3 gba:h-3 gba:mr-1" />
                  View Details
                </Button>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </TooltipProvider>
  )
}

/**
 * Compact variant for table cells with limited width
 */
export const WorkflowStatusBadge: React.FC<{
  status: WorkflowStatus
  currentStep?: number
  totalSteps?: number
  onClick?: () => void
}> = ({ status, currentStep, totalSteps, onClick }) => {
  const StatusIcon = getStatusIcon(status)
  const statusColor = getWorkflowStatusColor(status)
  const statusLabel = getWorkflowStatusLabel(status)

  const badgeVariant =
    statusColor === 'success'
      ? 'success'
      : statusColor === 'destructive'
        ? 'destructive'
        : statusColor === 'warning'
          ? 'warning'
          : statusColor === 'info'
            ? 'info'
            : 'outline'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant={badgeVariant as 'default'}
            className={`gba:gap-1 ${onClick ? 'gba:cursor-pointer' : 'gba:cursor-default'}`}
            onClick={onClick}
          >
            <StatusIcon
              className={`gba:w-3 gba:h-3 ${status === 'RUNNING' ? 'gba:animate-spin' : ''}`}
            />
            {currentStep !== undefined && totalSteps !== undefined && (
              <span className="gba:text-xs">
                {currentStep + 1}/{totalSteps}
              </span>
            )}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{statusLabel}</p>
          {currentStep !== undefined && totalSteps !== undefined && (
            <p className="gba:text-xs gba:text-muted-foreground">
              Step {currentStep + 1} of {totalSteps}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

export default WorkflowStatusColumn
