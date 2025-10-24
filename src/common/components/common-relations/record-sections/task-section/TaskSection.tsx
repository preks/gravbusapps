import React, { useState } from 'react'
import {
  Button,
  TimelineLayout,
  Badge,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { AppAction } from '@/components/app-action'
import { AppActionMenu } from '@/components/app-action-menu/AppActionMenu'
import type { AppActionCommonProps } from '@/common/hooks/useAppActionData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildFileUrl, getFileIcon } from '@/common/utils/fileUtils'
import {
  TaskDetailSheet,
  Task as CommonTask,
  TaskReference
} from '@/common/components/common-relations/detail-sheets/task-detail-sheet'
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

export type CatalogEntry = {
  id?: string
  code?: string
  value?: string
  type?: string
}

export type TaskStatusCode = 'PENDING' | 'IN_PROGRESS' | 'OVERDUE' | 'COMPLETED'
export type TaskTimingType = 'DEADLINE' | 'SCHEDULED' | 'UNKNOWN_TIMING_TYPE'

export type TaskDocument = {
  id: string
  name: string
  mimeType?: string
  fileSize?: number
  file?: string
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
  assigneeEmployee?: {
    id: string
    displayName?: string
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
  }
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
}

export interface TaskSectionProps extends BusinessAppContextProps {
  accountId?: string
  contactId?: string
  opportunityId?: string
  leadId?: string
  investmentId?: string
  tasks?: TaskItem[]
  'data-testid'?: string
  taskActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  taskEntityActionProps?: Omit<AppActionCommonProps, 'accessToken'>
  sectionTitle?: string
  buildReferenceUrl?: (reference: TaskReference) => string
}

const TaskSection: React.FC<TaskSectionProps> = ({ accessToken, tasks, taskEntityActionProps, buildReferenceUrl }) => {
  const [selectedTask, setSelectedTask] = useState<CommonTask | null>(null)

  // Handle document download
  const handleDocumentClick = (document: TaskDocument, e: React.MouseEvent) => {
    e.stopPropagation()

    if (!document.fileInfo) {
      return
    }

    try {
      const fileUrl = buildFileUrl(document.fileInfo)
      window.open(fileUrl, '_blank')
    } catch {
      // Silent fail - fileInfo structure invalid
    }
  }

  // Determine color and icon based on status
  const getStatusColorAndIcon = (statusCode?: string) => {
    if (statusCode === 'COMPLETED') {
      return {
        color: 'success',
        icon: (props: any) => <CheckIcon weight="bold" {...props} />
      }
    }
    if (statusCode === 'OVERDUE') {
      return {
        color: 'destructive',
        icon: (props: any) => <WarningIcon weight="bold" {...props} />
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

  // Convert TaskItem to CommonTask format
  const convertToCommonTask = (taskItem: TaskItem): CommonTask => {
    return {
      id: taskItem.id,
      name: taskItem.title,
      description: taskItem.description || '',
      assignedTo: {
        id: taskItem.assigneeEmployee?.id || '',
        firstName: taskItem.assigneeEmployee?.firstName || '',
        lastName: taskItem.assigneeEmployee?.lastName || '',
        displayName: taskItem.assigneeEmployee?.displayName || taskItem.assignee || 'Unknown',
        pictureThumbnail: taskItem.assigneeEmployee?.pictureThumbnail
      },
      creatorEmployee: taskItem.creatorEmployee
        ? {
            id: taskItem.creatorEmployee.id,
            firstName: taskItem.creatorEmployee.firstName || '',
            lastName: taskItem.creatorEmployee.lastName || '',
            displayName:
              taskItem.creatorEmployee.displayName ||
              `${taskItem.creatorEmployee.firstName || ''} ${taskItem.creatorEmployee.lastName || ''}`.trim() ||
              'Unknown',
            pictureThumbnail: taskItem.creatorEmployee.pictureThumbnail
          }
        : undefined,
      type: taskItem.taskType?.value || taskItem.taskType?.code || 'GENERAL',
      priority: (taskItem.taskPriority?.type?.toLowerCase() as any) || 'medium',
      status: (taskItem.statusCode?.toLowerCase() as any) || 'pending',
      dueDate: taskItem.due || taskItem.createdAt || '',
      createdAt: taskItem.createdAt || '',
      updatedAt: taskItem.createdAt || '',
      reference: taskItem.reference,
      timingType: taskItem.taskTiming as any,
      scheduleDate: taskItem.startDate
    }
  }

  const handleTaskClick = (taskItem: TaskItem) => {
    const commonTask = convertToCommonTask(taskItem)
    setSelectedTask(commonTask)
  }

  const getEmployeeDisplayName = (emp: any) => {
    if (!emp) return 'Unknown User'

    // Use firstName + lastName first
    const fullName = `${emp.firstName || ''} ${emp.lastName || ''}`.trim()
    if (fullName) return fullName

    // Fallback to displayName
    return emp.displayName || 'Unknown User'
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
                const createdDate = t.createdAt
                  ? dayjs(t.createdAt).isValid()
                    ? dayjs(t.createdAt).format('MMM D, YYYY [at] h:mm A')
                    : t.createdAt
                  : ''
                const due = t.due
                  ? dayjs(t.due).isValid()
                    ? dayjs(t.due).format('MMM D, YYYY [at] h:mm A')
                    : t.due
                  : ''
                const descParts: string[] = []
                if (due) descParts.push(`Due ${due}`)
                const code = t.statusCode

                const { color, icon } = getStatusColorAndIcon(code)

                const assigneeName = t.assigneeEmployee ? getEmployeeDisplayName(t.assigneeEmployee) : t.assignee
                const assigneeId = t.assigneeEmployee?.id

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
                        {t.taskStatus && (
                          <Badge variant={getStatusBadgeVariant(t.taskStatus)} size="sm">
                            {t.taskStatus.value || t.taskStatus.code}
                          </Badge>
                        )}
                        {t.taskPriority && (
                          <Badge variant={getPriorityBadgeVariant(t.taskPriority)} size="sm">
                            {t.taskPriority.value || t.taskPriority.code}
                          </Badge>
                        )}
                      </div>
                      {taskActions}
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
                          {t.documents.map(doc => {
                            const FileIcon = getFileIcon(doc.mimeType)
                            return (
                              <button
                                key={doc.id}
                                onClick={e => handleDocumentClick(doc, e)}
                                className="gba:flex gba:items-center gba:gap-1 gba:px-2 gba:py-1 gba:text-xs gba:bg-muted gba:rounded gba:hover:bg-accent gba:transition-colors"
                                data-testid={`task-document-${t.id}-${doc.id}`}
                                title={doc.name}
                              >
                                <FileIcon size={14} weight="bold" />
                                <span className="gba:truncate gba:max-w-[150px]">{doc.name}</span>
                              </button>
                            )
                          })}
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
          <div className="gba:text-center gba:text-sm gba:text-muted-foreground">
            {getTranslationFromI18nKeyAndLabel('tasks.emptyState', 'No tasks yet. Create your first task.')}
          </div>
        )}
      </div>

      {/* Task Details Sheet */}
      <Sheet
        open={!!selectedTask}
        onOpenChange={open => {
          if (!open) setSelectedTask(null)
        }}
        title="Task Details"
      >
        <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
          <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
            <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
              {selectedTask?.name || getTranslationFromI18nKeyAndLabel('tasks.taskDetails', 'Task Details')}
            </SheetTitle>
          </SheetHeader>
          <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
            {selectedTask ? (
              <TaskDetailSheet
                task={selectedTask}
                buildReferenceUrl={buildReferenceUrl}
                data-testid="task-section-detail-sheet"
              />
            ) : (
              <div className="gba:p-4 gba:text-center gba:text-muted-foreground">No task selected</div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}

// Static properties for SectionWrapper
;(TaskSection as any).sectionTitle = (props: TaskSectionProps) => props.sectionTitle || 'Tasks'
;(TaskSection as any).sectionActions = (props: TaskSectionProps) => {
  const { accessToken, taskActionProps } = props

  if (!taskActionProps) {
    return null
  }

  return (
    <AppAction
      accessToken={accessToken}
      contextsArray={taskActionProps.contextsArray}
      externalContextData={taskActionProps.externalContextData}
      prefixDataTestId={taskActionProps.prefixDataTestId}
      emptyStateBehavior={taskActionProps.emptyStateBehavior}
    >
      <Button data-testid="add-task-button" variant="secondary" size="icon">
        <PlusIcon />
      </Button>
    </AppAction>
  )
}

export default TaskSection
