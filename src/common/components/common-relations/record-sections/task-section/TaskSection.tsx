import React, { useState, useMemo, useEffect } from 'react'
import {
  Button,
  TimelineLayout,
  Badge,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  EmptyState
} from '@newwork/nw-design-system'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { handleDocumentClick as handleDocumentClickUtil } from '@/common/utils/documentClickHandler'
import { getDocumentIcon } from '@/common/utils/documentIconUtils'
import {
  TaskDetailSheet,
  Task,
  TaskReference,
  TaskEmployee
} from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
import type { TaskAssigneeWithEmployee } from '@/common/components/common-relations/detail-sheets/task-detail-sheet/types'
import dayjs from 'dayjs'
import {
  CheckIcon,
  ClockIcon,
  WarningIcon,
  PlayIcon,
  PlusIcon,
  DotsThreeVertical,
  CalendarCheck
} from '@phosphor-icons/react'
import { buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { FileInfo } from '@/common/types/FileTypes'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import type { Task as BaseTask, TaskAssignee } from '@/common/data/relations/types/taskTypes'
import { transformTaskOrApproval } from './utils/taskMappers'
import { DocuSignSignatureModal } from '@/common/components/docusign/DocuSignSignatureModal'
import { type InvestmentTask } from '@/common/data/investment/types/investmentTaskTypes'
import { buildInvestmentTaskFormDataFromTask } from '@/common/components/docusign/utils/investmentTaskMapper'
import { useEnvelopeStatusCache } from '@/common/components/docusign/hooks/useEnvelopeStatusCache'
import { getDocuSignButtonState } from '@/common/components/docusign/utils/docuSignTaskUtils'
import {
  computeTaskStatus,
  formatTaskProgress,
  getTaskAssigneeDisplayName,
  getEmployeeDisplayName
} from '../../utils/taskStatusUtils'

export type TaskStatusCode = 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED'
export type TaskTimingType = 'DEADLINE' | 'SCHEDULED' | 'UNKNOWN_TIMING_TYPE'

export type TaskDocument = {
  id: string
  name: string
  mimeType?: string
  fileSize?: number
  file?: string
  version?: number
  description?: string
  documentGroupRef?: string
  documentTypeRef?: string
  envelopeId?: string
  envelopeStatus?: string
  fileInfo?: FileInfo
}

export type TaskItem = {
  id: string
  title: string
  description?: string
  createdAt?: string
  due?: string
  assignee?: string
  statusCode?: TaskStatusCode
  taskStatus?: CatalogEntry
  taskPriority?: CatalogEntry
  taskType?: CatalogEntry
  assigneeEmployee?:
    | {
        id: string
        displayName?: string
        firstName?: string
        lastName?: string
        pictureThumbnail?: string
        userId?: string
      }
    | Array<{
        id: string
        displayName?: string
        firstName?: string
        lastName?: string
        pictureThumbnail?: string
        userId?: string
      }> // Support both single (CRM) and multiple (IRM) assignees
  taskAssignees?: TaskAssignee[] // Full junction table data with individual statuses
  creatorEmployee?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
  reference?: TaskReference
  taskTiming?: TaskTimingType
  startDate?: string
  documents?: TaskDocument[]
  rawTask?: BaseTask
}

// Helper functions to reduce cognitive complexity
const formatTaskDate = (dateString: string | undefined): string => {
  if (!dateString) return ''
  const date = dayjs(dateString)
  return date.isValid() ? date.format('MMM D, YYYY [at] h:mm A') : dateString
}

const buildTaskDescription = (dueDate: string): string[] => {
  const descParts: string[] = []
  if (dueDate) {
    descParts.push(`Due ${dueDate}`)
  }
  return descParts
}

export interface TaskSectionProps extends BusinessAppContextProps {
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
  investmentId?: string
  tasks?: BaseTask[]
  'data-testid'?: string
  taskActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  taskEntityActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  sectionTitle?: string
  buildReferenceUrl?: (reference: TaskReference) => string
  refetch?: () => void
}

const TaskSection: React.FC<TaskSectionProps> = ({
  accessToken,
  userInfo,
  additionalData,
  tasks: rawTasks,
  taskEntityActionProps,
  refetch,
  buildReferenceUrl
}) => {
  const { statusMap, ensureStatus, statusVersion } = useEnvelopeStatusCache(accessToken)

  useEffect(() => {
    if (!rawTasks || rawTasks.length === 0) {
      return
    }
    const envelopeIds = new Set<string>()
    rawTasks.forEach(task => {
      ;(task.documents || []).forEach(doc => {
        const envelopeId = (doc.fileInfo as any)?.docusignEnvelopeId
        if (envelopeId) {
          envelopeIds.add(envelopeId)
        }
      })
    })
    envelopeIds.forEach(id => {
      ensureStatus(id)
    })
  }, [rawTasks, ensureStatus])

  // Map raw tasks to TaskItem format
  const tasks = useMemo(() => {
    if (!rawTasks || rawTasks.length === 0) return []

    return rawTasks.map((task: BaseTask) => {
      const transformed = transformTaskOrApproval(
        {
          id: task.id,
          name: task.name,
          displayName: task.name,
          description: task.description,
          createdAt: task.createdAt,
          dueDate: task.dueDate,
          taskAssignees: task.taskAssignees,
          taskStatus: task.taskStatus,
          taskPriority: task.taskPriority,
          taskType: task.taskType,
          taskTiming: task.taskTiming,
          startDate: task.startDate,
          creatorEmployee: task.creatorEmployee,
          documents: task.documents?.map(doc => {
            const envelopeId = (doc.fileInfo as any)?.docusignEnvelopeId
            const envelopeStatus = envelopeId ? statusMap[envelopeId]?.status?.toLowerCase() : undefined
            return {
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType,
              fileSize: doc.fileSize,
              file: (doc as any).file,
              version: (doc as any).version,
              description: (doc as any).description,
              documentGroupRef: (doc as any).documentGroupRef,
              documentTypeRef: (doc as any).documentTypeRef,
              envelopeId,
              envelopeStatus,
              fileInfo: doc.fileInfo
            } as TaskDocument
          }),
          lead: task.lead,
          account: task.account,
          contact: task.contact,
          opportunity: task.opportunity,
          investment: (task as any).investment
        },
        getTranslationFromI18nKeyAndLabel('crm.tasks.untitled', 'Untitled Task')
      )
      return {
        ...transformed,
        rawTask: task
      }
    })
  }, [rawTasks, statusVersion])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isDocuSignOpen, setIsDocuSignOpen] = useState(false)
  const [docuSignDocs, setDocuSignDocs] = useState<TaskDocument[]>([])
  const [docuSignAssignedUserId, setDocuSignAssignedUserId] = useState<string | undefined>(undefined)
  const [docuSignTask, setDocuSignTask] = useState<Task | null>(null)
  const [docuSignTaskFormData, setDocuSignTaskFormData] = useState<Partial<InvestmentTask> | null>(null)
  const [docuSignFocusReferral, setDocuSignFocusReferral] = useState(false)
  const businessAppContext = useMemo(
    () => ({
      accessToken,
      userInfo,
      additionalData
    }),
    [accessToken, userInfo, additionalData]
  )

  // Handle document download
  const handleDocumentClick = async (document: TaskDocument, e: React.MouseEvent) => {
    e.stopPropagation()
    await handleDocumentClickUtil(document, accessToken, { showToast: true })
  }

  // Determine color and icon based on status
  const getStatusColorAndIcon = (statusCode?: string) => {
    if (statusCode === 'OVERDUE') {
      return {
        color: 'destructive',
        icon: (props: any) => <WarningIcon weight="bold" {...props} />
      }
    }

    if (statusCode === 'COMPLETED') {
      return {
        color: 'success',
        icon: (props: any) => <CheckIcon weight="bold" {...props} />
      }
    }
    if (statusCode === 'IN_PROGRESS') {
      return {
        color: 'info',
        icon: (props: any) => <PlayIcon weight="bold" {...props} />
      }
    }
    if (statusCode === 'PENDING') {
      return {
        color: 'warning',
        icon: (props: any) => <ClockIcon weight="bold" {...props} />
      }
    }
    return {
      color: 'info',
      icon: (props: any) => <ClockIcon weight="bold" {...props} />
    }
  }

  // Get timing type icon for deadline vs scheduled tasks
  const getTimingTypeIcon = (taskTiming?: string) => {
    if (!taskTiming)
      return {
        icon: <ClockIcon size={14} className="gba:text-gray-400" weight="bold" />,
        tooltip: 'No timing type specified'
      }

    switch (taskTiming.toUpperCase()) {
      case 'DEADLINE':
        return {
          icon: <ClockIcon size={14} className="gba:text-destructive" weight="bold" />,
          tooltip: 'Deadline - Complete by this date'
        }
      case 'SCHEDULED':
        return {
          icon: <CalendarCheck size={14} className="gba:text-info" weight="bold" />,
          tooltip: 'Scheduled - Execute on this specific date'
        }
      default:
        return {
          icon: <ClockIcon size={14} className="gba:text-gray-400" weight="bold" />,
          tooltip: 'Unknown timing type'
        }
    }
  }

  // Convert TaskItem to Task format
  const convertToCommonTask = (taskItem: TaskItem): Task => {
    const rawTask = taskItem.rawTask as BaseTask | undefined

    // assigneeEmployee is already an array (or undefined) from transformTaskOrApproval
    const assigneeEmployee = taskItem.assigneeEmployee
    const creatorEmployee = taskItem.creatorEmployee || rawTask?.creatorEmployee

    // Convert assignee array to Task format (can be single or array)
    let assignedTo: TaskEmployee | TaskEmployee[] | undefined
    if (assigneeEmployee && Array.isArray(assigneeEmployee)) {
      assignedTo = assigneeEmployee.map(emp => ({
        id: emp.id,
        firstName: emp.firstName || '',
        lastName: emp.lastName || '',
        displayName: getEmployeeDisplayName(emp),
        pictureThumbnail: emp.pictureThumbnail
      }))
      // If single assignee, unwrap from array for cleaner detail sheet display
      if (assignedTo.length === 1) {
        assignedTo = assignedTo[0]
      }
    }

    const documentsSource =
      (taskItem.documents as TaskDocument[] | undefined)?.map(doc => ({
        ...doc
      })) || []

    return {
      id: taskItem.id,
      name: taskItem.title,
      code: rawTask?.code,
      businessKey: rawTask?.businessKey,
      description: taskItem.description || rawTask?.description || '',
      assignedTo,
      taskAssignees: (taskItem.taskAssignees || rawTask?.taskAssignees)?.filter(assignee => !!assignee.id) as
        | TaskAssigneeWithEmployee[]
        | undefined,
      creatorEmployee: creatorEmployee
        ? {
            id: creatorEmployee.id,
            firstName: creatorEmployee.firstName || '',
            lastName: creatorEmployee.lastName || '',
            displayName:
              creatorEmployee.displayName ||
              `${creatorEmployee.firstName || ''} ${creatorEmployee.lastName || ''}`.trim() ||
              'Unknown',
            pictureThumbnail: creatorEmployee.pictureThumbnail
          }
        : undefined,
      taskType: rawTask?.taskType || taskItem.taskType,
      taskPriority: rawTask?.taskPriority || taskItem.taskPriority,
      taskStatus: rawTask?.taskStatus || taskItem.taskStatus,
      taskTypeRef: rawTask?.taskTypeRef,
      taskPriorityRef: rawTask?.taskPriorityRef,
      taskStatusRef: rawTask?.taskStatusRef,
      dueDate: rawTask?.dueDate || taskItem.due || taskItem.createdAt || '',
      createdAt: taskItem.createdAt || rawTask?.createdAt || '',
      updatedAt: rawTask?.updatedAt || taskItem.createdAt || '',
      reference: taskItem.reference,
      timingType: (rawTask?.taskTiming || taskItem.taskTiming) as any,
      taskTiming: rawTask?.taskTiming,
      scheduleDate: rawTask?.startDate || taskItem.startDate,
      templateStartDate: rawTask?.templateStartDate,
      startDate: rawTask?.startDate,
      endDate: rawTask?.endDate,
      version: rawTask?.version,
      creatorEmployeeId: rawTask?.creatorEmployeeId,
      creatorUserId: rawTask?.creatorUserId,
      investmentId: (rawTask as any)?.investmentId || (rawTask as any)?.investment?.id,
      accountId: rawTask?.accountId,
      contactId: rawTask?.contactId,
      opportunityId: rawTask?.opportunityId,
      leadId: rawTask?.leadId,
      documents: documentsSource,
      rawInvestmentTask: rawTask
    }
  }

  const handleTaskClick = (taskItem: TaskItem) => {
    const Task = convertToCommonTask(taskItem)
    setSelectedTask(Task)
  }

  // Helper: Get first assignee from single or array
  const getFirstAssignee = (assigneeEmployee: any) => {
    if (!assigneeEmployee) return undefined
    return Array.isArray(assigneeEmployee) ? assigneeEmployee[0] : assigneeEmployee
  }

  // Helper: Check if user is assignee (handles both single and array)
  const isUserAssignee = (assigneeEmployee: any, userId?: string) => {
    if (!assigneeEmployee || !userId) return false

    if (Array.isArray(assigneeEmployee)) {
      return assigneeEmployee.some(emp => emp?.userId === userId)
    }

    return assigneeEmployee?.userId === userId
  }

  // Map task priority type to badge variant
  const getPriorityBadgeVariant = (priority?: CatalogEntry): 'offline' | 'secondary' | 'warning' => {
    const type = priority?.type?.toUpperCase()
    switch (type) {
      case 'LOW':
        return 'offline'
      case 'MEDIUM':
        return 'secondary'
      case 'HIGH':
        return 'warning'
      default:
        return 'secondary'
    }
  }

  // Map task status type to badge variant
  const getStatusBadgeVariant = (status?: CatalogEntry): 'success' | 'info' | 'destructive' | 'warning' => {
    const type = status?.type?.toUpperCase()
    switch (type) {
      case 'COMPLETED':
        return 'success'
      case 'IN_PROGRESS':
        return 'info'
      case 'OVERDUE':
        return 'destructive'
      case 'PENDING':
        return 'warning'
      default:
        return 'warning'
    }
  }

  return (
    <>
      <div data-testid="task-section">
        {tasks && tasks.length > 0 ? (
          <TooltipProvider>
            <TimelineLayout
              items={tasks.map((t, idx) => {
                const createdDate = formatTaskDate(t.createdAt)
                const due = formatTaskDate(t.due)
                const descParts = buildTaskDescription(due)
                const code = t.statusCode

                const { color, icon } = getStatusColorAndIcon(code)

                const assigneeName = getTaskAssigneeDisplayName(t.assigneeEmployee, {
                  fallback: t.assignee,
                  showCount: true
                })
                const assigneeId = getFirstAssignee(t.assigneeEmployee)?.id

                // Get timing type icon and tooltip once to avoid duplicate function calls
                const timingTypeData = t.taskTiming ? getTimingTypeIcon(t.taskTiming) : null

                const taskActions = taskEntityActionProps ? (
                  <AppActionMenu
                    accessToken={accessToken}
                    contextsArray={taskEntityActionProps.contextsArray}
                    externalContextData={{
                      ...taskEntityActionProps.externalContextData,
                      taskId: t.id
                    }}
                    prefixDataTestId={`${taskEntityActionProps.prefixDataTestId}-${t.id}`}
                    deferMainContextRequestsUntilClick={true}
                    emptyStateBehavior="enable"
                  >
                    <div
                      className="gba:flex gba:items-center gba:justify-center gba:h-6 gba:w-6 gba:cursor-pointer gba:rounded gba:hover:bg-muted gba:transition-colors"
                      data-testid={`task-menu-${t.id}`}
                    >
                      <DotsThreeVertical size={16} />
                    </div>
                  </AppActionMenu>
                ) : null
                const documentsForTask = (t.documents as TaskDocument[]) || []
                const isAssigneeItem = isUserAssignee(t.assigneeEmployee, userInfo?.id)
                const { hasSignableDocs: hasSignableDocs, label: docuSignButtonLabel } = getDocuSignButtonState(
                  documentsForTask,
                  isAssigneeItem
                )

                // Compute task status for multi-assignee tasks
                const taskStatusInfo =
                  t.taskAssignees && t.taskAssignees.length > 1
                    ? (() => {
                        const { overallStatus, progress } = computeTaskStatus(t.taskAssignees as any)

                        let statusLabel: string
                        if (overallStatus === 'COMPLETED') {
                          statusLabel = 'Completed'
                        } else if (overallStatus === 'IN_PROGRESS') {
                          statusLabel = 'In Progress'
                        } else {
                          statusLabel = 'Pending'
                        }

                        let variant: 'success' | 'info' | 'warning'
                        if (overallStatus === 'COMPLETED') {
                          variant = 'success'
                        } else if (overallStatus === 'IN_PROGRESS') {
                          variant = 'info'
                        } else {
                          variant = 'warning'
                        }

                        return { statusLabel, variant, progress }
                      })()
                    : null

                return {
                  id: t.id || `task-${idx}`,
                  date: createdDate,
                  title: (
                    <div className="gba:flex gba:items-center gba:justify-between gba:w-full gba:gap-2">
                      <div
                        className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0 gba:cursor-pointer gba:hover:bg-accent gba:rounded gba:px-2 gba:py-1 gba:-mx-2 gba:-my-1 gba:transition-colors"
                        onClick={() => handleTaskClick(t)}
                        data-testid={`task-item-${t.id}`}
                      >
                        <span className="gba:truncate">{t.title}</span>
                        {/* Show computed status for multi-assignee tasks */}
                        {taskStatusInfo ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge variant={taskStatusInfo.variant} size="sm">
                                {taskStatusInfo.statusLabel} ({taskStatusInfo.progress.completed}/
                                {taskStatusInfo.progress.total})
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{formatTaskProgress(taskStatusInfo.progress)}</p>
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          /* Show regular status for single or no assignee tasks */
                          t.taskStatus && (
                            <Badge variant={getStatusBadgeVariant(t.taskStatus)} size="sm">
                              {t.taskStatus.value || t.taskStatus.code}
                            </Badge>
                          )
                        )}
                        {t.taskPriority && (
                          <Badge variant={getPriorityBadgeVariant(t.taskPriority)} size="sm">
                            {t.taskPriority.value || t.taskPriority.code}
                          </Badge>
                        )}
                      </div>
                      <div className="gba:flex gba:items-center gba:gap-1">
                        {taskActions}
                        {hasSignableDocs && (
                          <Button
                            size="sm"
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                              e.stopPropagation()
                              const commonTask = convertToCommonTask(t)
                              setDocuSignTask(commonTask)
                              const formData = buildInvestmentTaskFormDataFromTask(commonTask)
                              setDocuSignTaskFormData(formData)
                              setDocuSignDocs(documentsForTask)
                              setDocuSignAssignedUserId(getFirstAssignee(t.assigneeEmployee)?.userId)
                              setDocuSignFocusReferral(false)
                              setIsDocuSignOpen(true)
                            }}
                          >
                            {docuSignButtonLabel}
                          </Button>
                        )}
                      </div>
                    </div>
                  ),
                  actor: assigneeName ? (
                    assigneeId ? (
                      <a
                        href={buildPlatformUrl('/platform/employee-record', { employeeId: assigneeId })}
                        className="gba:underline gba:text-inherit gba:hover:text-primary"
                        data-testid={`task-assignee-link-${assigneeId}`}
                        onClick={e => e.stopPropagation()}
                      >
                        {assigneeName}
                      </a>
                    ) : (
                      assigneeName
                    )
                  ) : undefined,
                  description: (
                    <div className="gba:flex gba:flex-col gba:gap-2">
                      <div className="gba:flex gba:items-center gba:gap-2">
                        {timingTypeData && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="gba:flex gba:items-center">{timingTypeData.icon}</div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{timingTypeData.tooltip}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}
                        <span>{descParts.join(' • ')}</span>
                      </div>
                      {t.documents && t.documents.length > 0 && (
                        <div className="gba:flex gba:flex-wrap gba:gap-2 gba:mt-1">
                          {t.documents.map(doc => (
                            <button
                              key={doc.id}
                              onClick={e => handleDocumentClick(doc, e)}
                              className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:text-xs gba:bg-muted gba:rounded gba:hover:bg-accent gba:transition-colors"
                              data-testid={`task-document-${t.id}-${doc.id}`}
                              title={doc.name}
                            >
                              {getDocumentIcon({ name: doc.name, mimeType: doc.mimeType, size: 14 })}
                              <span className="gba:truncate gba:max-w-[150px]">{doc.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ),
                  color,
                  icon
                } as any
              })}
              variant="default"
              orientation="vertical"
              datePosition="inline"
              className="gba:w-full"
            />
          </TooltipProvider>
        ) : (
          <EmptyState
            type="no-data"
            title="No Tasks"
            description={getTranslationFromI18nKeyAndLabel('tasks.emptyState', 'No tasks yet. Create your first task.')}
            data-testid="task-section-empty-state"
          />
        )}
      </div>

      {/* Task Details Sheet - now self-contained */}
      <TaskDetailSheet
        task={selectedTask}
        open={!!selectedTask}
        onOpenChange={open => {
          if (!open) setSelectedTask(null)
        }}
        buildReferenceUrl={buildReferenceUrl}
        data-testid="task-section-detail-sheet"
        accessToken={accessToken}
        assignedUserId={getFirstAssignee((tasks || []).find(x => x.id === selectedTask?.id)?.assigneeEmployee)?.userId}
        currentUserId={userInfo?.id}
        businessAppContext={businessAppContext}
        flowContext={taskEntityActionProps?.contextsArray?.[0]}
        onTaskCompleted={() => refetch?.()}
      />

      {/* DocuSign Modal (from list actions) */}
      <DocuSignSignatureModal
        isOpen={isDocuSignOpen}
        onClose={() => {
          setIsDocuSignOpen(false)
          setDocuSignFocusReferral(false)
        }}
        accessToken={accessToken}
        assignedUserId={docuSignAssignedUserId}
        emailOnly={!(docuSignAssignedUserId && userInfo?.id && docuSignAssignedUserId === (userInfo?.id as any))}
        businessAppContext={businessAppContext}
        taskContext={
          docuSignTask && docuSignTaskFormData
            ? {
                taskId: docuSignTask.id,
                taskFormData: docuSignTaskFormData
              }
            : undefined
        }
        documents={(docuSignDocs || []).map(d => ({
          id: d.id,
          name: d.name,
          mimeType: d.mimeType,
          version: d.version,
          envelopeStatus: d.envelopeStatus,
          fileInfo: d.fileInfo
        }))}
        focusReferral={docuSignFocusReferral}
      />
    </>
  )
}

// Static properties for SectionWrapper
;(TaskSection as any).sectionTitle = (props: TaskSectionProps) => props.sectionTitle || 'Tasks'
;(TaskSection as any).getActionButtonConfig = (_pageData: any, _pageIndex: number, props: TaskSectionProps) => {
  const { accessToken, taskActionProps } = props

  if (!taskActionProps || !accessToken) {
    return null
  }

  return {
    type: 'AppAction' as const,
    config: {
      contextsArray: taskActionProps.contextsArray,
      externalContextData: taskActionProps.externalContextData,
      prefixDataTestId: taskActionProps.prefixDataTestId,
      emptyStateBehavior: taskActionProps.emptyStateBehavior || 'enable',
      children: (
        <Button data-testid="add-task-button" variant="secondary" size="icon">
          <PlusIcon />
        </Button>
      )
    }
  }
}

export default TaskSection
