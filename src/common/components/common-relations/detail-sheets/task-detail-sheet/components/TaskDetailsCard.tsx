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
  Separator,
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
  UserCircleIcon
} from '@phosphor-icons/react'
import { Task, TaskReference } from '../types'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { getCatalogEntryValue } from '@/common/data/catalog/utils/catalogTranslationUtils'
import {
  formatDate,
  formatDateTime,
  getInitials,
  getTaskStatusBadgeVariant,
  getTaskPriorityBadgeVariant,
  getTaskTypeBadgeVariant,
  getReferenceTypeBadgeVariant
} from '../utils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import { FieldRow } from './FieldRow'
import { ReferenceField } from './ReferenceField'

export interface TaskDetailsCardProps {
  task: Task
  taskStatus?: CatalogEntry
  taskPriority?: CatalogEntry
  taskType?: CatalogEntry
  buildReferenceUrl?: (reference: TaskReference) => string
  dataTestId?: string
  hasSignableDocs?: boolean
  docuSignButtonLabel?: string
  onOpenDocuSignModal?: () => void
}

/**
 * TaskDetailsCard - Displays task details including status, priority, type, dates, and description
 */
export const TaskDetailsCard: React.FC<TaskDetailsCardProps> = ({
  task,
  taskStatus,
  taskPriority,
  taskType,
  buildReferenceUrl,
  dataTestId = 'TaskDetailSheet',
  hasSignableDocs,
  docuSignButtonLabel,
  onOpenDocuSignModal
}) => {
  const handleReferenceClick = () => {
    if (!task.reference || !buildReferenceUrl) return

    const url = buildReferenceUrl(task.reference)
    if (url) {
      navigateTo(url)
    }
  }

  // Check if this is an approval task
  const isApprovalTask = taskType?.type?.toUpperCase() === 'APPROVAL'

  // Get assigned employee for non-approval tasks (approval tasks show instances instead)
  const assignedEmployee = React.useMemo(() => {
    if (isApprovalTask) return null

    // Try taskAssignees first (from GraphQL)
    if (task.taskAssignees && task.taskAssignees.length > 0) {
      return task.taskAssignees[0].assignedEmployee
    }

    // Fallback to assignedTo (from conversion)
    if (task.assignedTo) {
      return Array.isArray(task.assignedTo) ? task.assignedTo[0] : task.assignedTo
    }

    return null
  }, [task.taskAssignees, task.assignedTo, isApprovalTask])

  return (
    <Card data-testid={`${dataTestId}-details-card`}>
      <CardHeader className="gba:pb-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground">Details</CardTitle>
          {hasSignableDocs && onOpenDocuSignModal && (
            <Button size="sm" onClick={onOpenDocuSignModal}>
              {docuSignButtonLabel}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="gba:space-y-1">
        <FieldRow icon={CheckCircleIcon} label="Status" testId={`${dataTestId}-status-field`}>
          {taskStatus ? (
            <Badge variant={getTaskStatusBadgeVariant(taskStatus.type as string)}>
              {getCatalogEntryValue(taskStatus as any)}
            </Badge>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )}
        </FieldRow>

        <FieldRow icon={FlagIcon} label="Priority" testId={`${dataTestId}-priority-field`}>
          {taskPriority ? (
            <Badge variant={getTaskPriorityBadgeVariant(taskPriority.type || '')}>
              {getCatalogEntryValue(taskPriority as any)}
            </Badge>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )}
        </FieldRow>

        <FieldRow icon={TagIcon} label="Type" testId={`${dataTestId}-type-field`}>
          {taskType ? (
            <Badge variant={getTaskTypeBadgeVariant(taskType.type || '')}>
              {getCatalogEntryValue(taskType as any)}
            </Badge>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">-</span>
          )}
        </FieldRow>

        <FieldRow icon={LinkIcon} label="Reference" testId={`${dataTestId}-reference-field`}>
          <ReferenceField
            reference={task.reference}
            buildReferenceUrl={buildReferenceUrl}
            dataTestId={dataTestId}
            onReferenceClick={handleReferenceClick}
            getReferenceTypeBadgeVariant={getReferenceTypeBadgeVariant}
          />
        </FieldRow>

        <FieldRow icon={UserIcon} label="Created By" testId={`${dataTestId}-created-by-field`}>
          {task.creatorEmployee ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="gba:max-w-[280px] gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:min-h-[24px] gba:min-w-0 gba:border-0 gba:bg-transparent gba:text-left"
                  onClick={() => {
                    if (task.creatorEmployee) {
                      const url = buildPlatformUrl('/platform/employee-record', {
                        employeeId: task.creatorEmployee.id
                      })
                      navigateTo(url)
                    }
                  }}
                  data-testid={`${dataTestId}-creator-link`}
                >
                  <Avatar size="sm" className="gba:size-6 gba:shrink-0">
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
                  <span className="gba:flex-1 gba:min-w-0 gba:text-sm gba:font-medium gba:truncate">
                    {task.creatorEmployee.displayName ||
                      `${task.creatorEmployee.firstName || ''} ${task.creatorEmployee.lastName || ''}`.trim() ||
                      'Unknown'}
                  </span>
                  <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View employee profile</TooltipContent>
            </Tooltip>
          ) : (
            <span className="gba:text-sm gba:text-muted-foreground">Unknown</span>
          )}
        </FieldRow>

        {/* Assigned To field - only for non-approval tasks */}
        {!isApprovalTask && assignedEmployee && (
          <FieldRow icon={UserCircleIcon} label="Assigned To" testId={`${dataTestId}-assigned-to-field`}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="gba:max-w-[280px] gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:min-h-[24px] gba:min-w-0 gba:border-0 gba:bg-transparent gba:text-left"
                  onClick={() => {
                    if (assignedEmployee) {
                      const url = buildPlatformUrl('/platform/employee-record', {
                        employeeId: assignedEmployee.id
                      })
                      navigateTo(url)
                    }
                  }}
                  data-testid={`${dataTestId}-assignee-link`}
                >
                  <Avatar size="sm" className="gba:size-6 gba:shrink-0">
                    {assignedEmployee.pictureThumbnail && (
                      <AvatarImage
                        src={`data:image/gif;base64,${assignedEmployee.pictureThumbnail}`}
                        alt={
                          assignedEmployee.displayName || `${assignedEmployee.firstName} ${assignedEmployee.lastName}`
                        }
                      />
                    )}
                    <AvatarFallback className="gba:text-xs">
                      {getInitials(assignedEmployee.firstName || '', assignedEmployee.lastName || '')}
                    </AvatarFallback>
                  </Avatar>
                  <span className="gba:flex-1 gba:min-w-0 gba:text-sm gba:font-medium gba:truncate">
                    {assignedEmployee.displayName ||
                      `${assignedEmployee.firstName || ''} ${assignedEmployee.lastName || ''}`.trim() ||
                      'Unassigned'}
                  </span>
                  <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
                </button>
              </TooltipTrigger>
              <TooltipContent>View employee profile</TooltipContent>
            </Tooltip>
          </FieldRow>
        )}

        <Separator className="gba:my-4" />

        {task.timingType?.toUpperCase() === 'SCHEDULED' ? (
          <FieldRow icon={CalendarPlusIcon} label="Scheduled" testId={`${dataTestId}-schedule-date-field`}>
            <div className="gba:flex gba:items-center">
              <span className="gba:text-sm gba:text-foreground">
                {formatDate(task.scheduleDate || task.dueDate || '')}
              </span>
            </div>
          </FieldRow>
        ) : (
          <FieldRow icon={CalendarIcon} label="Due Date" testId={`${dataTestId}-due-date-field`}>
            <div className="gba:flex gba:items-center">
              <span className="gba:text-sm gba:text-foreground">{formatDate(task.dueDate || '')}</span>
            </div>
          </FieldRow>
        )}

        <Separator className="gba:my-4" />

        <FieldRow icon={ClockCounterClockwiseIcon} label="Created" testId={`${dataTestId}-created-field`}>
          <div className="gba:flex gba:items-center">
            <span className="gba:text-sm gba:text-muted-foreground">{formatDateTime(task.createdAt || '')}</span>
          </div>
        </FieldRow>

        {task.description && (
          <FieldRow
            icon={TextAlignLeftIcon}
            label="Description"
            testId={`${dataTestId}-description-field`}
            align="start"
          >
            <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{task.description}</p>
          </FieldRow>
        )}
      </CardContent>
    </Card>
  )
}
