'use client'

import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ScrollArea,
  Separator,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'
import {
  CalendarIcon,
  UserIcon,
  ArrowSquareOutIcon,
  FlagIcon,
  TagIcon,
  CheckCircleIcon,
  LinkIcon,
  CalendarPlusIcon,
  ClockCounterClockwiseIcon,
  TextAlignLeftIcon,
  Icon as PhosphorIcon
} from '@phosphor-icons/react'
import { Task, TaskReference, TaskDocument } from './types'
import { buildFileUrl, getFileIcon } from '@/common/utils/fileUtils'
import {
  getTaskStatusBadgeVariant,
  getTaskPriorityBadgeVariant,
  getTaskTypeBadgeVariant,
  getReferenceTypeBadgeVariant
} from './utils'
import dayjs from 'dayjs'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { DocuSignSignatureModal } from '@/common/components/docusign/DocuSignSignatureModal'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { buildInvestmentTaskFormDataFromTask } from '@/common/components/docusign/utils/investmentTaskMapper'
import { useEnvelopeStatusCache } from '@/common/components/docusign/hooks/useEnvelopeStatusCache'
import { getDocuSignButtonState } from '@/common/components/docusign/utils/docuSignTaskUtils'
import { computeTaskStatus, formatTaskProgress, getTaskStatusLabel } from '../../utils/taskStatusUtils'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'

interface TaskDetailSheetProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  buildReferenceUrl?: (reference: TaskReference) => string
  'data-testid'?: string
  accessToken?: string
  assignedUserId?: string
  currentUserId?: string
  businessAppContext?: BusinessAppContextProps
}

const DATA_TEST_ID_PREFIX = 'TaskDetailSheet'

interface FieldRowProps {
  icon: PhosphorIcon
  label: string
  children: React.ReactNode
  testId?: string
}

const FieldRow: React.FC<FieldRowProps> = ({ icon: IconComponent, label, children, testId }) => (
  <div className="gba:flex gba:items-start gba:gap-3 gba:py-2" data-testid={testId}>
    <div className="gba:flex gba:items-center gba:gap-2 gba:min-w-[100px] gba:text-sm gba:text-muted-foreground">
      <IconComponent size={14} className="gba:text-muted-foreground" />
      <span>{label}</span>
    </div>
    <div className="gba:flex-1">{children}</div>
  </div>
)

/**
 * TaskDetailSheet with integrated Sheet component
 * Displays detailed task information in a slide-out panel
 */
export const TaskDetailSheet: React.FC<TaskDetailSheetProps> = ({
  task,
  open,
  onOpenChange,
  buildReferenceUrl,
  'data-testid': dataTestId,
  accessToken,
  assignedUserId,
  currentUserId,
  businessAppContext
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Task Details">
      <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
        <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left">
            {task?.name || 'Task Details'}
          </SheetTitle>
        </SheetHeader>
        <div className="gba:flex-1 gba:overflow-hidden gba:px-6">
          {task ? (
            <TaskDetailContent
              task={task}
              buildReferenceUrl={buildReferenceUrl}
              data-testid={dataTestId}
              accessToken={accessToken}
              assignedUserId={assignedUserId}
              currentUserId={currentUserId}
              businessAppContext={businessAppContext}
            />
          ) : (
            <div className="gba:p-4 gba:text-center gba:text-muted-foreground">No task selected</div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

/**
 * TaskDetailContent - Internal component for rendering task details
 */
interface TaskDetailContentProps {
  task: Task
  buildReferenceUrl?: (reference: TaskReference) => string
  'data-testid'?: string
  accessToken?: string
  assignedUserId?: string
  currentUserId?: string
  businessAppContext?: BusinessAppContextProps
}

// Helper component: Task Instance Card
interface TaskInstanceCardProps {
  taskAssignee: {
    id?: string
    version?: number
    assignedEmployee?: {
      id: string
      displayName?: string
      firstName?: string
      lastName?: string
      pictureThumbnail?: string
    }
    assignedUserId?: string
    taskStatus?: string
    completedAt?: string | null
  }
  index: number
  currentUserId?: string
  dataTestId?: string
  accessToken?: string
  taskId: string
  entityType: 'investment' | 'customer'
}

const TaskInstanceCard: React.FC<TaskInstanceCardProps> = ({
  taskAssignee,
  index,
  currentUserId,
  dataTestId,
  accessToken,
  taskId,
  entityType
}) => {
  const employee = taskAssignee.assignedEmployee
  const isCurrentUser = currentUserId && taskAssignee.assignedUserId === currentUserId
  const statusLabel = getTaskStatusLabel(taskAssignee.taskStatus) || 'No Status'

  return (
    <div
      key={taskAssignee.id || index}
      className={`gba:p-3 gba:rounded-lg gba:border ${
        isCurrentUser ? 'gba:border-primary gba:bg-accent/10' : 'gba:bg-muted'
      }`}
      data-testid={`${dataTestId}-instance-${index}`}
    >
      <div className="gba:flex gba:items-center gba:gap-3 gba:mb-3">
        <Avatar
          size="default"
          className="gba:cursor-pointer"
          onClick={() => {
            if (employee?.id) {
              const url = buildPlatformUrl('/platform/employee-record', { employeeId: employee.id })
              navigateTo(url)
            }
          }}
        >
          {employee?.pictureThumbnail && (
            <AvatarImage
              src={`data:image/gif;base64,${employee.pictureThumbnail}`}
              alt={employee?.displayName || 'Unknown'}
            />
          )}
          <AvatarFallback>
            {employee?.firstName?.charAt(0) || '?'}
            {employee?.lastName?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <span className="gba:text-sm gba:font-medium">{employee?.displayName || 'Unknown Assignee'}</span>
            {isCurrentUser && (
              <Badge variant="outline" size="sm">
                You
              </Badge>
            )}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
            Instance ID: {taskAssignee.id?.substring(0, 8)}...
            {taskAssignee.version !== undefined && ` • Version: ${taskAssignee.version}`}
          </div>
        </div>

        <div className="gba:text-right">
          <Badge
            variant={taskAssignee.taskStatus ? getTaskStatusBadgeVariant(taskAssignee.taskStatus) : 'secondary'}
            size="sm"
          >
            {statusLabel}
          </Badge>
          {taskAssignee.completedAt && (
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-1">
              {dayjs(taskAssignee.completedAt).format('MMM D, YYYY')}
            </div>
          )}
        </div>
      </div>

      {isCurrentUser && accessToken && (
        <div className="gba:pt-3 gba:border-t gba:mt-3">
          <AppAction
            mode="action-button"
            size="sm"
            variant="outline"
            contexts={[
              entityType === 'investment' ? FlowContextName.investmentTaskEntity : FlowContextName.customerTaskEntity
            ]}
            externalContextData={{ taskId }}
            accessToken={accessToken}
            emptyState="enable"
            data-testid={`${dataTestId}-update-button-${index}`}
          >
            Update My Status
          </AppAction>
        </div>
      )}
    </div>
  )
}

// Helper component: Reference Field
interface ReferenceFieldProps {
  reference?: TaskReference
  buildReferenceUrl?: (reference: TaskReference) => string
  dataTestId?: string
  onReferenceClick: () => void
  getReferenceTypeBadgeVariant: (type: string) => string
}

const ReferenceField: React.FC<ReferenceFieldProps> = ({
  reference,
  buildReferenceUrl,
  dataTestId,
  onReferenceClick,
  getReferenceTypeBadgeVariant
}) => {
  if (!reference) {
    return <span className="gba:text-sm gba:text-muted-foreground">No reference</span>
  }

  const referenceTypeName = reference.type.charAt(0).toUpperCase() + reference.type.slice(1)

  if (!buildReferenceUrl) {
    return (
      <div className="gba:px-2 gba:py-1 gba:w-fit gba:min-h-[24px]">
        <div className="gba:flex gba:items-center gba:gap-2">
          <Badge variant={getReferenceTypeBadgeVariant(reference.type) as any} className="gba:text-xs gba:shrink-0">
            {referenceTypeName}
          </Badge>
          <span className="gba:text-sm gba:font-medium gba:truncate">{reference.name}</span>
        </div>
      </div>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px]"
          onClick={onReferenceClick}
          data-testid={`${dataTestId}-reference-link`}
        >
          <div className="gba:flex gba:items-center gba:gap-2">
            <Badge variant={getReferenceTypeBadgeVariant(reference.type) as any} className="gba:text-xs gba:shrink-0">
              {referenceTypeName}
            </Badge>
            <span className="gba:text-sm gba:font-medium gba:truncate">{reference.name}</span>
            <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent>View {reference.type} record</TooltipContent>
    </Tooltip>
  )
}

const TaskDetailContent: React.FC<TaskDetailContentProps> = ({
  task,
  buildReferenceUrl,
  'data-testid': dataTestId,
  accessToken,
  assignedUserId,
  currentUserId,
  businessAppContext
}) => {
  const formatDate = (dateString: string) => {
    if (!dateString) return '-'
    const date = dayjs(dateString)
    return date.isValid() ? date.format('MMM DD, YYYY') : '-'
  }

  const formatDateTime = (dateString: string) => {
    if (!dateString) return '-'
    const date = dayjs(dateString)
    return date.isValid() ? date.format('MMM DD, YYYY h:mm A') : '-'
  }

  const getInitials = (firstName: string, lastName: string): string => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase()
  }

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

  const [isDocuSignOpen, setIsDocuSignOpen] = React.useState(false)
  const { statusMap, ensureStatus, statusVersion } = useEnvelopeStatusCache(accessToken)
  const investmentTaskFormData = React.useMemo(() => buildInvestmentTaskFormDataFromTask(task), [task])
  const docuSignTaskContext = React.useMemo(
    () =>
      investmentTaskFormData
        ? {
            taskId: task.id,
            taskFormData: investmentTaskFormData
          }
        : undefined,
    [investmentTaskFormData, task.id]
  )

  const isAssignee = React.useMemo(() => {
    return Boolean(assignedUserId && currentUserId && assignedUserId === currentUserId)
  }, [assignedUserId, currentUserId])

  const documentsWithStatus = React.useMemo(() => {
    return (task.documents || []).map(doc => {
      const envelopeId = (doc.fileInfo as any)?.docusignEnvelopeId
      const envelopeStatus = envelopeId ? statusMap[envelopeId]?.status?.toLowerCase() : undefined
      return {
        ...doc,
        envelopeId,
        envelopeStatus
      }
    })
  }, [task.documents, statusMap, statusVersion])

  React.useEffect(() => {
    documentsWithStatus.forEach(doc => {
      if (doc.envelopeId) {
        ensureStatus(doc.envelopeId)
      }
    })
  }, [documentsWithStatus, ensureStatus])

  const { hasSignableDocs, label: docuSignButtonLabel } = React.useMemo(
    () => getDocuSignButtonState(documentsWithStatus, isAssignee),
    [documentsWithStatus, isAssignee]
  )

  const checkEnvelopeStatus = async (envelopeId: string) => {
    try {
      await ensureStatus(envelopeId)
    } catch {
      // ignore
    }
  }

  // Determine if task is overdue based on timing type
  const getTaskDate = () => {
    return task.timingType?.toUpperCase() === 'SCHEDULED' && task.scheduleDate ? task.scheduleDate : task.dueDate
  }

  const taskDate = getTaskDate()

  // Extract status, priority, type from common relation fields (CatalogEntry objects)
  // Supports both CRM (status/priority/type) and IRM (taskStatus/taskPriority/taskType) naming
  const taskStatus = (task as any).taskStatus as CatalogEntry
  const taskPriority = (task as any).taskPriority as CatalogEntry
  const taskType = (task as any).taskType as CatalogEntry

  const isOverdue = !!taskDate && dayjs().isAfter(dayjs(taskDate)) && taskStatus?.type !== 'COMPLETED'

  const handleReferenceClick = () => {
    if (!task.reference || !buildReferenceUrl) return

    const url = buildReferenceUrl(task.reference)
    if (url) {
      navigateTo(url)
    }
  }

  // Safety check for task data
  if (!task) {
    return (
      <div
        className="gba:p-4 gba:text-center gba:text-muted-foreground"
        data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-no-data`}
      >
        No task data available
      </div>
    )
  }

  return (
    <ScrollArea className="gba:h-full gba:w-full" data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-scroll-area`}>
      <div className="gba:space-y-4 gba:p-1" data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-container`}>
        <Card data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-details-card`}>
          <CardHeader className="gba:pb-3">
            <div className="gba:flex gba:items-center gba:justify-between">
              <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground">Details</CardTitle>
              {hasSignableDocs && (
                <Button size="sm" onClick={() => setIsDocuSignOpen(true)}>
                  {docuSignButtonLabel}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="gba:space-y-1">
            <FieldRow
              icon={CheckCircleIcon}
              label="Status"
              testId={`${dataTestId || DATA_TEST_ID_PREFIX}-status-field`}
            >
              {taskStatus ? (
                <>
                  <Badge variant={getTaskStatusBadgeVariant(taskStatus.type as string)}>
                    {getCatalogEntryValue(taskStatus as any)}
                  </Badge>
                  {isOverdue && (
                    <Badge variant="destructive" className="gba:ml-2">
                      Overdue
                    </Badge>
                  )}
                </>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">-</span>
              )}
            </FieldRow>

            <FieldRow icon={FlagIcon} label="Priority" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-priority-field`}>
              {taskPriority ? (
                <Badge variant={getTaskPriorityBadgeVariant(taskPriority.type || '')}>
                  {getCatalogEntryValue(taskPriority as any)}
                </Badge>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">-</span>
              )}
            </FieldRow>

            <FieldRow icon={TagIcon} label="Type" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-type-field`}>
              {taskType ? (
                <Badge variant={getTaskTypeBadgeVariant(taskType.type || '')}>
                  {getCatalogEntryValue(taskType as any)}
                </Badge>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">-</span>
              )}
            </FieldRow>

            <FieldRow icon={LinkIcon} label="Reference" testId={`${dataTestId || DATA_TEST_ID_PREFIX}-reference-field`}>
              <ReferenceField
                reference={task.reference}
                buildReferenceUrl={buildReferenceUrl}
                dataTestId={dataTestId || DATA_TEST_ID_PREFIX}
                onReferenceClick={handleReferenceClick}
                getReferenceTypeBadgeVariant={getReferenceTypeBadgeVariant}
              />
            </FieldRow>

            <FieldRow
              icon={UserIcon}
              label="Created By"
              testId={`${dataTestId || DATA_TEST_ID_PREFIX}-created-by-field`}
            >
              {task.creatorEmployee ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:w-fit gba:min-h-[24px]"
                      onClick={() => {
                        if (task.creatorEmployee) {
                          const url = buildPlatformUrl('/platform/employee-record', {
                            employeeId: task.creatorEmployee.id
                          })
                          navigateTo(url)
                        }
                      }}
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-creator-link`}
                    >
                      <Avatar size="sm" className="gba:size-6">
                        {task.creatorEmployee.pictureThumbnail && (
                          <AvatarImage
                            src={`data:image/gif;base64,${task.creatorEmployee.pictureThumbnail}`}
                            alt={
                              task.creatorEmployee.displayName ||
                              `${task.creatorEmployee.firstName} ${task.creatorEmployee.lastName}`
                            }
                          />
                        )}
                        <AvatarFallback className="gba:text-xs">
                          {getInitials(task.creatorEmployee.firstName || '', task.creatorEmployee.lastName || '')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="gba:text-sm gba:font-medium">
                        {task.creatorEmployee.displayName ||
                          `${task.creatorEmployee.firstName || ''} ${task.creatorEmployee.lastName || ''}`.trim() ||
                          'Unknown'}
                      </span>
                      <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>View employee profile</TooltipContent>
                </Tooltip>
              ) : (
                <span className="gba:text-sm gba:text-muted-foreground">Unknown</span>
              )}
            </FieldRow>

            <Separator className="gba:my-4" />

            {/* Show either Due Date or Scheduled Date based on timing type */}
            {task.timingType?.toUpperCase() === 'SCHEDULED' ? (
              <FieldRow
                icon={CalendarPlusIcon}
                label="Scheduled"
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-schedule-date-field`}
              >
                <span
                  className={`gba:text-sm ${isOverdue ? 'gba:text-destructive gba:font-medium' : 'gba:text-foreground'}`}
                >
                  {formatDate(task.scheduleDate || task.dueDate || '')}
                </span>
              </FieldRow>
            ) : (
              <FieldRow
                icon={CalendarIcon}
                label="Due Date"
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-due-date-field`}
              >
                <span
                  className={`gba:text-sm ${isOverdue ? 'gba:text-destructive gba:font-medium' : 'gba:text-foreground'}`}
                >
                  {formatDate(task.dueDate || '')}
                </span>
              </FieldRow>
            )}

            <Separator className="gba:my-4" />

            <FieldRow
              icon={ClockCounterClockwiseIcon}
              label="Created"
              testId={`${dataTestId || DATA_TEST_ID_PREFIX}-created-field`}
            >
              <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.createdAt || '')}</span>
            </FieldRow>

            {task.description && (
              <FieldRow
                icon={TextAlignLeftIcon}
                label="Description"
                testId={`${dataTestId || DATA_TEST_ID_PREFIX}-description-field`}
              >
                <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{task.description}</p>
              </FieldRow>
            )}
          </CardContent>
        </Card>

        {documentsWithStatus.length > 0 && (
          <Card data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-documents-card`}>
            <CardHeader className="gba:pb-3">
              <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground">
                Documents ({documentsWithStatus.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-2">
                {documentsWithStatus.map(doc => {
                  const FileIcon = getFileIcon(doc.mimeType)
                  const envelopeId = doc.envelopeId || (doc.fileInfo as any)?.docusignEnvelopeId
                  const displayStatus = envelopeId
                    ? statusMap[envelopeId]?.status || doc.envelopeStatus || 'unknown'
                    : null
                  return (
                    <button
                      type="button"
                      key={doc.id}
                      onClick={e => handleDocumentClick(doc, e)}
                      className="gba:w-full gba:flex gba:items-center gba:gap-3 gba:p-3 gba:text-left gba:bg-muted gba:rounded-lg gba:hover:bg-accent gba:transition-colors gba:group"
                      data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-document-${doc.id}`}
                    >
                      <div className="gba:flex gba:items-center gba:justify-center gba:w-8 gba:h-8 gba:bg-background gba:rounded gba:shrink-0">
                        <FileIcon size={14} weight="bold" />
                      </div>
                      <div className="gba:flex-1 gba:min-w-0">
                        <div className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{doc.name}</div>
                        {doc.mimeType && (
                          <div className="gba:text-xs gba:text-muted-foreground gba:mt-0.5">{doc.mimeType}</div>
                        )}
                        {envelopeId ? (
                          <div className="gba:mt-1 gba:flex gba:items-center gba:gap-2">
                            <span className="gba:text-xs gba:text-muted-foreground">DocuSign:</span>
                            <span className="gba:text-xs gba:font-medium">{displayStatus}</span>
                            <Button
                              variant="link"
                              size="sm"
                              onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                                e.stopPropagation()
                                if (envelopeId) {
                                  checkEnvelopeStatus(envelopeId)
                                }
                              }}
                            >
                              Check status
                            </Button>
                          </div>
                        ) : null}
                      </div>
                      <ArrowSquareOutIcon
                        size={16}
                        className="gba:text-muted-foreground gba:shrink-0 gba:opacity-0 group-hover:gba:opacity-100 gba:transition-opacity"
                      />
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Task Instances Section */}
        {((task.taskAssignees && task.taskAssignees.length > 0) ||
          (task.assignedTo && (Array.isArray(task.assignedTo) ? task.assignedTo.length > 0 : true))) && (
          <Card data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-instances-card`}>
            <CardHeader className="gba:pb-3">
              <div className="gba:flex gba:items-center gba:justify-between">
                <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
                  <UserIcon size={18} />
                  Task Instances
                </CardTitle>
                {task.taskAssignees && task.taskAssignees.length > 0 && (
                  <div className="gba:flex gba:items-center gba:gap-2">
                    <span className="gba:text-xs gba:text-muted-foreground">
                      {formatTaskProgress(computeTaskStatus(task.taskAssignees as any).progress)}
                    </span>
                    <Badge
                      variant={getTaskStatusBadgeVariant(computeTaskStatus(task.taskAssignees as any).overallStatus)}
                    >
                      {computeTaskStatus(task.taskAssignees as any).overallStatus}
                    </Badge>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="gba:space-y-2">
                {task.taskAssignees && task.taskAssignees.length > 0 ? (
                  // Show full task assignee instances with status
                  task.taskAssignees.map((taskAssignee, index) => (
                    <TaskInstanceCard
                      key={taskAssignee.id || index}
                      taskAssignee={taskAssignee}
                      index={index}
                      currentUserId={currentUserId}
                      dataTestId={dataTestId || DATA_TEST_ID_PREFIX}
                      accessToken={accessToken}
                      taskId={task.id}
                      entityType={task.investmentId ? 'investment' : 'customer'}
                    />
                  ))
                ) : (
                  // Fallback: Show basic assignee info without status
                  <>
                    {(Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo])
                      .filter(Boolean)
                      .map((employee, index) => (
                        <div key={employee?.id || index} className="gba:p-3 gba:rounded-lg gba:bg-muted">
                          <div className="gba:flex gba:items-center gba:gap-3">
                            <Avatar size="default">
                              {employee?.pictureThumbnail && (
                                <AvatarImage
                                  src={`data:image/gif;base64,${employee.pictureThumbnail}`}
                                  alt={employee?.displayName}
                                />
                              )}
                              <AvatarFallback>
                                {employee?.firstName?.charAt(0)}
                                {employee?.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="gba:flex-1">
                              <span className="gba:text-sm gba:font-medium">{employee?.displayName || 'Unknown'}</span>
                            </div>
                            <Badge variant="secondary" size="sm">
                              Status Unavailable
                            </Badge>
                          </div>
                        </div>
                      ))}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        <div className="gba:h-4" />
      </div>
      {/* DocuSign Modal */}
      <DocuSignSignatureModal
        isOpen={isDocuSignOpen}
        onClose={() => setIsDocuSignOpen(false)}
        accessToken={accessToken}
        assignedUserId={assignedUserId}
        emailOnly={!isAssignee}
        businessAppContext={businessAppContext}
        taskContext={docuSignTaskContext}
        documents={documentsWithStatus.map(d => ({
          id: d.id,
          name: d.name,
          mimeType: d.mimeType,
          version: d.version,
          envelopeStatus: d.envelopeStatus,
          fileInfo: d.fileInfo
        }))}
      />
    </ScrollArea>
  )
}

export default TaskDetailSheet
