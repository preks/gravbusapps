import React, { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { EnhancedEmployeeDisplay } from '../../../components/shared'
import { AssignTaskModal } from './AssignTaskModal'

// Import nw-design-system components
import {
  PageLayout,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Badge,
  Separator,
  Progress,
  Textarea,
  Alert,
  Spinner,
  Timeline,
  TimelineItem,
  TimelineHeader,
  TimelineSeparator,
  TimelineTitle,
  TimelineIndicator,
  TimelineContent,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type KpiCardData
} from '@newwork/nw-design-system'

// Fallback to Ant Design for components not yet available in nw-design-system
import { Typography, message, Descriptions } from 'antd'

// Import Phosphor icons
import {
  ArrowLeftIcon,
  UserIcon,
  ClockIcon,
  WarningIcon,
  CheckCircleIcon,
  ChatCircleIcon,
  PaperPlaneRightIcon,
  UserCheckIcon,
  UserMinusIcon,
  ArrowClockwiseIcon,
  TargetIcon,
  ClipboardIcon,
  InfoIcon,
  WarningCircleIcon,
  TrendUpIcon,
  Link as LinkIcon,
  EyeIcon,
  UsersIcon,
  LockIcon
} from '@phosphor-icons/react'

// Import types and hooks
import type { SubmittedRequest } from '../../../../packages/services-plus-core/src'
import { useTicketDetail } from '../hooks/useTicketDetail'
import { useTicketActions } from '../hooks/useTicketActions'
import { useEmployeeNamesBatch } from '../../../hooks/useEmployeeNamesBatch'
import { formatRequestId, getSLAStatus, formatStatusText } from '../../../utils'
import { createConductorWorkflowEngine } from '../../../services'
import { DynamicFormGenerator } from '../../../components/DynamicFormGenerator'
import { DynamicFormField, DynamicFormValues } from '../../../types/flowTemplate'
import { Step0DataRenderer } from '../../../components/shared/Step0DataRenderer'
import { formatDate, formatDateTime, formatTime } from '../../../config/dateTimeConfig'

const { Text } = Typography

// Comment visibility types and configuration
export type CommentVisibility = 'INTERNAL_TASK' | 'INTERNAL_FLOW' | 'EXTERNAL'

const COMMENT_VISIBILITY_CONFIG = {
  INTERNAL_TASK: {
    label: 'Task Only',
    description: 'Only visible to users assigned to this specific task',
    icon: LockIcon,
    badgeVariant: 'destructive' as const,
    color: 'gba:text-red-700 gba:bg-red-50 gba:border-red-200'
  },
  INTERNAL_FLOW: {
    label: 'Flow Team',
    description: 'Visible to users assigned to any task in this flow',
    icon: UsersIcon,
    badgeVariant: 'secondary' as const,
    color: 'gba:text-blue-700 gba:bg-blue-50 gba:border-blue-200'
  },
  EXTERNAL: {
    label: 'Public',
    description: 'Visible to all users (public comment)',
    icon: EyeIcon,
    badgeVariant: 'outline' as const,
    color: 'gba:text-green-700 gba:bg-green-50 gba:border-green-200'
  }
} as const

// Status configuration with Phosphor icons - updated for ALL original API status values
const STATUS_CONFIG = {
  // Core statuses
  SCHEDULED: { color: 'secondary', icon: TargetIcon, label: 'Scheduled' },
  OPEN: { color: 'secondary', icon: ClockIcon, label: 'Open' },
  IN_PROGRESS: { color: 'default', icon: TrendUpIcon, label: 'In Progress' },
  COMPLETED: { color: 'secondary', icon: CheckCircleIcon, label: 'Completed' },
  REJECTED: { color: 'outline', icon: UserMinusIcon, label: 'Rejected' },
  FAILED: { color: 'destructive', icon: WarningIcon, label: 'Failed' },
  PAUSED: { color: 'destructive', icon: WarningIcon, label: 'Paused' },
  // Workflow engine specific statuses (preserved as-is)
  READY: { color: 'secondary', icon: TargetIcon, label: 'Ready' },
  QUEUED: { color: 'secondary', icon: ClockIcon, label: 'Queued' },
  RUNNING: { color: 'default', icon: TrendUpIcon, label: 'Running' },
  DONE: { color: 'secondary', icon: CheckCircleIcon, label: 'Done' },
  ERROR: { color: 'destructive', icon: WarningIcon, label: 'Error' },
  CANCELLED: { color: 'outline', icon: UserMinusIcon, label: 'Cancelled' },
  CANCELED: { color: 'outline', icon: UserMinusIcon, label: 'Canceled' },
  SKIPPED: { color: 'outline', icon: CheckCircleIcon, label: 'Skipped' },
  TIMED_OUT: { color: 'destructive', icon: WarningIcon, label: 'Timed Out' },
  UNKNOWN: { color: 'outline', icon: ClockIcon, label: 'Unknown' }
} as const

export interface TaskRecordProps extends BusinessAppContextProps {
  taskId: string
  deskKey: string
  onClose?: () => void
  onTaskChange?: (taskId: string) => void
}

/**
 * System task data interface for AI AGENT and FUNCTION tasks
 * Provides type safety for system task-specific fields
 */
interface SystemTaskData {
  isSystemTask?: boolean
  taskType?: 'AI_AGENT' | 'FUNCTION' | 'USER'
  executionDetails?: {
    success?: boolean
    durationMs?: number
    startedAt?: string
    completedAt?: string
    status?: string
    resultData?: Record<string, unknown>
    error?: string
  }
  inputData?: Record<string, unknown>
  resultData?: Record<string, unknown>
  durationMs?: number
  startTime?: string
  endTime?: string
  error?: string
}

/**
 * Task Record - Comprehensive task detail view using Simple Page layout
 * Shows all task information with beautiful KPI cards and organized content sections
 */
export const TaskRecord: React.FC<TaskRecordProps> = ({ taskId, accessToken, userInfo, onClose, onTaskChange }) => {
  const [newComment, setNewComment] = useState('')
  const [commentVisibility, setCommentVisibility] = useState<CommentVisibility>('INTERNAL_TASK')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [fullRequest, setFullRequest] = useState<SubmittedRequest | null>(null)
  const [availableActions, setAvailableActions] = useState<any>(null)
  const [taskFormData, setTaskFormData] = useState<DynamicFormValues>({})
  const [isSubmittingTaskForm, setIsSubmittingTaskForm] = useState(false)
  const [isLoadingStepData, setIsLoadingStepData] = useState(false)
  const [step0Data, setStep0Data] = useState<any>(null)
  const [isLoadingStep0Data, setIsLoadingStep0Data] = useState(false)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)

  // Load task data
  const { ticket, isLoading, error, refetch } = useTicketDetail({
    ticketId: taskId,
    accessToken,
    userInfo
  })

  // Task actions
  const {
    claimTicket,
    unclaimTicket,
    assignTicket,
    completeTicket,
    rejectTicket,
    addComment,
    isLoading: isActionLoading
  } = useTicketActions({
    accessToken,
    userInfo,
    onSuccess: () => {
      // NOTE: Task IDs may change after actions due to workflow recreation
      // Refresh task detail and reload full request
      refetch()
      loadFullRequest()
      message.success('Task action completed successfully')

      // Suggest user to refresh the queue to see updated tasks
    }
  })

  // Batch fetch employee names for all comment authors and assignment users
  const allUserIds = useMemo(() => {
    if (!ticket) return []

    const userIds: string[] = []

    // Add comment authors
    if (ticket.comments) {
      for (const comment of ticket.comments) {
        const authorId = comment.authorId
        if (authorId) userIds.push(authorId)
      }
    }

    // Add assignment users
    if (ticket.assignedToUserId) userIds.push(ticket.assignedToUserId)
    if (ticket.claimedByUserId) userIds.push(ticket.claimedByUserId)
    if (ticket.flowInitiatedBy) userIds.push(ticket.flowInitiatedBy)

    // Add assignment history users (changedBy and changedTo)
    const assignmentHistory = (ticket as any).assignment?.assignmentHistory
    if (assignmentHistory && Array.isArray(assignmentHistory)) {
      for (const historyItem of assignmentHistory) {
        if (historyItem.changedBy) userIds.push(historyItem.changedBy)
        if (historyItem.changedTo) userIds.push(historyItem.changedTo)
      }
    }

    // Remove duplicates
    return [...new Set(userIds)]
  }, [
    ticket?.comments,
    ticket?.assignedToUserId,
    ticket?.claimedByUserId,
    ticket?.flowInitiatedBy,
    (ticket as any)?.assignment?.assignmentHistory
  ])

  const { displayNames: batchedDisplayNames, employees: batchedEmployees } = useEmployeeNamesBatch({
    userIds: allUserIds,
    accessToken,
    enabled: allUserIds.length > 0
  })

  // Calculate KPI cards data
  const kpiCards: KpiCardData[] = React.useMemo(() => {
    if (!ticket) return []

    const slaStatus = getSLAStatus(ticket)
    const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.UNKNOWN
    const StatusIcon = statusConfig.icon

    // Calculate task age
    const createdAt = ticket.startedAt ? new Date(ticket.startedAt) : new Date()
    const now = new Date()
    const ageInHours = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
    const ageDisplay = ageInHours < 24 ? `${ageInHours}h` : `${Math.floor(ageInHours / 24)}d`

    return [
      {
        id: 'task-status',
        title: 'Ticket Status',
        value: formatStatusText(ticket.status), // Format status for display (IN_PROGRESS → "In Progress")
        icon: <StatusIcon className="gba:w-5 gba:h-5" />,
        trend: {
          value: formatStatusText(ticket.status), // Format status for display
          positive: ticket.status === 'COMPLETED' || ticket.status === 'DONE' || ticket.status === 'SKIPPED',
          trendIcon:
            ticket.status === 'COMPLETED' || ticket.status === 'DONE' || ticket.status === 'SKIPPED'
              ? 'up'
              : ticket.status === 'FAILED' ||
                  ticket.status === 'ERROR' ||
                  ticket.status === 'PAUSED' ||
                  ticket.status === 'TIMED_OUT'
                ? 'down'
                : 'none',
          badgeVariant:
            ticket.status === 'COMPLETED' || ticket.status === 'DONE' || ticket.status === 'SKIPPED'
              ? 'success'
              : ticket.status === 'FAILED' ||
                  ticket.status === 'ERROR' ||
                  ticket.status === 'PAUSED' ||
                  ticket.status === 'TIMED_OUT'
                ? 'destructive'
                : 'default'
        },
        subtitle: `Current status`
      },
      {
        id: 'sla-progress',
        title: 'SLA Progress',
        value: slaStatus
          ? slaStatus.status === 'overdue'
            ? 'Overdue'
            : `${Math.floor(slaStatus.hoursLeft)}h left`
          : 'No SLA',
        icon: <TargetIcon className="gba:w-5 gba:h-5" />,
        trend: slaStatus
          ? {
              value: slaStatus.status === 'overdue' ? 'Overdue' : `${Math.floor(slaStatus.hoursLeft)}h left`,
              positive: !(slaStatus.status === 'overdue' || slaStatus.hoursLeft < 8),
              trendIcon: slaStatus.status === 'overdue' ? 'down' : slaStatus.hoursLeft < 8 ? 'down' : 'up',
              badgeVariant:
                slaStatus.status === 'overdue' ? 'destructive' : slaStatus.hoursLeft < 8 ? 'warning' : 'success'
            }
          : {
              value: 'No SLA',
              positive: undefined,
              trendIcon: 'none'
            },
        subtitle: slaStatus && ticket.dueDate ? `Due ${formatDate(ticket.dueDate)}` : 'No deadline set'
      },
      {
        id: 'task-age',
        title: 'Ticket Age',
        value: ageDisplay,
        icon: <ClockIcon className="gba:w-5 gba:h-5" />,
        trend: {
          value: ageDisplay,
          positive: ageInHours < 24,
          trendIcon: ageInHours > 72 ? 'down' : ageInHours > 24 ? 'none' : 'up',
          badgeVariant: ageInHours > 72 ? 'destructive' : ageInHours > 24 ? 'warning' : 'success'
        },
        subtitle: `Since ${formatDate(createdAt)}`
      },
      {
        id: 'comments-count',
        title: 'Comments',
        value: ticket.comments?.length?.toString() || '0',
        icon: <ChatCircleIcon className="gba:w-5 gba:h-5" />,
        trend: {
          value: `${ticket.comments?.length || 0} comments`,
          positive: undefined,
          trendIcon: 'none'
        },
        subtitle: 'Total comments'
      }
    ]
  }, [ticket])

  // Load full request details for overview
  const loadFullRequest = async () => {
    // Use flowId for the main workflow request
    const workflowId = ticket?.flowId || ticket?.requestId
    if (!workflowId || !accessToken || !userInfo) return

    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })
      const requestDetails = await workflowEngine.getRequest(workflowId)

      setFullRequest(requestDetails)
    } catch (error) {
      console.error('Failed to load full request:', error)
    }
  }

  // Load step_0 data for uncompleted tickets
  const loadStep0Data = async () => {
    const workflowId = ticket?.flowId || ticket?.requestId
    if (!workflowId || !accessToken || !userInfo) return

    // Only load for uncompleted tickets
    const isTicketCompleted =
      ticket?.status === 'COMPLETED' ||
      ticket?.status === 'DONE' ||
      ticket?.status === 'SKIPPED' ||
      ticket?.status === 'REJECTED' ||
      ticket?.status === 'CANCELLED' ||
      ticket?.status === 'CANCELED'
    if (isTicketCompleted) {
      setStep0Data(null)
      return
    }

    setIsLoadingStep0Data(true)
    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })

      // Get step_0 data using the getFlowStepData method
      const stepDataResponse = await workflowEngine.getFlowStepData?.(workflowId, 'step_0')

      if (stepDataResponse?.data && stepDataResponse.data.length > 0) {
        const stepData = stepDataResponse.data[0]
        setStep0Data(stepData)
      } else {
        setStep0Data(null)
      }
    } catch (error) {
      console.error('Failed to load step_0 data:', error)
      setStep0Data(null)
    } finally {
      setIsLoadingStep0Data(false)
    }
  }

  // Load request details when ticket is available
  useEffect(() => {
    const workflowId = ticket?.flowId || ticket?.requestId
    if (workflowId) {
      loadFullRequest()
      loadStep0Data()
    }
  }, [ticket?.flowId, ticket?.requestId, ticket?.status])

  // Load available actions for the task
  const loadAvailableActions = async () => {
    if (!ticket?.id) return

    // Use the availableActions from the ticket data (now preserved by the adapter)
    if (ticket.availableActions) {
      setAvailableActions(ticket.availableActions)
    } else {
      setAvailableActions(null)
    }
  }

  // Get comments directly from ticket data (already included in tasks/task_id response)
  const getTicketComments = () => {
    if (!ticket?.comments) {
      return []
    }

    // Transform comments to consistent format based on actual API structure
    return ticket.comments.map((comment: any) => ({
      id: comment.actionId || comment.id || `comment-${Date.now()}-${Math.random()}`,
      body: comment.comment, // Main comment text
      comment: comment.comment, // Main comment text
      message: comment.comment, // Main comment text
      commentedBy: comment.commentedBy, // User UUID who made the comment
      authorId: comment.commentedBy,
      userId: comment.commentedBy,
      createdAt: comment.commentedAt, // ISO timestamp
      timestamp: comment.commentedAt,
      visibility: comment.visibility || 'EXTERNAL', // Comment visibility (INTERNAL_TASK, INTERNAL_FLOW, EXTERNAL)
      action: comment.action, // Action type (e.g., "COMMENT")
      actionId: comment.actionId, // Unique action ID
      stepId: comment.stepId,
      stepTitle: comment.stepTitle,
      taskId: comment.taskId
    }))
  }

  // Load available actions when ticket is available
  useEffect(() => {
    if (ticket?.id) {
      loadAvailableActions()
    }
  }, [ticket?.id, ticket?.availableActions, accessToken, userInfo])

  // Comments are now loaded directly from ticket data - no separate loading needed

  // Handle task actions
  const handleTaskAction = async (action: 'claim' | 'unclaim' | 'complete' | 'reject') => {
    if (!ticket) return

    try {
      switch (action) {
        case 'claim':
          // Warn about potential ticket ID change
          await claimTicket(ticket.id)
          break
        case 'unclaim':
          await unclaimTicket(ticket.id)
          break
        case 'complete':
          await completeTicket(ticket.id)
          break
        case 'reject':
          await rejectTicket(ticket.id, 'Task rejected via Service Desk')
          break
      }

      // ✅ Refresh available actions after any action (comments will be refreshed via refetch)
      await loadAvailableActions()
    } catch (error) {
      console.error(`Failed to ${action} task:`, error)
      message.error(`Failed to ${action} task`)
    }
  }

  // Handle task reassignment to another user (works for both claimed and unclaimed tickets)
  const handleReassignTask = async (targetUserId: string) => {
    if (!ticket) return

    try {
      console.log(`[TaskRecord] Reassigning ticket ${ticket.id} to user ${targetUserId}`)
      await assignTicket(ticket.id, targetUserId)
      message.success('Ticket reassigned successfully')

      // Refresh available actions after reassignment
      await loadAvailableActions()
    } catch (error) {
      console.error('Failed to reassign ticket:', error)
      throw error // Re-throw to let the modal handle the error display
    }
  }

  // Handle comment submission
  const handleSubmitComment = async () => {
    if (!newComment.trim() || !ticket) return

    setIsSubmittingComment(true)
    try {
      // Use the addComment method from useTicketActions with visibility
      await addComment(ticket.id, newComment.trim(), commentVisibility)
      message.success('Comment added successfully')
      setNewComment('')
      setCommentVisibility('INTERNAL_TASK') // Reset to default

      // NOTE: Ticket may have been recreated with new ID, so refetch may fail
      // The ticket detail will need to be refreshed from the queue to get the new ID
      try {
        await refetch()
        // Comments will be updated automatically via refetch (included in ticket data)
      } catch {
        message.warning(
          'Comment added successfully, but ticket was recreated. Please refresh the queue to see the updated ticket.'
        )

        // Close the ticket detail since the ID is now invalid
        if (onClose) {
          onClose()
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error)
      message.error(`Failed to add comment: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmittingComment(false)
    }
  }

  // Handle task form submission (complete task with form data)
  const handleTaskFormSubmit = async (formData: DynamicFormValues) => {
    if (!ticket) return

    setIsSubmittingTaskForm(true)
    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })

      // Complete the ticket with form data
      await (workflowEngine as any).completeTask(ticket.id, formData, 'Ticket completed successfully', 'INTERNAL_FLOW')
      message.success('Ticket completed successfully')

      // Refresh ticket data
      await refetch()
      await loadFullRequest()
      await loadAvailableActions()
      // Comments will be updated automatically via refetch (included in ticket data)
    } catch (error) {
      console.error('Failed to complete ticket with form data:', error)
      message.error(`Failed to complete ticket: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsSubmittingTaskForm(false)
    }
  }

  // Handle timeline step title click to open corresponding ticket
  const handleStepTitleClick = async (stepIndex: number) => {
    console.log(`[TaskRecord] 🔍 Step title clicked! stepIndex=${stepIndex}`)
    console.log(`[TaskRecord] 🔍 fullRequest?.id=${fullRequest?.id}`)
    console.log(`[TaskRecord] 🔍 isLoadingStepData=${isLoadingStepData}`)
    console.log(`[TaskRecord] 🔍 accessToken available=${!!accessToken}`)
    console.log(`[TaskRecord] 🔍 userInfo available=${!!userInfo}`)

    if (!fullRequest?.id) {
      console.error(`[TaskRecord] ❌ No fullRequest.id available`)
      message.error('No request ID available')
      return
    }

    if (isLoadingStepData) {
      console.log(`[TaskRecord] ⏳ Already loading step data, skipping`)
      return
    }

    setIsLoadingStepData(true)
    try {
      const workflowEngine = createConductorWorkflowEngine({ accessToken, userInfo })
      const stepReference = `step_${stepIndex}`

      console.log(`[TaskRecord] 🚀 Getting step data for ${fullRequest.id}/${stepReference}`)
      console.log(`[TaskRecord] 🚀 Calling workflowEngine.getFlowStepData...`)

      // Get step data using the new endpoint
      const stepDataResponse = await workflowEngine.getFlowStepData?.(fullRequest.id, stepReference)

      if (!stepDataResponse) {
        throw new Error('getFlowStepData method not available on workflow engine')
      }

      console.log(`[TaskRecord] 📥 Step data response:`, stepDataResponse)

      if (stepDataResponse.data && stepDataResponse.data.length > 0) {
        const stepData = stepDataResponse.data[0] as any
        const taskId = stepData.taskId

        console.log(`[TaskRecord] ✅ Found task ID for step ${stepIndex}: ${taskId}`)

        // Validate taskId before navigation
        if (!taskId || typeof taskId !== 'string' || taskId.trim() === '') {
          console.warn(`[TaskRecord] ⚠️ Step ${stepIndex} has no valid taskId`)
          message.info(`No task details available for this step.`)
          return
        }

        // Navigate to the task detail (works for both user tasks and system tasks)
        if (onTaskChange) {
          console.log(`[TaskRecord] 🔄 Using onTaskChange callback`)
          onTaskChange(taskId)
        } else {
          console.log(`[TaskRecord] 🔄 Using URL parameter navigation to taskId=${taskId}`)

          const url = new URL(window.location.href)
          url.searchParams.set('taskId', taskId)

          console.log(`[TaskRecord] 🔄 Navigating to URL: ${url.toString()}`)

          window.history.pushState({}, '', url.toString())
          window.dispatchEvent(new PopStateEvent('popstate', { state: {} }))

          console.log(`[TaskRecord] 🔄 Navigation completed to task: ${taskId}`)
        }

        message.success(`Opening ticket for ${stepData.stepTitle}`)
      } else {
        console.warn(`[TaskRecord] ⚠️ No task data found for step ${stepIndex}`)
        message.warning(`No task data found for this step`)
      }
    } catch (error) {
      console.error('[TaskRecord] ❌ Failed to get step data:', error)
      message.error(`Failed to open step ticket: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsLoadingStepData(false)
    }
  }

  // Transform task form fields to DynamicFormField format
  const transformTaskFormFields = (taskForm: any[]): DynamicFormField[] => {
    if (!taskForm || !Array.isArray(taskForm)) return []

    return taskForm.map(
      (field: any): DynamicFormField => ({
        type: field.type || 'TEXT',
        name: field.name || '',
        label: field.label || field.name || '',
        required: field.required || false,
        placeholder: field.placeholder,
        description: field.description,
        value: field.value, // Extract default value from the field
        readonly: field.readonly || field.readOnly || false, // Extract readonly status (support both readonly and readOnly)
        options: field.options?.map((opt: any) => ({
          value: opt.value || opt,
          label: opt.label || opt.value || opt
        })),
        // Include dataSource configuration for dynamic SELECT/MULTISELECT fields
        dataSource: field.dataSource,
        validation: field.required ? [{ type: 'required' as const }] : undefined
      })
    )
  }

  // Get task form fields (prioritize 'form' over 'inputs')
  const getTaskFormFields = () => {
    if (!ticket) return []

    const formFields = (ticket as any).form
    const inputFields = (ticket as any).inputs

    // Use form fields if available and not empty, otherwise use inputs
    let taskFormFields = null
    if (formFields && Array.isArray(formFields) && formFields.length > 0) {
      taskFormFields = formFields
    } else if (inputFields && Array.isArray(inputFields) && inputFields.length > 0) {
      taskFormFields = inputFields
    }

    return taskFormFields || []
  }

  if (isLoading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:min-h-screen">
        <Spinner />
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div>
        {/* Back to Queue Button - Absolute Top Left */}
        <div className="gba:p-4 gba:pb-0">
          <Button variant="outline" onClick={onClose} className="gba:gap-2">
            <ArrowLeftIcon className="gba:w-4 gba:h-4" />
            {getTranslationFromI18nKeyAndLabel('services.actions.goBack', 'Go Back')}
          </Button>
        </div>

        <PageLayout
          headerTitle="Task Not Found"
          headerDescription="The requested task could not be found"
          headerIcon={WarningIcon}
        >
          <Alert variant="destructive">
            <WarningIcon className="gba:h-4 gba:w-4" />
            <div>
              <h4 className="gba:font-medium">{getTranslationFromI18nKeyAndLabel('services.error.title', 'Error')}</h4>
              <p className="gba:text-sm gba:mt-1">
                {error || getTranslationFromI18nKeyAndLabel('services.error.taskNotFound', 'Task not found')}
              </p>
            </div>
          </Alert>
        </PageLayout>
      </div>
    )
  }

  const slaStatus = getSLAStatus(ticket)
  const statusConfig = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.UNKNOWN
  const StatusIcon = statusConfig.icon

  return (
    <div>
      {/* Back to Queue Button - Absolute Top Left */}
      <div className="gba:p-4 gba:pb-0">
        <Button variant="outline" onClick={onClose} className="gba:gap-2">
          <ArrowLeftIcon className="gba:w-4 gba:h-4" />
          Back to Queue
        </Button>
      </div>

      <PageLayout
        headerTitle={ticket.name || 'Untitled Task'}
        headerDescription={`Request ID: ${formatRequestId(ticket.flowId || ticket.requestId)} • ${ticket.desk || 'Unknown Desk'} • Task ID: ${ticket.id}`}
        headerIcon={StatusIcon}
        variant="ext1"
        headerContent={<Badge variant={statusConfig.color as any}>{formatStatusText(ticket.status)}</Badge>}
        kpiCardsData={kpiCards}
        sectionTitle="Ticket Information"
        sectionDescription="Complete details and activity for this ticket"
      >
        {/* Main Content Grid */}
        <div className="gba:grid gba:grid-cols-1 gba:lg:grid-cols-2 gba:gap-6">
          {/* Left Column - Primary Information */}
          <div className="gba:space-y-6">
            {/* Ticket Details Card */}
            <Card>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-3">
                  <InfoIcon className="gba:w-5 gba:h-5" />
                  Ticket Details
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Ticket Message/Description */}
                {ticket.message && (
                  <div className="gba:mb-6 gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:w-2 gba:h-2 gba:bg-primary gba:rounded-full"></div>
                      <h4 className="gba:text-sm gba:font-medium gba:text-foreground">Description</h4>
                    </div>
                    <div className="gba:bg-muted/20 gba:rounded-lg gba:p-4 gba:border gba:border-muted/40">
                      <p className="gba:text-sm gba:text-muted-foreground gba:leading-relaxed gba:whitespace-pre-wrap">
                        {ticket.message}
                      </p>
                    </div>
                  </div>
                )}

                {/* Ticket Links - Show related links if available */}
                {(ticket as any).links && (ticket as any).links.length > 0 && (
                  <div className="gba:mb-6 gba:space-y-3">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
                      <h4 className="gba:text-sm gba:font-medium gba:text-foreground">Related Links</h4>
                    </div>
                    <div className="gba:space-y-3">
                      {(ticket as any).links.map((link: any, index: number) => (
                        <div
                          key={index}
                          className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:bg-blue-50 gba:rounded-lg gba:border gba:border-blue-100"
                        >
                          <div className="gba:flex-shrink-0">
                            <LinkIcon className="gba:w-5 gba:h-5 gba:text-blue-600" />
                          </div>
                          <div className="gba:flex-1 gba:min-w-0">
                            <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                              <h5 className="gba:text-sm gba:font-medium gba:text-blue-900 gba:truncate">
                                {link.name || 'Link'}
                              </h5>
                              {link.type && (
                                <Badge
                                  variant="outline"
                                  className="gba:text-xs gba:bg-blue-100 gba:text-blue-700 gba:border-blue-200"
                                >
                                  {link.type}
                                </Badge>
                              )}
                            </div>
                            <p className="gba:text-xs gba:text-blue-600 gba:truncate" title={link.url}>
                              {link.url}
                            </p>
                          </div>
                          <div className="gba:flex-shrink-0">
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="gba:inline-flex gba:items-center gba:px-3 gba:py-1.5 gba:text-xs gba:font-medium gba:text-blue-700 gba:bg-blue-100 gba:rounded-md gba:border gba:border-blue-200 hover:gba:bg-blue-200 gba:transition-colors"
                              data-testid={`task-link-${index}`}
                            >
                              <LinkIcon className="gba:w-3 gba:h-3 gba:mr-1" />
                              Open
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Descriptions
                  column={{ xs: 1, sm: 2 }}
                  items={[
                    {
                      key: 'created',
                      label: 'Created',
                      children: ticket.startedAt ? formatDateTime(ticket.startedAt) : 'Unknown'
                    },
                    {
                      key: 'updated',
                      label: 'Last Updated',
                      children: ticket.updatedAt ? formatDateTime(ticket.updatedAt) : 'Not updated'
                    },
                    {
                      key: 'dueDate',
                      label: 'Due Date',
                      children: ticket.dueDate ? formatDateTime(ticket.dueDate) : 'Not set'
                    },
                    {
                      key: 'desk',
                      label: 'Service Desk',
                      children: <Badge variant="outline">{ticket.desk || 'Unknown'}</Badge>
                    }
                  ]}
                />

                {/* SLA Progress */}
                {slaStatus && (
                  <div className="gba:mt-6 gba:p-4 gba:bg-muted/30 gba:rounded-lg">
                    <div className="gba:flex gba:items-center gba:justify-between gba:mb-3">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                        <TargetIcon className="gba:w-4 gba:h-4" />
                        SLA Progress
                      </div>
                      <Badge variant={slaStatus.status === 'overdue' ? 'destructive' : 'secondary'}>
                        {slaStatus.status === 'overdue'
                          ? `${Math.abs(Math.floor(slaStatus.hoursLeft))}h overdue`
                          : `${Math.floor(slaStatus.hoursLeft)}h remaining`}
                      </Badge>
                    </div>
                    <Progress
                      value={slaStatus.status === 'overdue' ? 100 : Math.max(0, 100 - (slaStatus.hoursLeft / 24) * 100)}
                      className="gba:mb-2"
                    />
                    {ticket.dueDate && (
                      <p className="gba:text-xs gba:text-muted-foreground">
                        Due: {formatDate(ticket.dueDate)} at {formatTime(ticket.dueDate)}
                      </p>
                    )}
                  </div>
                )}

                {/* System Task Execution Details - Show for AI AGENT and FUNCTION tasks */}
                {(() => {
                  const systemTask = ticket as unknown as SystemTaskData
                  if (!systemTask.isSystemTask) return null

                  // Extract values once for cleaner code
                  const execDetails = systemTask.executionDetails || {}
                  const isSuccess = execDetails.success === true
                  const taskType = systemTask.taskType || 'AI_AGENT'
                  const durationMs = execDetails.durationMs ?? systemTask.durationMs
                  const startedAt = execDetails.startedAt ?? systemTask.startTime
                  const completedAt = execDetails.completedAt ?? systemTask.endTime
                  const errorMessage = execDetails.error ?? systemTask.error
                  const inputData = systemTask.inputData || {}
                  const resultData = systemTask.resultData || execDetails.resultData || {}
                  const hasInputData = Object.keys(inputData).length > 0
                  const hasResultData = Object.keys(resultData).length > 0

                  return (
                    <div className="gba:mt-6 gba:space-y-4">
                      {/* Execution Summary */}
                      <div className="gba:space-y-3">
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <div
                            className={`gba:w-2 gba:h-2 gba:rounded-full ${isSuccess ? 'gba:bg-green-500' : 'gba:bg-red-500'}`}
                          ></div>
                          <h4 className="gba:text-sm gba:font-medium gba:text-foreground">Execution Summary</h4>
                          <Badge variant={isSuccess ? 'secondary' : 'destructive'} className="gba:text-xs">
                            {taskType}
                          </Badge>
                        </div>
                        <div
                          className={`gba:p-4 gba:rounded-lg gba:border ${isSuccess ? 'gba:bg-green-50 gba:border-green-200' : 'gba:bg-red-50 gba:border-red-200'}`}
                        >
                          <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                            <div>
                              <Text type="secondary" className="gba:text-xs">
                                Status
                              </Text>
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                                {isSuccess ? (
                                  <CheckCircleIcon className="gba:w-5 gba:h-5 gba:text-green-600" />
                                ) : (
                                  <WarningCircleIcon className="gba:w-5 gba:h-5 gba:text-red-600" />
                                )}
                                <Text strong>{isSuccess ? 'Completed Successfully' : 'Failed'}</Text>
                              </div>
                            </div>
                            <div>
                              <Text type="secondary" className="gba:text-xs">
                                Duration
                              </Text>
                              <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                                <ClockIcon className="gba:w-5 gba:h-5 gba:text-gray-500" />
                                <Text strong>
                                  {durationMs ? `${(durationMs / 1000).toFixed(2)} seconds` : 'Unknown'}
                                </Text>
                              </div>
                            </div>
                            <div>
                              <Text type="secondary" className="gba:text-xs">
                                Started At
                              </Text>
                              <Text className="gba:block gba:mt-1">
                                {startedAt ? formatDateTime(startedAt) : 'Unknown'}
                              </Text>
                            </div>
                            <div>
                              <Text type="secondary" className="gba:text-xs">
                                Completed At
                              </Text>
                              <Text className="gba:block gba:mt-1">
                                {completedAt ? formatDateTime(completedAt) : 'Unknown'}
                              </Text>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Error Details (if any) */}
                      {errorMessage && (
                        <Alert variant="destructive">
                          <WarningCircleIcon className="gba:h-4 gba:w-4" />
                          <div className="gba:ml-2">
                            <Text strong className="gba:text-red-700">
                              Error
                            </Text>
                            <Text className="gba:block gba:text-red-600 gba:mt-1">{errorMessage}</Text>
                          </div>
                        </Alert>
                      )}

                      {/* Input Data */}
                      {hasInputData && (
                        <div className="gba:space-y-3">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div className="gba:w-2 gba:h-2 gba:bg-blue-500 gba:rounded-full"></div>
                            <h4 className="gba:text-sm gba:font-medium gba:text-foreground">Input Data</h4>
                          </div>
                          <div className="gba:p-4 gba:rounded-lg gba:border gba:bg-blue-50 gba:border-blue-200">
                            <Descriptions column={1} size="small" bordered>
                              {Object.entries(inputData).map(([key, value]) => (
                                <Descriptions.Item key={`input-${key}`} label={key}>
                                  {typeof value === 'object' ? (
                                    <pre className="gba:text-xs gba:bg-white gba:p-2 gba:rounded gba:overflow-auto gba:max-h-32">
                                      {JSON.stringify(value, null, 2)}
                                    </pre>
                                  ) : (
                                    String(value) || <Text type="secondary">(empty)</Text>
                                  )}
                                </Descriptions.Item>
                              ))}
                            </Descriptions>
                          </div>
                        </div>
                      )}

                      {/* Result Data */}
                      {hasResultData && (
                        <div className="gba:space-y-3">
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <div className="gba:w-2 gba:h-2 gba:bg-green-500 gba:rounded-full"></div>
                            <h4 className="gba:text-sm gba:font-medium gba:text-foreground">Result Data</h4>
                            <Badge variant="secondary" className="gba:text-xs">
                              Output
                            </Badge>
                          </div>
                          <div className="gba:p-4 gba:rounded-lg gba:border gba:bg-green-50 gba:border-green-200">
                            <Descriptions column={1} size="small" bordered>
                              {Object.entries(resultData).map(([key, value]) => (
                                <Descriptions.Item key={`result-${key}`} label={key}>
                                  {typeof value === 'object' ? (
                                    <pre className="gba:text-xs gba:bg-white gba:p-2 gba:rounded gba:overflow-auto gba:max-h-32">
                                      {JSON.stringify(value, null, 2)}
                                    </pre>
                                  ) : (
                                    String(value) || <Text type="secondary">(empty)</Text>
                                  )}
                                </Descriptions.Item>
                              ))}
                            </Descriptions>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })()}

                {/* Submitted Form Data - Show for completed user tasks (not system tasks) */}
                {!(ticket as unknown as SystemTaskData).isSystemTask &&
                  ticket.formData &&
                  Object.keys(ticket.formData).length > 0 && (
                    <div className="gba:mt-6 gba:space-y-3">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <div className="gba:w-2 gba:h-2 gba:bg-green-500 gba:rounded-full"></div>
                        <h4 className="gba:text-sm gba:font-medium gba:text-foreground">Submitted Form Data</h4>
                        <Badge variant="secondary" className="gba:text-xs">
                          Completed
                        </Badge>
                      </div>
                      <Step0DataRenderer
                        stepData={{ formData: ticket.formData }}
                        theme={{
                          containerBg: 'gba:bg-green-50',
                          containerBorder: 'gba:border-green-200',
                          labelColor: 'gba:text-green-800',
                          valueColor: 'gba:text-green-700',
                          fileBadge: {
                            bg: 'gba:bg-blue-100',
                            text: 'gba:text-blue-700',
                            border: 'gba:border-blue-300'
                          },
                          arrayBadge: {
                            bg: 'gba:bg-green-100',
                            text: 'gba:text-green-700',
                            border: 'gba:border-green-300'
                          },
                          fileContainer: {
                            bg: 'gba:bg-green-100',
                            border: 'gba:border-green-300'
                          }
                        }}
                        testIdPrefix="task-record-completed"
                      />
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Step 0 Submitted Data Card - Show for uncompleted tickets only */}
            {(() => {
              const isTicketCompleted =
                ticket?.status === 'COMPLETED' ||
                ticket?.status === 'DONE' ||
                ticket?.status === 'SKIPPED' ||
                ticket?.status === 'REJECTED' ||
                ticket?.status === 'CANCELLED' ||
                ticket?.status === 'CANCELED'
              const hasStep0Data = step0Data && step0Data.formData && Object.keys(step0Data.formData).length > 0
              const shouldShowStep0Data = !isTicketCompleted && hasStep0Data

              return shouldShowStep0Data
            })() && (
              <Card data-testid="step0-data-card">
                <CardHeader>
                  <CardTitle className="gba:flex gba:items-center gba:gap-3">
                    <InfoIcon className="gba:w-5 gba:h-5" />
                    Initial Request Data
                    <Badge variant="outline" className="gba:text-xs">
                      Step 0
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
                    Form data submitted when this request was initially created.
                  </p>

                  {isLoadingStep0Data ? (
                    <div className="gba:flex gba:items-center gba:justify-center gba:py-8">
                      <Spinner />
                    </div>
                  ) : (
                    <Step0DataRenderer stepData={step0Data} testIdPrefix="task-record-step0" />
                  )}
                </CardContent>
              </Card>
            )}

            {/* Ticket Form Card - Show dynamic form if ticket has form fields and is not completed */}
            {(() => {
              const hasFormFields = getTaskFormFields().length > 0
              const isTicketCompleted =
                ticket?.status === 'COMPLETED' ||
                ticket?.status === 'DONE' ||
                ticket?.status === 'SKIPPED' ||
                ticket?.status === 'REJECTED' ||
                ticket?.status === 'CANCELLED' ||
                ticket?.status === 'CANCELED'
              const shouldShowForm = hasFormFields && !isTicketCompleted

              return shouldShowForm
            })() && (
              <Card data-testid="ticket-form-card">
                <CardHeader>
                  <CardTitle className="gba:flex gba:items-center gba:gap-3">
                    <CheckCircleIcon className="gba:w-5 gba:h-5" />
                    Complete Ticket
                    {getTaskFormFields().filter((f: any) => f.required).length > 0 && (
                      <Badge variant="secondary" className="gba:ml-2">
                        {getTaskFormFields().filter((f: any) => f.required).length} required
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
                    Fill out the required information to complete this ticket.
                  </p>

                  {/* Note when ticket cannot be completed (based on API availableActions) */}
                  {availableActions && !availableActions.canComplete && (
                    <div className="gba:mb-4 gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-amber-700 gba:bg-amber-50 gba:p-3 gba:rounded-lg gba:border gba:border-amber-200">
                      <InfoIcon className="gba:w-4 gba:h-4" />
                      <span>
                        <strong>Note:</strong> This ticket cannot be completed yet. Please check if you need to claim it
                        first.
                      </span>
                    </div>
                  )}

                  <div
                    className={
                      availableActions && !availableActions.canComplete ? 'gba:opacity-60 gba:pointer-events-none' : ''
                    }
                  >
                    <DynamicFormGenerator
                      schema={transformTaskFormFields(getTaskFormFields())}
                      initialValues={taskFormData}
                      onValuesChange={setTaskFormData}
                      onSubmit={handleTaskFormSubmit}
                      isSubmitting={isSubmittingTaskForm}
                      submitButtonText="Complete Ticket"
                      title="" // No title since we have card header
                      showCard={false} // Don't wrap in card since we're already in one
                      accessToken={accessToken} // Required for dataSource SELECT/MULTISELECT fields
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments & Activity Card */}
            <Card>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-3">
                  <ChatCircleIcon className="gba:w-5 gba:h-5" />
                  Comments & Activity
                  {(() => {
                    const comments = getTicketComments()
                    return (
                      comments.length > 0 && (
                        <Badge variant="secondary" className="gba:ml-2">
                          {comments.length}
                        </Badge>
                      )
                    )
                  })()}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Comments List */}
                <div className="gba:mb-6">
                  {(() => {
                    const comments = getTicketComments()
                    return comments.length > 0 ? (
                      <div className="gba:space-y-4 gba:max-h-96 gba:overflow-y-auto gba:pr-2 gba:scrollbar-thin gba:scrollbar-thumb-slate-300 gba:scrollbar-track-slate-100">
                        {comments
                          .sort((a, b) => {
                            const dateA = new Date(a.createdAt || a.timestamp)
                            const dateB = new Date(b.createdAt || b.timestamp)
                            return dateA.getTime() - dateB.getTime()
                          })
                          .map(comment => {
                            // Get comment visibility (default to EXTERNAL if not specified)
                            const visibility = comment.visibility || 'EXTERNAL'
                            const visibilityConfig =
                              COMMENT_VISIBILITY_CONFIG[visibility as CommentVisibility] ||
                              COMMENT_VISIBILITY_CONFIG.EXTERNAL
                            const VisibilityIcon = visibilityConfig.icon

                            return (
                              <div
                                key={comment.id}
                                className="gba:group gba:relative gba:p-4 gba:bg-gradient-to-r gba:from-slate-50/80 gba:to-slate-50/40 gba:rounded-xl gba:border gba:border-slate-200/60 hover:gba:border-slate-300/80 gba:transition-all gba:duration-200 hover:gba:shadow-sm"
                              >
                                {/* Comment Header - All inline */}
                                <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3 gba:flex-wrap">
                                  {/* Enhanced Employee Display */}
                                  <div className="gba:flex-shrink-0">
                                    <EnhancedEmployeeDisplay
                                      userId={comment.authorId || 'unknown'}
                                      displayName={batchedDisplayNames.get(comment.authorId) || 'Unknown User'}
                                      employeeData={batchedEmployees.get(comment.authorId)}
                                      testId={`comment-author-${comment.id}`}
                                      showTooltip={true}
                                    />
                                  </div>

                                  {/* Timestamp */}
                                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-slate-500">
                                    <ClockIcon className="gba:w-3.5 gba:h-3.5" />
                                    <time dateTime={comment.createdAt || comment.timestamp}>
                                      {formatDateTime(comment.createdAt || comment.timestamp)}
                                    </time>
                                  </div>

                                  {/* Comment Visibility Badge */}
                                  <Badge
                                    variant={visibilityConfig.badgeVariant}
                                    className={`gba:text-xs gba:gap-1.5 gba:px-2.5 gba:py-1 gba:font-medium gba:shadow-sm ${visibilityConfig.color}`}
                                    data-testid={`comment-visibility-${comment.id}`}
                                  >
                                    <VisibilityIcon className="gba:w-3.5 gba:h-3.5" />
                                    {visibilityConfig.label}
                                  </Badge>
                                </div>

                                {/* Comment Body */}
                                <div className="gba:ml-12 gba:pl-3">
                                  <div className="gba:relative gba:bg-white gba:rounded-lg gba:p-3 gba:shadow-sm gba:border gba:border-slate-200/60">
                                    {/* Speech bubble arrow */}
                                    <div className="gba:absolute gba:-left-2 gba:top-3 gba:w-0 gba:h-0 gba:border-t-[6px] gba:border-t-transparent gba:border-b-[6px] gba:border-b-transparent gba:border-r-[8px] gba:border-r-white"></div>
                                    <div className="gba:absolute gba:-left-2.5 gba:top-3 gba:w-0 gba:h-0 gba:border-t-[6px] gba:border-t-transparent gba:border-b-[6px] gba:border-b-transparent gba:border-r-[8px] gba:border-r-slate-200/60"></div>

                                    <p className="gba:text-sm gba:text-slate-700 gba:leading-relaxed gba:m-0">
                                      {comment.body || comment.comment || comment.message}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                      </div>
                    ) : (
                      <div className="gba:text-center gba:py-12 gba:px-6">
                        <div className="gba:bg-gradient-to-br gba:from-slate-100 gba:to-slate-50 gba:rounded-full gba:w-20 gba:h-20 gba:mx-auto gba:mb-4 gba:flex gba:items-center gba:justify-center gba:shadow-inner">
                          <ChatCircleIcon className="gba:w-8 gba:h-8 gba:text-slate-400" />
                        </div>
                        <h4 className="gba:text-sm gba:font-medium gba:text-slate-600 gba:mb-1">No comments yet</h4>
                        <p className="gba:text-xs gba:text-slate-500">Be the first to add a comment to this ticket</p>
                      </div>
                    )
                  })()}
                </div>

                {/* Add Comment Form */}
                <Separator className="gba:my-6 gba:bg-gradient-to-r gba:from-transparent gba:via-slate-200 gba:to-transparent" />
                <div className="gba:space-y-4">
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <PaperPlaneRightIcon className="gba:w-4 gba:h-4 gba:text-slate-600" />
                    <h4 className="gba:text-sm gba:font-semibold gba:text-slate-700">Add Comment</h4>
                  </div>

                  <div className="gba:relative">
                    <Textarea
                      placeholder="Enter your comment..."
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      rows={3}
                      className="gba:resize-none gba:border-slate-200 gba:bg-slate-50/50 focus:gba:bg-white gba:transition-colors gba:duration-200 gba:rounded-lg gba:shadow-sm focus:gba:shadow-md"
                      data-testid="comment-textarea"
                    />
                  </div>

                  <div className="gba:flex gba:items-center gba:gap-3 gba:justify-between">
                    {/* Comment Visibility Selector - Left Side */}
                    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                      <label className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:whitespace-nowrap">
                        Visibility:
                      </label>
                      <Select
                        value={commentVisibility}
                        onValueChange={(value: CommentVisibility) => setCommentVisibility(value)}
                        data-testid="comment-visibility-selector"
                      >
                        <SelectTrigger className="gba:w-40">
                          <SelectValue>
                            {(() => {
                              const config = COMMENT_VISIBILITY_CONFIG[commentVisibility]
                              const VisibilityIcon = config.icon
                              return (
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <VisibilityIcon className="gba:w-4 gba:h-4" />
                                  <span>{config.label}</span>
                                </div>
                              )
                            })()}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(COMMENT_VISIBILITY_CONFIG).map(([key, config]) => {
                            const VisibilityIcon = config.icon
                            return (
                              <SelectItem key={key} value={key} data-testid={`visibility-option-${key.toLowerCase()}`}>
                                <div className="gba:flex gba:items-center gba:gap-2">
                                  <VisibilityIcon className="gba:w-4 gba:h-4" />
                                  <div className="gba:flex gba:flex-col">
                                    <span className="gba:font-medium">{config.label}</span>
                                    <span className="gba:text-xs gba:text-muted-foreground">{config.description}</span>
                                  </div>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Submit Button - Right Side */}
                    <Button
                      onClick={handleSubmitComment}
                      disabled={!newComment.trim() || isSubmittingComment || isActionLoading}
                      className="gba:gap-2 gba:flex-shrink-0"
                      data-testid="submit-comment-button"
                    >
                      <PaperPlaneRightIcon className="gba:w-4 gba:h-4" />
                      {isSubmittingComment ? 'Adding...' : 'Add Comment'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Assignment & Request Overview */}
          <div className="gba:space-y-6">
            {/* Assignment & Ownership Card */}
            <Card>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-3">
                  <UserCheckIcon className="gba:w-5 gba:h-5" />
                  Assignment & Ownership
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="gba:space-y-4">
                  {/* Assigned To Row */}
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <div className="gba:w-24 gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex-shrink-0">
                      Assigned To:
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                      {ticket.assignedToUserId ? (
                        <EnhancedEmployeeDisplay
                          userId={ticket.assignedToUserId}
                          displayName={
                            batchedDisplayNames.get(ticket.assignedToUserId) ||
                            ticket.assignedToUserName ||
                            'Assigned User'
                          }
                          employeeData={batchedEmployees.get(ticket.assignedToUserId)}
                          testId="task-assignee"
                          showTooltip={true}
                        />
                      ) : ticket.claimedByUserId ? (
                        <>
                          <EnhancedEmployeeDisplay
                            userId={ticket.claimedByUserId}
                            displayName={
                              batchedDisplayNames.get(ticket.claimedByUserId) ||
                              ticket.claimedByUserName ||
                              'Claimed User'
                            }
                            employeeData={batchedEmployees.get(ticket.claimedByUserId)}
                            testId="task-claimed-by"
                            showTooltip={true}
                          />
                          <Badge variant="secondary">Claimed</Badge>
                        </>
                      ) : (
                        <Badge variant="outline">Unassigned</Badge>
                      )}
                    </div>
                  </div>

                  {/* Requested By Row */}
                  <div className="gba:flex gba:items-center gba:gap-4">
                    <div className="gba:w-24 gba:text-sm gba:font-medium gba:text-muted-foreground gba:flex-shrink-0">
                      Requested By:
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1">
                      {ticket.flowInitiatedBy ? (
                        <EnhancedEmployeeDisplay
                          userId={ticket.flowInitiatedBy}
                          displayName={
                            batchedDisplayNames.get(ticket.flowInitiatedBy) || ticket.requesterName || 'Unknown User'
                          }
                          employeeData={batchedEmployees.get(ticket.flowInitiatedBy)}
                          testId="task-requester"
                          showTooltip={true}
                        />
                      ) : (
                        <span className="gba:text-muted-foreground">Unknown</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <Separator className="gba:my-4" />
                <div className="gba:flex gba:flex-wrap gba:gap-2">
                  {!(
                    ticket.status === 'COMPLETED' ||
                    ticket.status === 'DONE' ||
                    ticket.status === 'SKIPPED' ||
                    ticket.status === 'REJECTED' ||
                    ticket.status === 'CANCELLED' ||
                    ticket.status === 'CANCELED'
                  ) && (
                    <>
                      {/* ✅ Using availableActions from API instead of hardcoded logic */}
                      {availableActions?.canClaim && (
                        <Button
                          size="sm"
                          onClick={() => handleTaskAction('claim')}
                          disabled={isActionLoading}
                          className="gba:gap-2"
                        >
                          <UserCheckIcon className="gba:w-4 gba:h-4" />
                          Claim Ticket
                        </Button>
                      )}

                      {availableActions?.canUnclaim && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTaskAction('unclaim')}
                          disabled={isActionLoading}
                          className="gba:gap-2"
                        >
                          <UserMinusIcon className="gba:w-4 gba:h-4" />
                          Unclaim
                        </Button>
                      )}

                      {/* Reassign Ticket button - works for both claimed and unclaimed tickets */}
                      {availableActions?.canReassign && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsReassignModalOpen(true)}
                          disabled={isActionLoading}
                          className="gba:gap-2"
                          data-testid="reassign-ticket-button"
                        >
                          <UserCheckIcon className="gba:w-4 gba:h-4" />
                          Reassign Ticket
                        </Button>
                      )}

                      {availableActions?.canComplete &&
                        (() => {
                          // Hide "Complete Ticket" button if there are form fields that need to be filled
                          const hasFormFields = getTaskFormFields().length > 0
                          const ticketStatus = ticket?.status as string
                          const isTicketCompleted = !!(
                            ticket &&
                            (ticketStatus === 'COMPLETED' ||
                              ticketStatus === 'DONE' ||
                              ticketStatus === 'SKIPPED' ||
                              ticketStatus === 'REJECTED' ||
                              ticketStatus === 'CANCELLED' ||
                              ticketStatus === 'CANCELED')
                          )
                          const shouldShowForm = hasFormFields && !isTicketCompleted

                          // Only show button if there are no form fields to fill
                          return !shouldShowForm
                        })() && (
                          <Button
                            size="sm"
                            onClick={() => handleTaskAction('complete')}
                            disabled={isActionLoading}
                            className="gba:gap-2 gba:bg-green-600 hover:gba:bg-green-700"
                          >
                            <CheckCircleIcon className="gba:w-4 gba:h-4" />
                            Complete Ticket
                          </Button>
                        )}

                      {availableActions?.canReject && (
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleTaskAction('reject')}
                          disabled={isActionLoading}
                          className="gba:gap-2"
                        >
                          <WarningCircleIcon className="gba:w-4 gba:h-4" />
                          Reject
                        </Button>
                      )}
                    </>
                  )}

                  <Button variant="outline" size="sm" onClick={refetch} disabled={isLoading} className="gba:gap-2">
                    <ArrowClockwiseIcon className="gba:w-4 gba:h-4" />
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-3">
                  <ClipboardIcon className="gba:w-5 gba:h-5" />
                  Request Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                {fullRequest ? (
                  <div className="gba:space-y-4">
                    <Descriptions
                      column={1}
                      size="small"
                      items={[
                        {
                          key: 'title',
                          label: 'Request Title',
                          children: <Text strong>{fullRequest.titleSnapshot}</Text>
                        },
                        {
                          key: 'status',
                          label: 'Request Status',
                          children: (
                            <Badge variant="secondary">{formatStatusText(fullRequest.status.toUpperCase())}</Badge>
                          )
                        },
                        {
                          key: 'templateId',
                          label: 'Template ID',
                          children: (fullRequest as any).templateId ? (
                            <span
                              className="gba:font-mono gba:text-sm gba:bg-muted gba:px-2 gba:py-1 gba:rounded"
                              data-testid="template-id"
                            >
                              {(fullRequest as any).templateId}
                            </span>
                          ) : (
                            <span className="gba:text-muted-foreground">Not available</span>
                          )
                        },
                        {
                          key: 'created',
                          label: 'Created',
                          children: formatDate(fullRequest.createdAt)
                        }
                      ]}
                    />

                    {/* Progress Visualization */}
                    {fullRequest.progress && (
                      <div className="gba:p-4 gba:bg-muted/20 gba:rounded-lg">
                        <h4 className="gba:font-semibold gba:mb-2">Progress</h4>
                        <Progress value={fullRequest.progress.percentage} className="gba:mb-2" />
                        <p className="gba:text-xs gba:text-muted-foreground">
                          {fullRequest.progress.completedSteps} of {fullRequest.progress.totalSteps} steps completed
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="gba:text-center gba:py-8 gba:text-muted-foreground">
                    <ClipboardIcon className="gba:w-12 gba:h-12 gba:mx-auto gba:mb-2 gba:opacity-50" />
                    <p>Request details not available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Workflow Steps Card */}
            {(() => {
              const hasFullRequest = !!fullRequest
              const originalSteps = (fullRequest as any)?.originalSteps
              const steps = fullRequest?.steps
              const stepsToUse = originalSteps || steps
              const hasSteps = stepsToUse && stepsToUse.length > 0

              console.log(`[TaskRecord] 🔍 Workflow Steps Card rendering check:`, {
                hasFullRequest,
                hasOriginalSteps: !!originalSteps,
                originalStepsLength: originalSteps?.length || 0,
                hasSteps: !!steps,
                stepsLength: steps?.length || 0,
                stepsToUse: stepsToUse?.length || 0,
                shouldRender: hasFullRequest && hasSteps,
                fullRequestId: fullRequest?.id
              })

              return hasFullRequest && hasSteps
            })() && (
              <Card>
                <CardHeader>
                  <CardTitle className="gba:flex gba:items-center gba:gap-3">
                    <ArrowClockwiseIcon className="gba:w-5 gba:h-5" />
                    Workflow Steps
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mb-4">
                    Track the progress of this request through{' '}
                    {((fullRequest as any)?.originalSteps || fullRequest?.steps)?.length || 0} workflow steps:
                  </p>

                  <Timeline progressive={false} className="gba:max-w-none gba:mt-6 gba:px-2">
                    {((fullRequest as any)?.originalSteps || fullRequest?.steps || []).map(
                      (step: any, index: number) => {
                        const isCompleted = step.status === 'COMPLETED'
                        const isInProgress = step.status === 'IN_PROGRESS'
                        const isFailed = step.status === 'FAILED' || step.status === 'ERROR'
                        const isPending =
                          step.status === 'PENDING' ||
                          step.status === 'SCHEDULED' ||
                          step.status === 'READY' ||
                          step.status === 'QUEUED'
                        const stepNumber = (step.stepIndex ?? index) + 1

                        // Only make steps clickable if they have been started (not pending/scheduled)
                        const isClickable = !isPending

                        // Create step description with rich details
                        const stepDetails = []
                        if (step.type && step.type !== 'UNKNOWN') {
                          stepDetails.push(`${step.type.replace('_', ' ')}`)
                        }
                        if (step.assignmentMode && step.assignmentMode !== 'UNKNOWN') {
                          stepDetails.push(`${step.assignmentMode} assignment`)
                        }
                        if (step.totalTasks > 0 || step.completedTasks > 0) {
                          const taskProgress = `${step.completedTasks || 0} of ${step.totalTasks || 1} tasks completed`
                          stepDetails.push(taskProgress)
                        }

                        // Create a rich description
                        const description =
                          stepDetails.length > 0
                            ? stepDetails.join(' • ')
                            : `Current status: ${formatStatusText(step.status)}`

                        // Choose appropriate icon based on status with beautiful styling
                        const getStatusIcon = () => {
                          if (isCompleted)
                            return <CheckCircleIcon className="gba:w-5 gba:h-5 gba:text-white gba:drop-shadow-sm" />
                          if (isInProgress)
                            return <ClockIcon className="gba:w-5 gba:h-5 gba:text-white gba:drop-shadow-sm" />
                          if (isFailed)
                            return <WarningIcon className="gba:w-5 gba:h-5 gba:text-white gba:drop-shadow-sm" />
                          return <TargetIcon className="gba:w-5 gba:h-5 gba:text-white gba:drop-shadow-sm" />
                        }

                        // Get elegant indicator background colors with subtle gradients
                        const getIndicatorStyle = () => {
                          if (isCompleted)
                            return 'gba:bg-gradient-to-br gba:from-emerald-400 gba:to-emerald-500 gba:border-emerald-300 gba:shadow-md gba:shadow-emerald-200/40'
                          if (isInProgress)
                            return 'gba:bg-gradient-to-br gba:from-sky-400 gba:to-sky-500 gba:border-sky-300 gba:shadow-md gba:shadow-sky-200/40'
                          if (isFailed)
                            return 'gba:bg-gradient-to-br gba:from-rose-400 gba:to-rose-500 gba:border-rose-300 gba:shadow-md gba:shadow-rose-200/40'
                          return 'gba:bg-gradient-to-br gba:from-slate-300 gba:to-slate-400 gba:border-slate-200 gba:shadow-md gba:shadow-slate-200/40'
                        }

                        // Elegant status badge colors
                        const getStatusBadge = () => {
                          if (isCompleted)
                            return (
                              <Badge
                                variant="secondary"
                                className="gba:bg-emerald-50 gba:text-emerald-700 gba:border-emerald-200 gba:ml-3 gba:px-2.5 gba:py-0.5 gba:text-xs gba:font-medium"
                              >
                                Completed
                              </Badge>
                            )
                          if (isInProgress)
                            return (
                              <Badge
                                variant="default"
                                className="gba:bg-sky-50 gba:text-sky-700 gba:border-sky-200 gba:ml-3 gba:px-2.5 gba:py-0.5 gba:text-xs gba:font-medium"
                              >
                                In Progress
                              </Badge>
                            )
                          if (isFailed)
                            return (
                              <Badge
                                variant="destructive"
                                className="gba:bg-rose-50 gba:text-rose-700 gba:border-rose-200 gba:ml-3 gba:px-2.5 gba:py-0.5 gba:text-xs gba:font-medium"
                              >
                                Failed
                              </Badge>
                            )
                          return (
                            <Badge
                              variant="outline"
                              className="gba:bg-slate-50 gba:text-slate-600 gba:border-slate-200 gba:ml-3 gba:px-2.5 gba:py-0.5 gba:text-xs gba:font-medium"
                            >
                              Pending
                            </Badge>
                          )
                        }

                        return (
                          <TimelineItem key={step.stepIndex || index} step={stepNumber}>
                            <TimelineHeader>
                              <TimelineSeparator />
                              <TimelineTitle className="gba:flex gba:items-center gba:gap-2 gba:font-semibold">
                                {isClickable ? (
                                  <button
                                    onClick={e => {
                                      e.preventDefault()
                                      e.stopPropagation()
                                      console.log(
                                        `[TaskRecord] 🖱️ Button clicked! stepIndex=${step.stepIndex ?? index}`
                                      )
                                      handleStepTitleClick(step.stepIndex ?? index)
                                    }}
                                    disabled={isLoadingStepData}
                                    className="gba:text-left gba:bg-transparent gba:border-none gba:p-0 gba:font-semibold gba:text-blue-600 hover:gba:text-blue-800 gba:cursor-pointer gba:transition-colors gba:duration-200 hover:gba:underline disabled:gba:opacity-50 disabled:gba:cursor-not-allowed gba:flex gba:items-center gba:gap-2"
                                    data-testid={`timeline-step-title-${step.stepIndex ?? index}`}
                                    title="Click to open this step's ticket details"
                                  >
                                    <span className="gba:underline gba:decoration-dotted gba:decoration-blue-400 hover:gba:decoration-solid hover:gba:decoration-blue-600 gba:transition-all gba:duration-200">
                                      {step.title || step.name || `Step ${stepNumber}`}
                                    </span>
                                    {isLoadingStepData && <Spinner className="gba:w-4 gba:h-4" />}
                                  </button>
                                ) : (
                                  <span className="gba:text-foreground gba:flex gba:items-center gba:gap-2">
                                    {step.title || step.name || `Step ${stepNumber}`}
                                  </span>
                                )}
                                {getStatusBadge()}
                              </TimelineTitle>
                              <TimelineIndicator
                                className={`gba:border gba:flex gba:items-center gba:justify-center gba:w-9 gba:h-9 gba:rounded-full gba:transition-all gba:duration-200 gba:hover:scale-105 ${getIndicatorStyle()}`}
                              >
                                {getStatusIcon()}
                              </TimelineIndicator>
                            </TimelineHeader>
                            <TimelineContent className="gba:text-sm gba:text-slate-600 gba:leading-relaxed gba:pb-6 gba:pr-4">
                              <div className="gba:mb-3">{description}</div>
                              {(step.startedAt || step.finishedAt) && (
                                <div className="gba:mt-3 gba:pt-2 gba:border-t gba:border-slate-100 gba:text-xs gba:text-slate-500 gba:flex gba:gap-6">
                                  {step.startedAt && (
                                    <span className="gba:flex gba:items-center gba:gap-1">
                                      <ClockIcon className="gba:w-3 gba:h-3" />
                                      Started: {formatDate(step.startedAt)}
                                    </span>
                                  )}
                                  {step.finishedAt && (
                                    <span className="gba:flex gba:items-center gba:gap-1">
                                      <CheckCircleIcon className="gba:w-3 gba:h-3" />
                                      Finished: {formatDate(step.finishedAt)}
                                    </span>
                                  )}
                                </div>
                              )}
                            </TimelineContent>
                          </TimelineItem>
                        )
                      }
                    )}
                  </Timeline>
                </CardContent>
              </Card>
            )}

            {/* Assignment History Card */}
            {(ticket as any).assignment?.assignmentHistory &&
              (ticket as any).assignment.assignmentHistory.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="gba:flex gba:items-center gba:gap-3">
                      <ClockIcon className="gba:w-5 gba:h-5" />
                      Assignment History
                      <Badge variant="secondary" className="gba:ml-2">
                        {(ticket as any).assignment.assignmentHistory.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="gba:space-y-4">
                      {(ticket as any).assignment.assignmentHistory
                        .sort((a: any, b: any) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())
                        .map((historyItem: any, index: number) => {
                          const isLatest = index === 0
                          const actionConfig = {
                            CLAIM: {
                              color: 'gba:text-green-700 gba:bg-green-50 gba:border-green-200',
                              icon: UserCheckIcon,
                              label: 'Claimed',
                              description: 'Task was claimed by user'
                            },
                            UNCLAIM: {
                              color: 'gba:text-orange-700 gba:bg-orange-50 gba:border-orange-200',
                              icon: UserMinusIcon,
                              label: 'Unclaimed',
                              description: 'Task was unclaimed'
                            },
                            ASSIGN: {
                              color: 'gba:text-blue-700 gba:bg-blue-50 gba:border-blue-200',
                              icon: UserCheckIcon,
                              label: 'Assigned',
                              description: 'Task was assigned to user'
                            },
                            REASSIGN: {
                              color: 'gba:text-purple-700 gba:bg-purple-50 gba:border-purple-200',
                              icon: ArrowClockwiseIcon,
                              label: 'Reassigned',
                              description: 'Task was reassigned to different user'
                            }
                          }

                          const config = actionConfig[historyItem.action as keyof typeof actionConfig] || {
                            color: 'gba:text-gray-700 gba:bg-gray-50 gba:border-gray-200',
                            icon: ClockIcon,
                            label: historyItem.action,
                            description: `Task action: ${historyItem.action}`
                          }

                          const ActionIcon = config.icon

                          return (
                            <div
                              key={index}
                              className={`gba:flex gba:items-start gba:gap-3 gba:p-4 gba:rounded-lg gba:border ${config.color} ${isLatest ? 'gba:ring-2 gba:ring-offset-1 gba:ring-primary/20' : ''}`}
                              data-testid={`assignment-history-${index}`}
                            >
                              <div className="gba:flex-shrink-0 gba:mt-0.5">
                                <ActionIcon className="gba:w-5 gba:h-5" />
                              </div>
                              <div className="gba:flex-1 gba:min-w-0">
                                <div className="gba:flex gba:items-center gba:gap-2 gba:mb-1">
                                  <h4 className="gba:text-sm gba:font-semibold">
                                    {config.label}
                                    {isLatest && (
                                      <Badge variant="secondary" className="gba:ml-2 gba:text-xs">
                                        Latest
                                      </Badge>
                                    )}
                                  </h4>
                                </div>
                                <p className="gba:text-xs gba:mb-2 gba:opacity-80">{config.description}</p>
                                <div className="gba:flex gba:flex-col gba:gap-1 gba:text-xs">
                                  <div className="gba:flex gba:items-center gba:gap-1">
                                    <ClockIcon className="gba:w-3 gba:h-3" />
                                    <span className="gba:font-medium">When:</span>
                                    <span>{formatDateTime(historyItem.changedAt)}</span>
                                  </div>
                                  <div className="gba:flex gba:items-center gba:gap-1">
                                    <UserIcon className="gba:w-3 gba:h-3" />
                                    <span className="gba:font-medium">By:</span>
                                    <span className="gba:text-sm">
                                      {batchedDisplayNames.get(historyItem.changedBy) || 'Unknown User'}
                                    </span>
                                  </div>
                                  {historyItem.changedTo && historyItem.changedTo !== historyItem.changedBy && (
                                    <div className="gba:flex gba:items-center gba:gap-1">
                                      <ArrowClockwiseIcon className="gba:w-3 gba:h-3" />
                                      <span className="gba:font-medium">To:</span>
                                      <span className="gba:text-sm">
                                        {batchedDisplayNames.get(historyItem.changedTo) || 'Unknown User'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                    </div>

                    {/* Summary Stats */}
                    <div className="gba:mt-6 gba:pt-4 gba:border-t gba:text-xs gba:text-muted-foreground gba:flex gba:justify-between">
                      <span>Total Actions: {(ticket as any).assignment.assignmentHistory.length}</span>
                      <span>
                        First Action:{' '}
                        {formatDate(
                          (ticket as any).assignment.assignmentHistory[
                            (ticket as any).assignment.assignmentHistory.length - 1
                          ]?.changedAt
                        )}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )}
          </div>
        </div>
      </PageLayout>

      {/* Reassign Ticket Modal - works for both claimed and unclaimed tickets */}
      <AssignTaskModal
        open={isReassignModalOpen}
        onOpenChange={setIsReassignModalOpen}
        onAssign={handleReassignTask}
        taskId={ticket.id}
        taskName={ticket.name || 'Untitled Task'}
        currentAssigneeId={ticket.claimedByUserId || ticket.assignedToUserId}
        currentAssigneeName={
          ticket.claimedByUserId
            ? batchedDisplayNames.get(ticket.claimedByUserId) || ticket.claimedByUserName || 'Unknown User'
            : ticket.assignedToUserId
              ? batchedDisplayNames.get(ticket.assignedToUserId) || ticket.assignedToUserName || 'Unknown User'
              : undefined
        }
        accessToken={accessToken}
        modalTitle={ticket.claimedByUserId || ticket.assignedToUserId ? 'Reassign Ticket' : 'Assign Ticket'}
        modalDescription={
          ticket.claimedByUserId || ticket.assignedToUserId
            ? 'Select a user to reassign this ticket to. The ticket will be reassigned to the selected user.'
            : 'Select a user to assign this ticket to. The ticket will be assigned to the selected user.'
        }
        buttonText={ticket.claimedByUserId || ticket.assignedToUserId ? 'Reassign Ticket' : 'Assign Ticket'}
      />
    </div>
  )
}
