/**
 * TaskDetailDialog Component
 * Minimal general task information view - specific task templates will have dedicated views
 */

import React from 'react'
import { Card, CardContent, CardHeader, Badge, Button, Alert, AlertDescription } from '@newwork/nw-design-system'
import { CheckCircle, Info, Zap, X, ExternalLink } from 'lucide-react'
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
import { ExpenseApprovalDetails } from './task-details/ExpenseApprovalDetails'
import { ExpensePlanApprovalDetails } from './task-details/ExpensePlanApprovalDetails'
import { SickLeaveAcknowledgementDetails } from './task-details/SickLeaveAcknowledgementDetails'
import { EnterSickLeaveDetails } from './task-details/EnterSickLeaveDetails'
import { EnterEmployeeVacationDetails } from './task-details/EnterEmployeeVacationDetails'
import { EnterRequestedFeedbackDetails } from './task-details/EnterRequestedFeedbackDetails'
import { ReviewAddressChangeDetails } from './task-details/ReviewAddressChangeDetails'
import { ApproveAdvancePaymentDetails } from './task-details/ApproveAdvancePaymentDetails'
import { ApproveFeedbackDetails } from './task-details/ApproveFeedbackDetails'
import { ApproveSpecialLeaveDetails } from './task-details/ApproveSpecialLeaveDetails'
import { ApproveDocumentDetails } from './task-details/ApproveDocumentDetails'
import { AcknowledgeDocumentDetails } from './task-details/AcknowledgeDocumentDetails'
import { TransferAdvancePaymentDetails } from './task-details/TransferAdvancePaymentDetails'
import { ApprovePersonalInformationChangeDetails } from './task-details/ApprovePersonalInformationChangeDetails'
import { HandOutAdvancePaymentDetails } from './task-details/HandOutAdvancePaymentDetails'
import { UniversalKogitoTaskDetails } from './task-details/UniversalKogitoTaskDetails'
import { useTaskDetails } from '../hooks/useTaskDetails'
import { getModuleInfo } from '../utils/moduleIcons'

interface TaskDetailDialogProps {
  task: UnifiedTask | null
  onClose: () => void
  onTaskUpdated: () => void
  onTaskCompleted?: (taskId: string) => void
  accessToken: string
  userId?: string
  employeeId?: string // Employee ID for approval comments
  userInfo?: any // User info for team absence calendar
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  onClose,
  onTaskUpdated,
  onTaskCompleted,
  accessToken,
  userId,
  employeeId,
  userInfo
}) => {
  const [isCompleting, setIsCompleting] = React.useState(false)

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
    } catch {
      // Ignore parsing errors
    }

    return { domain: null, processName: null, processInstanceId: null }
  }

  const processInfo = React.useMemo(() => {
    const fromEndpoint = extractProcessInfo(task?.sourceMetadata?.endpoint as string)

    // CRITICAL: Use endpoint extraction FIRST, as direct fields might contain taskId instead of processInstanceId
    // Only fallback to direct fields if endpoint extraction fails
    const result = {
      domain: fromEndpoint.domain,
      processName: fromEndpoint.processName,
      processInstanceId:
        fromEndpoint.processInstanceId ||
        task?.workflowMeta?.rootWorkflowId ||
        task?.sourceMetadata?.processInstanceId ||
        null
    }

    return result
  }, [task])

  // Determine if this task type needs detailed task data
  // Document approval/acknowledgement tasks have all needed data in task.sourceMetadata.inputs
  const needsTaskDetails = React.useMemo(() => {
    if (!task || task.source !== 'kogito') return false

    const taskName = task.name?.toLowerCase() || ''

    // Tasks that DON'T need taskDetails (have all data in sourceMetadata.inputs)
    const tasksWithoutDetails = ['approve', 'acknowledge', 'approvefeedback']

    return !tasksWithoutDetails.includes(taskName)
  }, [task])

  // Fetch detailed task data for Kogito tasks using Kogito Processes API
  const { taskDetails } = useTaskDetails({
    taskId: task?.id || null,
    domain: processInfo.domain,
    processName: processInfo.processName,
    processInstanceId: processInfo.processInstanceId,
    accessToken,
    userId: userId || null,
    source: task?.source || 'cflow',
    enabled: needsTaskDetails
  })

  if (!task) return null

  const handleCompleteBlinkTask = async () => {
    if (!task.id || !task.flowId || !userId) {
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
        throw new Error(errorData.error || 'Failed to complete task')
      }

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

        // Extract just the path from the endpoint URL
        // Format: /processes/{domain}/{processName}/{processInstanceId}/{taskName}/{taskId}
        const url = new URL(endpoint)
        const endpointPath = url.pathname

        // Navigate to the endpoint path - platform's routing should handle it
        navigateTo(endpointPath)
        onClose()
      } catch {
        // Ignore URL parsing errors
      }
      return
    }

    // For CFlow tasks with endpoint (non-blink tasks)
    if (task.source === 'cflow' && task.sourceMetadata?.endpoint && !isBlinkTask) {
      try {
        const endpoint = task.sourceMetadata.endpoint as string

        const url = new URL(endpoint)
        navigateTo(url.pathname)
        onClose()
      } catch {
        // Ignore URL parsing errors
      }
      return
    }
  }

  // Get task title
  // For Kogito tasks, prefer referenceTaskName (most descriptive with context)
  // Then fallback to nodeName, title, or name
  // For CFlow tasks, use title or name
  const getTaskTitle = () => {
    // Special handling for feedback task - include employee name
    if (task.source === 'kogito' && task.name?.toLowerCase().includes('enterrequestedfeedback')) {
      const receiverName = task.sourceMetadata?.inputs?.creatorName || 'Employee'
      return `Enter Feedback for ${receiverName}`
    }

    return task.source === 'kogito'
      ? task.referenceTaskName || task.sourceMetadata?.nodeName || task.name || 'Untitled Task'
      : task.title || task.name || 'Untitled Task'
  }

  const taskTitle = getTaskTitle()

  // Get task description/message
  const taskDescription = task.description || task.message

  // Check if task has an endpoint to open
  const hasEndpoint = !!task.sourceMetadata?.endpoint

  // Check if this is a blink (quick-task)
  const isBlinkTask = task.source === 'cflow' && task.tags?.app === 'quick-task'

  // Check if this is an enter sick leave task
  const isEnterSickLeave = task.source === 'kogito' && task.name?.toLowerCase().includes('entersickleave')

  // Check if this is an enter employee vacation task
  const isEnterEmployeeVacation = task.source === 'kogito' && task.name?.toLowerCase().includes('enteremployeevacation')

  // Check if this is an enter requested feedback task
  const isEnterRequestedFeedback =
    task.source === 'kogito' && task.name?.toLowerCase().includes('enterrequestedfeedback')

  // Check if this is a sick leave acknowledgement task
  const isSickLeaveAcknowledgement =
    task.source === 'kogito' && task.name?.toLowerCase().includes('acknowledgesickleave')

  // Debug logging
  console.log('🔍 TaskDetailDialog - isSickLeaveAcknowledgement:', isSickLeaveAcknowledgement, {
    taskSource: task.source,
    taskName: task.name,
    taskNameLower: task.name?.toLowerCase(),
    includesCheck: task.name?.toLowerCase().includes('acknowledgesickleave'),
    taskDetails: taskDetails,
    hasTaskDetails: !!taskDetails,
    taskStatus: task.status,
    willRender: isSickLeaveAcknowledgement && !!taskDetails
  })

  // Check if this is an approval task (from Kogito)
  // Approval tasks typically have names starting with "approve" or contain "approval"
  const isApprovalTask =
    task.source === 'kogito' &&
    (task.name?.toLowerCase().includes('approve') || task.title?.toLowerCase().includes('approval'))

  // Detect specific approval task types
  // Note: More specific checks MUST come before generic checks to avoid false positives
  const isExpenseRequestStoreDirectorApproval =
    task.source === 'kogito' && task.name?.toLowerCase() === 'approveexpenserequeststoredirector'
  const isExpenseApproval =
    task.source === 'kogito' &&
    task.name?.toLowerCase().includes('approveexpenserequest') &&
    !isExpenseRequestStoreDirectorApproval
  const isExpensePlanApproval = task.source === 'kogito' && task.name?.toLowerCase().includes('approveexpenseplan')
  const isAbsenceApproval =
    task.source === 'kogito' &&
    (task.name?.toLowerCase().includes('approveemployeevacation') ||
      task.name?.toLowerCase().includes('approveabsence') ||
      task.name?.toLowerCase().includes('approveemployeeworkleave'))
  const isAddressChangeApproval = task.source === 'kogito' && task.name?.toLowerCase().includes('approvechangeaddress')
  const isAdvancePaymentApproval =
    task.source === 'kogito' && task.name?.toLowerCase().includes('approveadvancepayment')
  const isFeedbackApproval = task.source === 'kogito' && task.name?.toLowerCase().includes('approvefeedback')
  const isSpecialLeaveApproval =
    task.source === 'kogito' && task.name?.toLowerCase().includes('approveemployeespecialleave')
  const isDocumentApproval = task.source === 'kogito' && task.name?.toLowerCase() === 'approve'
  const isDocumentAcknowledgement = task.source === 'kogito' && task.name?.toLowerCase() === 'acknowledge'
  const isTransferAdvancePayment = task.source === 'kogito' && task.name?.toLowerCase() === 'transferadvancepayment'
  const isHandOutAdvancePayment = task.source === 'kogito' && task.name?.toLowerCase() === 'handoutadvancepayment'
  const isPersonalInfoChangeApproval =
    task.source === 'kogito' && task.name?.toLowerCase().includes('approvepersonalinformationchange')

  // Get module info for module badge
  const moduleInfo = getModuleInfo(task.name, task.type)
  const ModuleIcon = moduleInfo.icon

  return (
    <Card className="gba:h-full gba:flex gba:flex-col gba:shadow-lg" data-testid="task-detail-dialog">
      {/* Header with Close Button */}
      <CardHeader className="gba:border-b gba:pb-3 gba:pt-3">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-4">
          <div className="gba:flex-1">
            <h2 className="gba:text-xl gba:font-bold gba:mb-2" data-testid="task-detail-title">
              {taskTitle}
            </h2>
            {/* Badges */}
            <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
              {/* Module Badge */}
              <Badge variant="outline" data-testid="task-detail-module" className="gba:flex gba:items-center gba:gap-1">
                <ModuleIcon className={`gba:h-3 gba:w-3 ${moduleInfo.color}`} />
                {moduleInfo.name}
              </Badge>
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
      <CardContent className="gba:flex-1 gba:overflow-y-auto gba:pt-4 gba:px-4">
        {/* Enter Sick Leave: Show dedicated entry view (taskDetails may be null for completed tasks) */}
        {isEnterSickLeave ? (
          <EnterSickLeaveDetails
            task={task}
            taskDetails={taskDetails}
            accessToken={accessToken}
            userInfo={userInfo}
            onTaskCompleted={onTaskCompleted || (() => {})}
            onTaskUpdated={onTaskUpdated}
            onClose={onClose}
          />
        ) : /* Enter Employee Vacation: Show dedicated vacation entry view */
        isEnterEmployeeVacation ? (
          <EnterEmployeeVacationDetails
            task={task}
            taskDetails={taskDetails}
            accessToken={accessToken}
            userInfo={userInfo}
            onTaskCompleted={onTaskCompleted || (() => {})}
            onTaskUpdated={onTaskUpdated}
            onClose={onClose}
          />
        ) : /* Enter Requested Feedback: Show dedicated feedback entry view */
        isEnterRequestedFeedback ? (
          <EnterRequestedFeedbackDetails
            task={task}
            taskDetails={taskDetails}
            accessToken={accessToken}
            userInfo={userInfo}
            onTaskCompleted={onTaskCompleted || (() => {})}
            onTaskUpdated={onTaskUpdated}
            onClose={onClose}
          />
        ) : /* Sick Leave Acknowledgement: Show dedicated acknowledgement view */
        isSickLeaveAcknowledgement && taskDetails ? (
          <SickLeaveAcknowledgementDetails
            task={task}
            taskDetails={taskDetails}
            accessToken={accessToken}
            userInfo={userInfo}
            onTaskCompleted={onTaskCompleted || (() => {})}
            onTaskUpdated={onTaskUpdated}
            onClose={onClose}
          />
        ) : /* Document Acknowledgement: Show dedicated document acknowledgement view */
        isDocumentAcknowledgement ? (
          <AcknowledgeDocumentDetails task={task} accessToken={accessToken} />
        ) : /* Transfer Advance Payment: Show dedicated transfer confirmation view */
        isTransferAdvancePayment && taskDetails ? (
          <TransferAdvancePaymentDetails
            task={task}
            taskDetails={taskDetails}
            accessToken={accessToken}
            onTaskCompleted={onTaskCompleted || (() => {})}
            onTaskUpdated={onTaskUpdated}
            onClose={onClose}
          />
        ) : /* Hand Out Advance Payment: Show dedicated handout confirmation view */
        isHandOutAdvancePayment && taskDetails ? (
          <HandOutAdvancePaymentDetails
            task={task}
            taskDetails={taskDetails}
            accessToken={accessToken}
            onTaskCompleted={onTaskCompleted || (() => {})}
            onTaskUpdated={onTaskUpdated}
            onClose={onClose}
          />
        ) : /* Kogito approval tasks: Show dedicated approval view for both active and completed */
        isApprovalTask ? (
          <>
            {isExpenseRequestStoreDirectorApproval ? (
              <ExpenseApprovalDetails
                task={task}
                taskDetails={taskDetails}
                accessToken={accessToken}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
                employeeId={employeeId}
                isStoreDirectorApproval={true}
              />
            ) : isExpenseApproval ? (
              <ExpenseApprovalDetails
                task={task}
                taskDetails={taskDetails}
                accessToken={accessToken}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
                employeeId={employeeId}
              />
            ) : isExpensePlanApproval && taskDetails ? (
              <ExpensePlanApprovalDetails
                task={task}
                taskDetails={taskDetails}
                accessToken={accessToken}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
                employeeId={employeeId}
              />
            ) : isAbsenceApproval ? (
              <AbsenceApprovalDetails
                task={task}
                accessToken={accessToken}
                userInfo={userInfo}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
              />
            ) : isAddressChangeApproval && taskDetails ? (
              <ReviewAddressChangeDetails
                task={task}
                taskDetails={taskDetails}
                accessToken={accessToken}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
                employeeId={employeeId}
              />
            ) : isAdvancePaymentApproval && taskDetails ? (
              <ApproveAdvancePaymentDetails
                task={task}
                taskDetails={taskDetails}
                accessToken={accessToken}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
                employeeId={employeeId}
              />
            ) : isFeedbackApproval && taskDetails ? (
              <ApproveFeedbackDetails
                task={task}
                taskDetails={taskDetails}
                accessToken={accessToken}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
                employeeId={employeeId}
              />
            ) : isSpecialLeaveApproval ? (
              <ApproveSpecialLeaveDetails
                task={task}
                taskDetails={taskDetails}
                accessToken={accessToken}
                userInfo={userInfo}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
                employeeId={employeeId}
              />
            ) : isDocumentApproval ? (
              <ApproveDocumentDetails task={task} accessToken={accessToken} />
            ) : isPersonalInfoChangeApproval && taskDetails ? (
              <ApprovePersonalInformationChangeDetails
                task={task}
                taskDetails={taskDetails}
                accessToken={accessToken}
                userInfo={userInfo}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
                employeeId={employeeId}
              />
            ) : (
              /* Unknown approval task: Use universal view */
              <UniversalKogitoTaskDetails
                task={task}
                taskDetails={taskDetails}
                accessToken={accessToken}
                userInfo={userInfo}
                onTaskCompleted={onTaskCompleted || (() => {})}
                onTaskUpdated={onTaskUpdated}
                onClose={onClose}
              />
            )}
          </>
        ) : task.source === 'kogito' ? (
          /* For Kogito tasks without specific views: Use universal task details */
          <UniversalKogitoTaskDetails
            task={task}
            taskDetails={taskDetails}
            accessToken={accessToken}
            userInfo={userInfo}
            onTaskCompleted={onTaskCompleted || (() => {})}
            onTaskUpdated={onTaskUpdated}
            onClose={onClose}
          />
        ) : (
          /* For CFlow tasks and other sources: Show general info */
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
          </div>
        )}
      </CardContent>

      {/* Action buttons - Fixed at bottom (hidden for approval/acknowledgement/entry tasks with dedicated detail views) */}
      {!isApprovalTask &&
        !isSickLeaveAcknowledgement &&
        !isDocumentAcknowledgement &&
        !isTransferAdvancePayment &&
        !isHandOutAdvancePayment &&
        !isEnterSickLeave &&
        !isEnterEmployeeVacation &&
        !isEnterRequestedFeedback && (
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
