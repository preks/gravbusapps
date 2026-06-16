'use client'

import React from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { UserCircleIcon, ArrowSquareOutIcon } from '@phosphor-icons/react'
import { Task, TaskEmployee } from '../types'
import { getInitials, getTaskStatusBadgeVariant } from '../utils'
import { getTaskStatusLabel } from '@/common/components/common-relations/utils/taskStatusUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

export interface TaskAssigneesCardProps {
  task: Task
  dataTestId?: string
}

const getEmployeeName = (employee: TaskEmployee): string =>
  employee.displayName || `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Unassigned'

interface AssigneeRowProps {
  employee: TaskEmployee
  status?: string
  dataTestId: string
}

/**
 * AssigneeRow - Renders a single clickable assignee row linking to the employee profile,
 * showing the assignee's task status on the right.
 */
const AssigneeRow: React.FC<AssigneeRowProps> = ({ employee, status, dataTestId }) => {
  const name = getEmployeeName(employee)

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:hover:bg-accent gba:px-2 gba:py-1 gba:rounded gba:transition-colors gba:min-h-[24px] gba:min-w-0 gba:border-0 gba:bg-transparent gba:text-left"
          onClick={() => {
            const url = buildPlatformUrl('/platform/employee-record', { employeeId: employee.id })
            navigateTo(url)
          }}
          data-testid={`${dataTestId}-assignee-link-${employee.id}`}
        >
          <Avatar size="sm" className="gba:size-6 gba:shrink-0">
            {employee.pictureThumbnail && (
              <AvatarImage src={`data:image/gif;base64,${employee.pictureThumbnail}`} alt={name} />
            )}
            <AvatarFallback className="gba:text-xs">
              {getInitials(employee.firstName || '', employee.lastName || '')}
            </AvatarFallback>
          </Avatar>
          <span className="gba:min-w-0 gba:text-sm gba:font-medium gba:truncate">{name}</span>
          <ArrowSquareOutIcon size={12} className="gba:text-muted-foreground gba:shrink-0" />
          {status && (
            <Badge variant={getTaskStatusBadgeVariant(status)} size="sm" className="gba:ml-auto gba:shrink-0">
              {getTaskStatusLabel(status)}
            </Badge>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent>View employee profile</TooltipContent>
    </Tooltip>
  )
}

/**
 * TaskAssigneesCard - Lists every assignee with their individual task status.
 * Rendered below the DocuSign card in the task detail sheet.
 */
export const TaskAssigneesCard: React.FC<TaskAssigneesCardProps> = ({ task, dataTestId = 'TaskDetailSheet' }) => {
  const assignees = React.useMemo<Array<{ employee: TaskEmployee; status?: string }>>(() => {
    // Try taskAssignees first (from GraphQL) - these carry per-assignee status
    if (task.taskAssignees && task.taskAssignees.length > 0) {
      return task.taskAssignees
        .filter(assignee => Boolean(assignee.assignedEmployee))
        .map(assignee => ({ employee: assignee.assignedEmployee as TaskEmployee, status: assignee.taskStatus }))
    }

    // Fallback to assignedTo (from conversion) - no per-assignee status available
    if (task.assignedTo) {
      const employees = Array.isArray(task.assignedTo) ? task.assignedTo : [task.assignedTo]
      return employees.map(employee => ({ employee }))
    }

    return []
  }, [task.taskAssignees, task.assignedTo])

  if (assignees.length === 0) {
    return null
  }

  const label = assignees.length > 1 ? `Assigned To (${assignees.length})` : 'Assigned To'

  return (
    <Card data-testid={`${dataTestId}-assignees-card`}>
      <CardHeader className="gba:pb-3">
        <CardTitle className="gba:text-base gba:font-medium gba:text-muted-foreground gba:flex gba:items-center gba:gap-2">
          <UserCircleIcon size={18} />
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="gba:flex gba:flex-col gba:gap-1 gba:min-w-0 gba:w-full">
          {assignees.map(({ employee, status }) => (
            <AssigneeRow key={employee.id} employee={employee} status={status} dataTestId={dataTestId} />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
