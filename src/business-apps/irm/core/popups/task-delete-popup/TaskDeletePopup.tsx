import React, { useState, useEffect } from 'react'
import { AppActionForm } from '@/components/app-action-form/AppActionForm'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { Alert, AlertDescription, Badge, Spinner } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface TaskDeletePopupValues {
  taskId: string
}

export interface TaskDeletePopupProps extends BusinessAppContextProps {
  initialValues?: Partial<TaskDeletePopupValues>
}

interface TaskData {
  id: string
  version: number
  name: string
  code?: string
  description?: string
  dueDate?: string
  taskType?: {
    id: string
    value: string
  }
  taskPriority?: {
    id: string
    value: string
  }
  taskStatus?: {
    id: string
    value: string
  }
  assignedEmployee?: {
    id: string
    firstName?: string
    lastName?: string
    displayName?: string
  }
}

const prefixDataTestId = 'task-delete-popup'

const TaskDeletePopup: React.FC<TaskDeletePopupProps> = ({ initialValues = {}, ...props }) => {
  const [task, setTask] = useState<TaskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const graphqlClient = useGraphQLClient(props.accessToken || '')

  const taskId =
    props.additionalData?.taskId ||
    props.additionalData?.psi_taskPayload?.psi_initialParameters?.taskId ||
    props.additionalData?.id ||
    initialValues?.taskId ||
    ''

  useEffect(() => {
    const loadTask = async () => {
      if (!taskId || !props.accessToken) {
        setError(
          getTranslationFromI18nKeyAndLabel('task.delete.error.noId', 'Task ID not provided or access token missing')
        )
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const query = `
          query GetTask($id: uuid!) {
            InvestmentTask(where: { id: { _eq: $id }, isDeleted: { _eq: false } }) {
              id
              version
              name
              code
              description
              dueDate
              taskType {
                id
                value
              }
              taskPriority {
                id
                value
              }
              taskStatus {
                id
                value
              }
              taskAssignees(where: { isDeleted: { _eq: false } }) {
                assignedEmployee {
                  id
                  firstName
                  lastName
                  displayName
                }
                assignedEmployeeId
                assignedUserId
              }
            }
          }
        `

        const result = await graphqlClient.request<{ InvestmentTask: any[] }>(query, { id: taskId })

        if (!result?.InvestmentTask || result.InvestmentTask.length === 0) {
          setError(getTranslationFromI18nKeyAndLabel('task.delete.error.notFound', 'Task not found'))
          return
        }

        const tsk = result.InvestmentTask[0]

        // Extract first assignee for backward compatibility (mapper handles this too)
        const firstAssignee = tsk.taskAssignees?.[0]?.assignedEmployee
        let assignedEmployee = firstAssignee

        if (assignedEmployee && !assignedEmployee.displayName) {
          const computedDisplayName =
            `${assignedEmployee.firstName || ''} ${assignedEmployee.lastName || ''}`.trim() || 'Unassigned'
          assignedEmployee = {
            ...assignedEmployee,
            displayName: computedDisplayName
          }
        }

        setTask({
          id: tsk.id,
          version: tsk.version || 0,
          name: tsk.name || 'Unnamed Task',
          code: tsk.code,
          description: tsk.description,
          dueDate: tsk.dueDate,
          taskType: tsk.taskType,
          taskPriority: tsk.taskPriority,
          taskStatus: tsk.taskStatus,
          assignedEmployee
        })
      } catch (err) {
        console.error('Failed to load task:', err)
        setError(
          err instanceof Error
            ? err.message
            : getTranslationFromI18nKeyAndLabel('task.delete.error.loadFailed', 'Failed to load task')
        )
      } finally {
        setLoading(false)
      }
    }

    loadTask()
  }, [taskId, props.accessToken, graphqlClient])

  const handleSubmit = async () => {
    if (!task) {
      throw new Error(getTranslationFromI18nKeyAndLabel('task.delete.error.noData', 'Task data not loaded'))
    }

    const deletePayload = {
      investmentTask: {
        id: task.id,
        version: task.version,
        isDeleted: true
      }
    }

    return deletePayload
  }

  const validateForm = (): string[] | null => {
    if (!task) {
      return [getTranslationFromI18nKeyAndLabel('task.delete.error.noData', 'Task data not loaded')]
    }
    return null
  }

  if (loading) {
    return (
      <div className="gba:p-6 gba:text-center" data-testid={formatDataTestId(prefixDataTestId, 'loading')}>
        <Spinner size="lg" className="gba:mx-auto gba:mb-4" />
        <p>{getTranslationFromI18nKeyAndLabel('task.delete.loading', 'Loading task...')}</p>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="gba:p-6" data-testid={formatDataTestId(prefixDataTestId, 'error')}>
        <Alert variant="destructive">
          <AlertDescription data-testid={formatDataTestId(prefixDataTestId, 'error-message')}>
            {error || getTranslationFromI18nKeyAndLabel('task.delete.error.failed', 'Failed to load task')}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <AppActionForm
      processType="delete"
      onSubmit={handleSubmit}
      formData={{ taskId }}
      validateForm={validateForm}
      submitButtonText={getTranslationFromI18nKeyAndLabel('common.delete', 'Delete')}
      submitButtonVariant="destructive"
      businessAppContext={props}
      data-testid={formatDataTestId(prefixDataTestId, 'form')}
    >
      <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'container')}>
        <div className="gba:mb-4">
          <h2
            className="gba:text-xl gba:font-semibold gba:mb-2"
            data-testid={formatDataTestId(prefixDataTestId, 'title')}
          >
            {getTranslationFromI18nKeyAndLabel('task.delete.title', 'Delete Task')}
          </h2>
        </div>

        <div
          className="gba:border gba:border-destructive gba:rounded-md gba:p-4"
          data-testid={formatDataTestId(prefixDataTestId, 'warning')}
        >
          <div className="gba:flex">
            <div className="gba:flex-shrink-0">
              <svg className="gba:h-5 gba:w-5 gba:text-destructive" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="gba:ml-3">
              <h3 className="gba:text-sm gba:font-medium gba:text-destructive">
                {getTranslationFromI18nKeyAndLabel(
                  'task.delete.confirmation.question',
                  'Are you sure you want to delete this task?'
                )}
              </h3>
              <div className="gba:mt-2 gba:text-sm gba:text-destructive-secondary-foreground">
                <p>
                  <strong>{getTranslationFromI18nKeyAndLabel('common.name', 'Name')}:</strong>{' '}
                  <Badge variant="outline" className="gba:ml-1">
                    {task.name}
                  </Badge>
                </p>
                {task.code && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('common.code', 'Code')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {task.code}
                    </Badge>
                  </p>
                )}
                {task.description && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('common.description', 'Description')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {task.description.length > 50 ? `${task.description.substring(0, 50)}...` : task.description}
                    </Badge>
                  </p>
                )}
                {task.taskType && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('task.type', 'Type')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {task.taskType.value}
                    </Badge>
                  </p>
                )}
                {task.taskPriority && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('task.priority', 'Priority')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {task.taskPriority.value}
                    </Badge>
                  </p>
                )}
                {task.taskStatus && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('task.status', 'Status')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {task.taskStatus.value}
                    </Badge>
                  </p>
                )}
                {task.assignedEmployee && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('task.assignedTo', 'Assigned To')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {task.assignedEmployee.displayName ||
                        `${task.assignedEmployee.firstName || ''} ${task.assignedEmployee.lastName || ''}`.trim() ||
                        'Unassigned'}
                    </Badge>
                  </p>
                )}
                {task.dueDate && (
                  <p className="gba:mt-1">
                    <strong>{getTranslationFromI18nKeyAndLabel('task.dueDate', 'Due Date')}:</strong>{' '}
                    <Badge variant="outline" className="gba:ml-1">
                      {new Date(task.dueDate).toLocaleDateString()}
                    </Badge>
                  </p>
                )}
                <p className="gba:mt-2 gba:font-medium gba:text-destructive">
                  {getTranslationFromI18nKeyAndLabel('common.deleteWarning', 'This action cannot be undone.')}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppActionForm>
  )
}

export default TaskDeletePopup
export { TaskDeletePopup }
