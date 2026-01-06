import React, { useState, useEffect, useMemo } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  Badge,
  Spinner,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
  Separator
} from '@newwork/nw-design-system'
import { useForm } from 'react-hook-form'
import { getTaskStatusBadgeVariant, getTaskStatusLabel } from '../../utils/taskStatusUtils'
import { CheckCircle2, Circle, PlayCircle } from 'lucide-react'
import dayjs from 'dayjs'

export interface TaskInstanceUpdatePopupProps extends BusinessAppContextProps {
  isOpen: boolean
  onClose: () => void
  taskAssigneeId?: string
  taskId?: string
  entityType?: 'investment' | 'customer' // 'investment' for IRM, 'customer' for CRM
  onSuccess?: () => void
  onError?: (error: any) => void
  'data-testid'?: string
}

interface TaskAssigneeData {
  id: string
  version: number
  taskStatus: string | null
  completedAt: string | null
  assignedUserId: string | null
  assignedEmployee: {
    id: string
    firstName: string
    lastName: string
    displayName: string
  } | null
  task: {
    id: string
    version: number
    name: string
    description: string | null
    dueDate: string | null
    taskType: {
      value: string
    } | null
    taskPriority: {
      value: string
    } | null
    // Parent entity references (at least one required by backend)
    investmentId?: string
    accountId?: string
    contactId?: string
    leadId?: string
    opportunityId?: string
    // Store ALL task assignees for full array update
    allTaskAssignees?: Array<{
      id: string
      version: number
      taskStatus: string
      completedAt: string | null
      assignedUserId: string
      assignedEmployee: {
        id: string
      }
    }>
  } | null
}

interface FormValues {
  taskAssigneeId: string
  taskAssigneeVersion: number
  taskId: string
  targetStatus: string
}

const STATUS_OPTIONS = [
  {
    value: 'SCHEDULED_TASK_STATUS',
    label: 'Scheduled',
    icon: Circle,
    color: 'gba:text-info'
  },
  {
    value: 'IN_PROGRESS_TASK_STATUS',
    label: 'In Progress',
    icon: PlayCircle,
    color: 'gba:text-warning'
  },
  {
    value: 'COMPLETED_TASK_STATUS',
    label: 'Completed',
    icon: CheckCircle2,
    color: 'gba:text-success'
  }
]

const prefixDataTestId = 'task-instance-update-popup'

/**
 * TaskInstanceUpdatePopup
 * Popup for updating individual task assignee instance status
 * - Loads task and assignee data from GraphQL
 * - Displays task details (read-only)
 * - Allows current user to update their task instance status
 * - Routes update through Flow Registry using task entity context
 */
export const TaskInstanceUpdatePopup: React.FC<TaskInstanceUpdatePopupProps> = ({
  isOpen,
  onClose,
  // taskAssigneeId not used - auto-detected from taskId and current user
  taskId: propTaskId,
  entityType = 'investment',
  accessToken,
  onSuccess,
  onError,
  'data-testid': dataTestId = prefixDataTestId,
  ...props
}) => {
  const [taskAssigneeData, setTaskAssigneeData] = useState<TaskAssigneeData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Extract taskId from multiple sources
  const taskId = useMemo(() => {
    return (
      propTaskId || props.additionalData?.taskId || props.additionalData?.psi_taskPayload?.psi_initialParameters?.taskId
    )
  }, [propTaskId, props.additionalData])

  // Get current user ID for matching with task assignees
  const currentUserId = useMemo(() => {
    return props.userInfo?.id
  }, [props.userInfo])

  const graphqlClient = useGraphQLClient(accessToken || '')

  const form = useForm<FormValues>({
    defaultValues: {
      taskAssigneeId: '',
      taskAssigneeVersion: 0,
      taskId: taskId || '',
      targetStatus: ''
    }
  })

  // Determine table name based on entity type
  const taskTable = entityType === 'investment' ? 'InvestmentTask' : 'Task'

  // Load task and auto-detect current user's instance
  useEffect(() => {
    const loadData = async () => {
      if (!accessToken || !taskId) {
        setError(getTranslationFromI18nKeyAndLabel('task.instance.error.noData', 'Access token or task ID missing'))
        setLoading(false)
        return
      }

      if (!currentUserId) {
        setError(getTranslationFromI18nKeyAndLabel('task.instance.error.noUser', 'Current user ID not available'))
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        // Build GraphQL query to load the full task with all assignees and parent entity references
        const query = `
          query GetTaskById {
            ${taskTable}(where: { id: { _eq: "${taskId}" }, isDeleted: { _eq: false } }) {
              id
              version
              name
              description
              dueDate
              ${entityType === 'investment' ? 'investmentId' : ''}
              accountId
              contactId
              leadId
              opportunityId
              taskType {
                value
                type
              }
              taskPriority {
                value
                type
              }
              taskAssignees {
                id
                version
                taskStatus
                completedAt
                assignedUserId
                assignedEmployee {
                  id
                  firstName
                  lastName
                  displayName
                }
              }
            }
          }
        `

        const response = await graphqlClient.request(query)

        const task = response?.[taskTable]?.[0]
        if (!task) {
          throw new Error(getTranslationFromI18nKeyAndLabel('task.instance.error.taskNotFound', 'Task not found'))
        }

        // Find current user's assignee instance
        const myInstance = task.taskAssignees?.find((ta: any) => ta.assignedUserId === currentUserId)

        if (!myInstance) {
          setError(
            getTranslationFromI18nKeyAndLabel(
              'task.instance.error.notAssigned',
              'You are not assigned to this task and cannot update its status'
            )
          )
          setLoading(false)
          return
        }

        // Create taskAssigneeData with task information including parent entity references and ALL assignees
        const taskAssigneeData: TaskAssigneeData = {
          id: myInstance.id,
          version: myInstance.version,
          taskStatus: myInstance.taskStatus,
          completedAt: myInstance.completedAt,
          assignedUserId: myInstance.assignedUserId,
          assignedEmployee: myInstance.assignedEmployee,
          task: {
            id: task.id,
            version: task.version,
            name: task.name,
            description: task.description,
            dueDate: task.dueDate,
            taskType: task.taskType,
            taskPriority: task.taskPriority,
            // Parent entity references (at least one is required by backend)
            ...(entityType === 'investment' && task.investmentId && { investmentId: task.investmentId }),
            ...(task.accountId && { accountId: task.accountId }),
            ...(task.contactId && { contactId: task.contactId }),
            ...(task.leadId && { leadId: task.leadId }),
            ...(task.opportunityId && { opportunityId: task.opportunityId }),
            // Store ALL task assignees for full array update
            allTaskAssignees: task.taskAssignees
          }
        }

        setTaskAssigneeData(taskAssigneeData)

        // Set form values
        form.setValue('taskAssigneeId', myInstance.id)
        form.setValue('taskAssigneeVersion', myInstance.version || 0)
        form.setValue('taskId', task.id)
        form.setValue('targetStatus', myInstance.taskStatus || 'SCHEDULED_TASK_STATUS')
      } catch (err) {
        console.error('Failed to load task data:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel('task.instance.error.loadFailed', 'Failed to load task data')
        )
        onError?.(err)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [accessToken, taskId, currentUserId, isOpen, graphqlClient, taskTable, form, onError])

  // Submit handler
  const handleSubmit = async () => {
    const currentFormValues = form.getValues()
    const taskData = taskAssigneeData?.task

    if (!taskData || !taskAssigneeData) {
      throw new Error('Task data not loaded')
    }

    // Determine payload key based on entity type
    const payloadKey = entityType === 'investment' ? 'investmentTask' : 'salesTask'

    // Calculate completedAt - set to now if completing, null otherwise
    const completedAt = currentFormValues.targetStatus === 'COMPLETED_TASK_STATUS' ? new Date().toISOString() : null

    // Build the task payload with ALL assignees, updating only the current user's status
    const allAssignees = taskData.allTaskAssignees || []
    const updatedAssignees = allAssignees.map((assignee: any) => {
      // If this is the current user's assignee, update the status
      if (assignee.id === currentFormValues.taskAssigneeId) {
        return {
          id: assignee.id,
          version: currentFormValues.taskAssigneeVersion,
          assignedEmployee: taskAssigneeData.assignedEmployee?.id,
          assignedUserId: taskAssigneeData.assignedUserId,
          taskStatus: currentFormValues.targetStatus,
          completedAt: completedAt
        }
      }
      // Otherwise, preserve the existing assignee unchanged
      return {
        id: assignee.id,
        version: assignee.version,
        assignedEmployee: assignee.assignedEmployee.id,
        assignedUserId: assignee.assignedUserId,
        taskStatus: assignee.taskStatus,
        completedAt: assignee.completedAt
      }
    })

    // Calculate overall task status from all assignees
    // This prevents backend from overwriting assignee statuses with a derived status
    const calculateOverallStatus = (assignees: any[]) => {
      const completed = assignees.filter(a => a.taskStatus === 'COMPLETED_TASK_STATUS').length
      const total = assignees.length
      const catalogPrefix = entityType === 'investment' ? 'InvestmentTaskStatus:v1' : 'SalesTaskStatus:v1'

      if (completed === total) {
        return `${catalogPrefix}:COMPLETED` // All completed
      } else if (completed > 0 || assignees.some(a => a.taskStatus === 'IN_PROGRESS_TASK_STATUS')) {
        return `${catalogPrefix}:IN_PROGRESS` // Some completed or in progress
      } else {
        return `${catalogPrefix}:SCHEDULED` // All scheduled/pending
      }
    }

    const overallStatusRef = calculateOverallStatus(updatedAssignees)

    return {
      [payloadKey]: {
        id: taskData.id,
        version: taskData.version,
        taskStatusRef: overallStatusRef, // Overall task status derived from assignees
        // Preserve parent entity references (at least one is required by backend)
        ...(entityType === 'investment' && taskData.investmentId && { investment: taskData.investmentId }),
        ...(taskData.accountId && { account: taskData.accountId }),
        ...(taskData.contactId && { contact: taskData.contactId }),
        ...(taskData.leadId && { lead: taskData.leadId }),
        ...(taskData.opportunityId && { opportunity: taskData.opportunityId }),
        taskAssignees: updatedAssignees // Send ALL assignees with only current user's status updated
      },
      changeMode: 'UPDATE'
    }
  }

  const handleFormSuccess = () => {
    onSuccess?.()
    onClose()
  }

  if (!isOpen) {
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(dataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p className="gba:mt-4">{getTranslationFromI18nKeyAndLabel('task.instance.loading', 'Loading task data...')}</p>
      </div>
    )
  }

  if (error || !taskAssigneeData) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(dataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription>
            {error || getTranslationFromI18nKeyAndLabel('task.instance.error.failed', 'Failed to load task data')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const task = taskAssigneeData.task
  const currentStatus = taskAssigneeData.taskStatus || 'SCHEDULED_TASK_STATUS'
  const assignee = taskAssigneeData.assignedEmployee

  return (
    <AppActionForm
      processType="update"
      onSubmit={handleSubmit}
      formData={form.getValues()}
      submitButtonText={getTranslationFromI18nKeyAndLabel('task.instance.update', 'Update Status')}
      businessAppContext={{ ...props, accessToken }}
      onSuccess={handleFormSuccess}
      data-testid={formatDataTestId(dataTestId, 'form')}
    >
      <div className="gba:space-y-6" data-testid={formatDataTestId(dataTestId, 'container')}>
        {/* Header */}
        <div className="gba:mb-4">
          <h2 className="gba:text-xl gba:font-semibold gba:mb-2" data-testid={formatDataTestId(dataTestId, 'title')}>
            {getTranslationFromI18nKeyAndLabel('task.instance.updateTitle', 'Update Task Status')}
          </h2>
          <p className="gba:text-sm gba:text-muted-foreground" data-testid={formatDataTestId(dataTestId, 'subtitle')}>
            {getTranslationFromI18nKeyAndLabel('task.instance.updateFor', 'Update your status for this task')}
          </p>
        </div>

        {/* Task Details (Read-Only) */}
        <div
          className="gba:p-4 gba:bg-muted gba:rounded-lg gba:space-y-3"
          data-testid={formatDataTestId(dataTestId, 'task-details')}
        >
          <div>
            <h3 className="gba:font-semibold gba:text-base gba:mb-2">
              {getTranslationFromI18nKeyAndLabel('task.label', 'Task')}
            </h3>
            <p className="gba:text-sm">{task?.name || 'Unnamed Task'}</p>
          </div>

          {task?.description && (
            <div>
              <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                {getTranslationFromI18nKeyAndLabel('task.description', 'Description')}:
              </span>
              <p className="gba:text-sm gba:mt-1">{task.description}</p>
            </div>
          )}

          <div className="gba:grid gba:grid-cols-2 gba:gap-4 gba:text-sm">
            {task?.dueDate && (
              <div>
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('task.dueDate', 'Due Date')}:
                </span>
                <p className="gba:mt-1">{dayjs(task.dueDate).format('MMM D, YYYY')}</p>
              </div>
            )}

            {task?.taskType && (
              <div>
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('task.type', 'Type')}:
                </span>
                <p className="gba:mt-1">{task.taskType.value}</p>
              </div>
            )}

            {task?.taskPriority && (
              <div>
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('task.priority', 'Priority')}:
                </span>
                <p className="gba:mt-1">{task.taskPriority.value}</p>
              </div>
            )}

            {assignee && (
              <div>
                <span className="gba:text-xs gba:font-medium gba:text-muted-foreground">
                  {getTranslationFromI18nKeyAndLabel('task.assignedTo', 'Assigned To')}:
                </span>
                <p className="gba:mt-1">{assignee.displayName}</p>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Current Status Display */}
        <div
          className="gba:mb-4 gba:p-4 gba:bg-muted gba:rounded-lg"
          data-testid={formatDataTestId(dataTestId, 'current-status')}
        >
          <div className="gba:flex gba:items-center gba:justify-between">
            <span className="gba:text-sm gba:font-medium gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('task.status.current', 'Current Status')}:
            </span>
            <Badge variant={getTaskStatusBadgeVariant(currentStatus)}>{getTaskStatusLabel(currentStatus)}</Badge>
          </div>
          {taskAssigneeData.completedAt && (
            <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">
              {getTranslationFromI18nKeyAndLabel('task.completedOn', 'Completed on')}{' '}
              {dayjs(taskAssigneeData.completedAt).format('MMM D, YYYY [at] h:mm A')}
            </p>
          )}
        </div>

        {/* Status Selection */}
        <FormField
          control={form.control}
          name="targetStatus"
          rules={{
            required: getTranslationFromI18nKeyAndLabel('task.status.required', 'Status is required')
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>{getTranslationFromI18nKeyAndLabel('task.status.new', 'New Status')}</FormLabel>
              <FormControl>
                <Select
                  value={field.value}
                  onValueChange={value => {
                    field.onChange(value)
                    form.setValue('targetStatus', value)
                  }}
                >
                  <SelectTrigger data-testid={formatDataTestId(dataTestId, 'status-select')}>
                    <SelectValue
                      placeholder={getTranslationFromI18nKeyAndLabel(
                        'task.status.selectPlaceholder',
                        'Select new status'
                      )}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(option => {
                      const Icon = option.icon
                      return (
                        <SelectItem
                          key={option.value}
                          value={option.value}
                          data-testid={formatDataTestId(dataTestId, `status-option-${option.value}`)}
                        >
                          <span className="gba:flex gba:items-center gba:gap-2">
                            <Icon className={`gba:h-4 gba:w-4 ${option.color}`} />
                            {option.label}
                          </span>
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Hidden fields for payload */}
        <input type="hidden" {...form.register('taskAssigneeId')} />
        <input type="hidden" {...form.register('taskAssigneeVersion')} />
        <input type="hidden" {...form.register('taskId')} />
      </div>
    </AppActionForm>
  )
}

export default TaskInstanceUpdatePopup
