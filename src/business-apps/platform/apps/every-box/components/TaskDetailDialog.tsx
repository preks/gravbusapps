/**
 * TaskDetailDialog Component
 * Displays detailed task information for both Kogito and CFlow tasks
 */

import React, { useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  Badge,
  Button,
  Separator,
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { CheckCircle, User, Calendar, Info, Zap, X } from 'lucide-react'
import { message } from 'antd'
import { UnifiedTask } from '../types'
import {
  formatDateTime,
  getPriorityBadgeVariant,
  getTaskStatusBadgeVariant,
  formatTaskStatus,
  formatPriority
} from '../utils/taskFormatters'
import { navigateTo } from '@/common/utils/navigationUtils'
import { useEmployeeAvatar } from '../hooks/useEmployeeAvatar'
import { base64ToObjectURL } from '../utils/avatarUtils'
import { env } from '@/common/env/EnvUtils'

interface TaskDetailDialogProps {
  task: UnifiedTask | null
  onClose: () => void
  onTaskUpdated: () => void
  onTaskCompleted?: (taskId: string) => void // Callback to remove task from list immediately
  accessToken: string
  userId?: string
}

/**
 * InitiatorInfo - Shows task initiator with avatar and name
 */
interface InitiatorInfoProps {
  initiatorUserId: string
  accessToken: string
}

const InitiatorInfo: React.FC<InitiatorInfoProps> = ({ initiatorUserId, accessToken }) => {
  const { employeeData } = useEmployeeAvatar(accessToken, initiatorUserId)

  // Get display name and initials
  const displayName =
    employeeData?.displayName || `${employeeData?.firstName || ''} ${employeeData?.lastName || ''}`.trim() || 'Unknown'
  const initials = employeeData
    ? `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()
    : '?'

  // Convert base64 avatar to URL
  const avatarUrl = useMemo(() => {
    if (employeeData?.pictureThumbnail) {
      return base64ToObjectURL(employeeData.pictureThumbnail)
    }
    return undefined
  }, [employeeData?.pictureThumbnail])

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <Avatar className="gba:h-8 gba:w-8">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={displayName} /> : null}
        <AvatarFallback className="gba:text-xs">{initials}</AvatarFallback>
      </Avatar>
      <div className="gba:font-medium gba:text-sm">{displayName}</div>
    </div>
  )
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  onClose,
  onTaskUpdated,
  onTaskCompleted,
  accessToken,
  userId
}) => {
  const [isCompleting, setIsCompleting] = React.useState(false)

  if (!task) return null

  const handleCompleteBlinkTask = async () => {
    if (!task.id || !task.flowId || !userId) {
      console.error('[EveryBox] Missing required data for task completion:', {
        taskId: task.id,
        flowId: task.flowId,
        userId
      })
      alert('Unable to complete task: missing user information.')
      return
    }

    setIsCompleting(true)
    try {
      // Complete the CFlow task with userId
      const flowEngineApi =
        env('NEXT_PUBLIC_CUSTOM_FLOW_ENGINE_API_URL') || 'https://newwork-dev.newwork.com/flow-engine'
      const response = await fetch(`${flowEngineApi}/api/tasks/${task.id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          outcome: 'COMPLETED',
          userId: userId, // Required by the API
          variables: {}
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('[EveryBox] Task completion failed:', errorData)
        throw new Error(errorData.error || 'Failed to complete task')
      }

      console.log('[EveryBox] Blink task completed successfully')

      // Show success message
      message.success({
        content: '✓ Blink completed successfully!',
        duration: 3
      })

      // Remove task from list immediately (if callback provided)
      if (onTaskCompleted && task.id) {
        onTaskCompleted(task.id)
      }

      // Refresh the task list in background
      onTaskUpdated()

      // Close the dialog
      onClose()
    } catch (err) {
      console.error('[EveryBox] Error completing blink task:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete task'
      message.error({
        content: `Failed to complete task: ${errorMessage}`,
        duration: 5
      })
    } finally {
      setIsCompleting(false)
    }
  }

  const handleOpenTask = () => {
    // For Kogito tasks, navigate to the endpoint path
    if (task.source === 'kogito' && task.sourceMetadata?.endpoint) {
      try {
        const endpoint = task.sourceMetadata.endpoint as string
        console.log('[EveryBox] Opening Kogito task via endpoint:', endpoint)

        // Extract just the path from the endpoint URL
        // Format: /processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}
        const url = new URL(endpoint)
        const endpointPath = url.pathname

        console.log('[EveryBox] Navigating to path:', endpointPath)

        // Navigate to the endpoint path - platform's routing should handle it
        navigateTo(endpointPath)
        onClose()
      } catch (err) {
        console.error('[EveryBox] Error opening Kogito task:', err)
      }
      return
    }

    // For CFlow tasks with endpoint (non-blink tasks)
    if (task.source === 'cflow' && task.sourceMetadata?.endpoint && !isBlinkTask) {
      try {
        const endpoint = task.sourceMetadata.endpoint as string
        console.log('[EveryBox] Opening CFlow task via endpoint:', endpoint)

        const url = new URL(endpoint)
        navigateTo(url.pathname)
        onClose()
      } catch (err) {
        console.error('[EveryBox] Error opening CFlow task:', err)
      }
      return
    }

    console.warn('[EveryBox] No endpoint available for task:', task)
  }

  // Get task title
  const taskTitle = task.title || task.name || 'Untitled Task'

  // Get task description/message
  const taskDescription = task.description || task.message

  // Get creation/scheduled date
  const scheduledDate = task.scheduledAt || task.createdAt

  // Get task inputs/context data
  const taskInputs = task.sourceMetadata?.inputs || task.inputs

  // Check if task has an endpoint to open
  const hasEndpoint = !!task.sourceMetadata?.endpoint

  // Check if this is a blink (quick-task)
  // Tags are stored at the top level of UnifiedTask, not in sourceMetadata
  const isBlinkTask = task.source === 'cflow' && task.tags?.app === 'quick-task'

  // Get initiator ID from flow metadata
  // CFlow uses 'creatorUserId' field in sourceMetadata
  const initiatorUserId = task.sourceMetadata?.creatorUserId as string | undefined

  // Debug: Log task data for completed tasks
  if (task.status === 'COMPLETED') {
    console.log('[TaskDetailDialog] Completed task data:', {
      id: task.id,
      status: task.status,
      completedAt: task.completedAt,
      source: task.source,
      hasCompletedAt: !!task.completedAt,
      taskObject: task
    })
  }

  return (
    <Card className="gba:h-full gba:flex gba:flex-col gba:shadow-lg" data-testid="task-detail-dialog">
      {/* Header with Close Button */}
      <CardHeader className="gba:border-b gba:pb-4">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1">
            <h2 className="gba:text-2xl gba:font-bold gba:mb-3" data-testid="task-detail-title">
              {taskTitle}
            </h2>
            {/* Badges */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
              {isBlinkTask && (
                <Badge
                  variant="default"
                  className="gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600"
                  data-testid="task-detail-blink"
                >
                  <Zap className="gba:h-3 gba:w-3 gba:mr-1" />
                  Blink
                </Badge>
              )}
              <Badge variant={getPriorityBadgeVariant(task.priority)} data-testid="task-detail-priority">
                {formatPriority(task.priority)}
              </Badge>
              <Badge variant={getTaskStatusBadgeVariant(task.status)} data-testid="task-detail-status">
                {formatTaskStatus(task.status)}
              </Badge>
              <Badge variant="outline" data-testid="task-detail-source">
                {task.source === 'kogito' ? 'Kogito' : 'CFlow'}
              </Badge>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="gba:rounded-full gba:hover:bg-muted gba:flex-shrink-0"
            data-testid="task-detail-close-button"
          >
            <X className="gba:h-5 gba:w-5" />
          </Button>
        </div>
      </CardHeader>

      {/* Scrollable Content */}
      <CardContent className="gba:flex-1 gba:overflow-y-auto gba:pt-6">
        <div className="gba:space-y-4">
          {/* Task Details Grid - Compact version */}
          <div className="gba:flex gba:flex-wrap gba:gap-4 gba:text-sm">
            {/* Initiator (for CFlow tasks) */}
            {initiatorUserId && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <User className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-muted-foreground">From:</span>
                <InitiatorInfo initiatorUserId={initiatorUserId} accessToken={accessToken} />
              </div>
            )}

            {/* Scheduled/Created Date */}
            {scheduledDate && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-muted-foreground">Scheduled:</span>
                <span className="gba:font-medium" data-testid="task-detail-scheduled">
                  {formatDateTime(scheduledDate)}
                </span>
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                <span className="gba:text-muted-foreground">Due:</span>
                <span className="gba:font-medium" data-testid="task-detail-due-date">
                  {formatDateTime(task.dueDate)}
                </span>
              </div>
            )}

            {/* Completed Date - Only show for completed tasks */}
            {task.status === 'COMPLETED' && task.completedAt && (
              <div className="gba:flex gba:items-center gba:gap-2">
                <Calendar className="gba:h-4 gba:w-4 gba:text-success" />
                <span className="gba:text-success">Completed:</span>
                <span className="gba:font-medium gba:text-success" data-testid="task-detail-completed-at">
                  {formatDateTime(task.completedAt)}
                </span>
              </div>
            )}
          </div>

          {/* Description/Message */}
          {taskDescription && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-3 gba:text-lg">Description</h4>
                <p className="gba:text-sm gba:leading-relaxed gba:text-muted-foreground">{taskDescription}</p>
              </div>
            </>
          )}

          {/* Task inputs/context data */}
          {taskInputs && typeof taskInputs === 'object' && Object.keys(taskInputs).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-3 gba:text-lg">Task Context</h4>
                <div className="gba:bg-muted gba:p-4 gba:rounded-lg gba:space-y-3">
                  {Object.entries(taskInputs).map(([key, value]) => (
                    <div key={key} className="gba:flex gba:gap-3">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[140px]">
                        {key}:
                      </span>
                      <span className="gba:text-sm gba:flex-1 gba:break-words">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Info Alert */}
          {!hasEndpoint && !isBlinkTask && (
            <Alert>
              <Info className="gba:h-4 gba:w-4" />
              <AlertDescription className="gba:text-sm">
                This task can be viewed and managed from here. Use the task list to perform actions on it.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>

      {/* Action buttons - Fixed at bottom */}
      <div className="gba:border-t gba:p-4 gba:flex gba:gap-2 gba:justify-end gba:bg-muted/30">
        <Button variant="outline" onClick={onClose} data-testid="task-detail-cancel-button">
          Close
        </Button>

        {/* Primary action for Blink tasks: Complete directly */}
        {isBlinkTask && task.status !== 'COMPLETED' && (
          <Button
            onClick={handleCompleteBlinkTask}
            disabled={isCompleting}
            data-testid="task-detail-complete-button"
            className="gba:bg-gradient-to-r gba:from-blue-600 gba:to-indigo-600 gba:text-white"
          >
            <CheckCircle className="gba:mr-2 gba:h-4 gba:w-4" />
            {isCompleting ? 'Completing...' : 'Complete Task'}
          </Button>
        )}

        {/* Primary action for other tasks: Open in dedicated screen */}
        {!isBlinkTask && hasEndpoint && task.status !== 'COMPLETED' && (
          <Button onClick={handleOpenTask} data-testid="task-detail-open-button">
            <CheckCircle className="gba:mr-2 gba:h-4 gba:w-4" />
            Open Task
          </Button>
        )}
      </div>
    </Card>
  )
}
