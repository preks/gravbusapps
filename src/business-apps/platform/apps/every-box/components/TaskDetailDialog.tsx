/**
 * TaskDetailDialog Component
 * Minimal general task information view - specific task templates will have dedicated views
 */

import React from 'react'
import { Card, CardContent, CardHeader, Badge, Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { CheckCircle, Info, Zap, X, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'
import { message } from 'antd'
import { UnifiedTask } from '../types'
import {
  getPriorityBadgeVariant,
  getTaskStatusBadgeVariant,
  formatTaskStatus,
  formatPriority
} from '../utils/taskFormatters'
import { navigateTo } from '@/common/utils/navigationUtils'
import { env } from '@/common/env/EnvUtils'
import { AbsenceApprovalDetails } from './task-details/AbsenceApprovalDetails'
import { useTaskDetails } from '../hooks/useTaskDetails'

interface TaskDetailDialogProps {
  task: UnifiedTask | null
  onClose: () => void
  onTaskUpdated: () => void
  onTaskCompleted?: (taskId: string) => void
  accessToken: string
  userId?: string
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
  const [showRawData, setShowRawData] = React.useState(false)
  const [showVariables, setShowVariables] = React.useState(false)

  // Extract domain, processName, and processInstanceId from endpoint URL for Kogito tasks
  // Endpoint format: /processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}
  const extractProcessInfo = (endpoint?: string) => {
    if (!endpoint) return { domain: null, processName: null, processInstanceId: null }

    try {
      // Handle both full URLs and path-only strings
      const pathname = endpoint.startsWith('http') ? new URL(endpoint).pathname : endpoint
      const pathSegments = pathname.split('/').filter(Boolean)

      // Format: ['processes', 'domain', 'processName', 'processInstanceId', 'taskName', 'taskId']
      if (pathSegments.length >= 6 && pathSegments[0] === 'processes') {
        return {
          domain: pathSegments[1],
          processName: pathSegments[2],
          processInstanceId: pathSegments[3]
        }
      }
    } catch (error) {
      console.warn('[TaskDetailDialog] Failed to extract process info from endpoint:', error)
    }

    return { domain: null, processName: null, processInstanceId: null }
  }

  const processInfo = React.useMemo(() => {
    const fromEndpoint = extractProcessInfo(task?.sourceMetadata?.endpoint as string)

    // Try direct fields first, then fallback to endpoint extraction
    const result = {
      domain: fromEndpoint.domain,
      processName: fromEndpoint.processName,
      processInstanceId:
        task?.sourceMetadata?.processInstanceId ||
        task?.workflowMeta?.rootWorkflowId ||
        fromEndpoint.processInstanceId ||
        null
    }

    console.log('[TaskDetailDialog] Process info extraction:', {
      taskId: task?.id,
      endpoint: task?.sourceMetadata?.endpoint,
      extracted: result
    })

    return result
  }, [task])

  // Fetch detailed task data for Kogito tasks using Kogito Processes API
  const { taskDetails, isLoading: isLoadingDetails } = useTaskDetails({
    taskId: task?.id || null,
    domain: processInfo.domain,
    processName: processInfo.processName,
    processInstanceId: processInfo.processInstanceId,
    accessToken,
    userId: userId || null,
    source: task?.source || 'cflow',
    enabled: !!task && task.source === 'kogito'
  })

  // Log comparison between list data and detailed data
  React.useEffect(() => {
    if (taskDetails && task) {
      console.log('[TaskDetailDialog] 📊 Data Comparison:')
      console.log('  List Data (from inbox - FlowMetrics API):', {
        hasInputs: !!(task.sourceMetadata as any)?.inputs,
        inputsKeys: (task.sourceMetadata as any)?.inputs ? Object.keys((task.sourceMetadata as any).inputs) : [],
        sourceMetadata: task.sourceMetadata
      })
      console.log('  Detail Data (from Kogito Processes API):', {
        hasParameters: !!(taskDetails as any).parameters,
        parametersKeys: (taskDetails as any).parameters ? Object.keys((taskDetails as any).parameters) : [],
        hasResults: !!(taskDetails as any).results,
        resultsKeys: (taskDetails as any).results ? Object.keys((taskDetails as any).results) : [],
        fullDetails: taskDetails
      })

      // Check for differences
      const listInputsKeys = (task.sourceMetadata as any)?.inputs
        ? Object.keys((task.sourceMetadata as any).inputs)
        : []
      const detailParametersKeys = (taskDetails as any).parameters ? Object.keys((taskDetails as any).parameters) : []
      const hasNewData = detailParametersKeys.length > listInputsKeys.length
      const hasParameters = detailParametersKeys.length > 0

      console.log('[TaskDetailDialog] 🔍 Analysis:', {
        hasNewData,
        hasParameters,
        parametersCount: detailParametersKeys.length,
        listInputsCount: listInputsKeys.length
      })
    }
  }, [taskDetails, task])

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

  // Check if task has an endpoint to open
  const hasEndpoint = !!task.sourceMetadata?.endpoint

  // Check if this is a blink (quick-task)
  const isBlinkTask = task.source === 'cflow' && task.tags?.app === 'quick-task'

  // Check if this is an approval task (from Kogito)
  // Approval tasks typically have names starting with "approve" or contain "approval"
  const isApprovalTask =
    task.source === 'kogito' &&
    (task.name?.toLowerCase().includes('approve') || task.title?.toLowerCase().includes('approval'))

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

      {/* Scrollable Content - Route to specific task detail views */}
      <CardContent className="gba:flex-1 gba:overflow-y-auto gba:pt-6">
        {/* Kogito approval tasks: Show dedicated approval view */}
        {isApprovalTask && task.status !== 'COMPLETED' ? (
          <AbsenceApprovalDetails
            task={task}
            accessToken={accessToken}
            onTaskCompleted={onTaskCompleted}
            onTaskUpdated={onTaskUpdated}
            onClose={onClose}
          />
        ) : (
          <div className="gba:space-y-6">
            {/* Brief description if available */}
            {taskDescription && (
              <p className="gba:text-base gba:leading-relaxed gba:text-muted-foreground">{taskDescription}</p>
            )}

            {/* Info Alert - Different task templates have dedicated views */}
            <Alert>
              <Info className="gba:h-4 gba:w-4" />
              <AlertDescription className="gba:text-sm">
                {hasEndpoint ? (
                  <>
                    Click <strong>Open Task</strong> below to view full details and take action in the dedicated task
                    screen.
                  </>
                ) : isBlinkTask ? (
                  <>This is a quick Blink task. You can complete it directly from here.</>
                ) : (
                  <>
                    This task will open in its dedicated view where you can see all details and take appropriate
                    actions.
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* Additional Task Data - Parameters (Kogito only) */}
            {task.source === 'kogito' && taskDetails && (
              <div className="gba:space-y-4">
                {/* Parameters Section (business data) */}
                {(taskDetails as any).parameters && Object.keys((taskDetails as any).parameters).length > 0 && (
                  <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                    <button
                      onClick={() => setShowVariables(!showVariables)}
                      className="gba:w-full gba:px-4 gba:py-3 gba:bg-muted/50 gba:flex gba:items-center gba:justify-between gba:hover:bg-muted gba:transition-colors"
                      data-testid="task-detail-parameters-toggle"
                    >
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <span className="gba:font-medium gba:text-sm">Task Parameters</span>
                        <Badge variant="secondary" className="gba:text-xs">
                          {Object.keys((taskDetails as any).parameters).length} fields
                        </Badge>
                      </div>
                      {showVariables ? (
                        <ChevronUp className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                      ) : (
                        <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                      )}
                    </button>
                    {showVariables && (
                      <div
                        className="gba:p-4 gba:bg-muted/20 gba:max-h-96 gba:overflow-y-auto"
                        data-testid="task-detail-parameters-content"
                      >
                        <pre className="gba:text-xs gba:whitespace-pre-wrap gba:font-mono">
                          {JSON.stringify((taskDetails as any).parameters, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}

                {/* Loading indicator for detailed data */}
                {isLoadingDetails && (
                  <Alert>
                    <Info className="gba:h-4 gba:w-4" />
                    <AlertDescription className="gba:text-sm">Loading additional task details...</AlertDescription>
                  </Alert>
                )}

                {/* Raw Task Data (Debug) */}
                <div className="gba:border gba:rounded-lg gba:overflow-hidden">
                  <button
                    onClick={() => setShowRawData(!showRawData)}
                    className="gba:w-full gba:px-4 gba:py-3 gba:bg-muted/50 gba:flex gba:items-center gba:justify-between gba:hover:bg-muted gba:transition-colors"
                    data-testid="task-detail-raw-data-toggle"
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <span className="gba:font-medium gba:text-sm">Raw Task Data</span>
                      <Badge variant="outline" className="gba:text-xs">
                        Debug
                      </Badge>
                    </div>
                    {showRawData ? (
                      <ChevronUp className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    ) : (
                      <ChevronDown className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
                    )}
                  </button>
                  {showRawData && (
                    <div
                      className="gba:p-4 gba:bg-muted/20 gba:max-h-96 gba:overflow-y-auto"
                      data-testid="task-detail-raw-data-content"
                    >
                      <div className="gba:space-y-4">
                        <div>
                          <div className="gba:font-medium gba:text-sm gba:mb-2">List Data (Inbox):</div>
                          <pre className="gba:text-xs gba:whitespace-pre-wrap gba:font-mono">
                            {JSON.stringify(task, null, 2)}
                          </pre>
                        </div>
                        {taskDetails && (
                          <div>
                            <div className="gba:font-medium gba:text-sm gba:mb-2">Detailed Data (Single-Task):</div>
                            <pre className="gba:text-xs gba:whitespace-pre-wrap gba:font-mono">
                              {JSON.stringify(taskDetails, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Action buttons - Fixed at bottom (hidden for tasks with dedicated detail views) */}
      {!(isApprovalTask && task.status !== 'COMPLETED') && (
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

          {/* Primary action for tasks with endpoint: Open in dedicated screen */}
          {hasEndpoint && task.status !== 'COMPLETED' && (
            <Button
              onClick={handleOpenTask}
              data-testid="task-detail-open-button"
              className="gba:flex gba:items-center gba:gap-2"
            >
              <ExternalLink className="gba:h-4 gba:w-4" />
              Open Task
            </Button>
          )}
        </div>
      )}
    </Card>
  )
}
