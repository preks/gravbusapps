/**
 * TaskDetailDialog Component
 * Displays detailed task information for both Kogito and CFlow tasks
 */

import React, { useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Badge,
  Button,
  Separator,
  Alert,
  AlertDescription,
  Avatar,
  AvatarImage,
  AvatarFallback
} from '@newwork/nw-design-system'
import { CheckCircle, User, Calendar, Info, Zap } from 'lucide-react'
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
  open: boolean
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
  open,
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
      alert(`Failed to complete task: ${errorMessage}`)
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="gba:max-w-2xl gba:max-h-[80vh] gba:overflow-y-auto" data-testid="task-detail-dialog">
        <DialogHeader>
          <DialogTitle data-testid="task-detail-title">{taskTitle}</DialogTitle>
        </DialogHeader>

        <div className="gba:space-y-4">
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

          {/* Task Details Grid - Now above description */}
          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
            {/* Initiator (for CFlow tasks) */}
            {initiatorUserId && (
              <div>
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-2">
                  <User className="gba:h-4 gba:w-4" />
                  <span>From</span>
                </div>
                <InitiatorInfo initiatorUserId={initiatorUserId} accessToken={accessToken} />
              </div>
            )}

            {/* Scheduled/Created Date */}
            {scheduledDate && (
              <div>
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-1">
                  <Calendar className="gba:h-4 gba:w-4" />
                  <span>Scheduled</span>
                </div>
                <p className="gba:font-medium" data-testid="task-detail-scheduled">
                  {formatDateTime(scheduledDate)}
                </p>
              </div>
            )}

            {/* Due Date */}
            {task.dueDate && (
              <div>
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:mb-1">
                  <Calendar className="gba:h-4 gba:w-4" />
                  <span>Due Date</span>
                </div>
                <p className="gba:font-medium" data-testid="task-detail-due-date">
                  {formatDateTime(task.dueDate)}
                </p>
              </div>
            )}

            {/* Completed Date - Only show for completed tasks */}
            {task.status === 'COMPLETED' && task.completedAt && (
              <div>
                <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-success gba:mb-1">
                  <Calendar className="gba:h-4 gba:w-4" />
                  <span>Completed</span>
                </div>
                <p className="gba:font-medium gba:text-success" data-testid="task-detail-completed-at">
                  {formatDateTime(task.completedAt)}
                </p>
              </div>
            )}
          </div>

          {/* Description/Message - Now below metadata */}
          {taskDescription && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-2">Description</h4>
                <p className="gba:text-sm gba:text-muted-foreground">{taskDescription}</p>
              </div>
            </>
          )}

          {/* Task inputs/context data */}
          {taskInputs && typeof taskInputs === 'object' && Object.keys(taskInputs).length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="gba:font-semibold gba:mb-2">Task Context</h4>
                <div className="gba:bg-muted gba:p-3 gba:rounded-md gba:space-y-2">
                  {Object.entries(taskInputs).map(([key, value]) => (
                    <div key={key} className="gba:flex gba:gap-2">
                      <span className="gba:text-sm gba:font-medium gba:text-muted-foreground gba:min-w-[120px]">
                        {key}:
                      </span>
                      <span className="gba:text-sm gba:flex-1">
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

          {/* Action buttons */}
          <div className="gba:flex gba:gap-2 gba:justify-end">
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
        </div>
      </DialogContent>
    </Dialog>
  )
}
