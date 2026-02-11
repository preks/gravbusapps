'use client'

import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Badge } from '@newwork/nw-design-system'
import {
  getTaskStatusBadgeVariant,
  getTaskStatusLabel
} from '@/common/components/common-relations/utils/taskStatusUtils'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'
import dayjs from 'dayjs'

export interface TaskInstanceCardProps {
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
}

/**
 * TaskInstanceCard - Displays a single task assignee instance with status
 * Used in TaskInstancesCard to show individual assignee progress
 */
export const TaskInstanceCard: React.FC<TaskInstanceCardProps> = ({
  taskAssignee,
  index,
  currentUserId,
  dataTestId
}) => {
  const employee = taskAssignee.assignedEmployee
  const isCurrentUser = currentUserId && taskAssignee.assignedUserId === currentUserId
  const statusLabel = getTaskStatusLabel(taskAssignee.taskStatus) || 'No Status'

  return (
    <div
      key={taskAssignee.id || index}
      className={`gba:py-4 gba:px-4 gba:rounded-lg gba:border ${
        isCurrentUser ? 'gba:border-primary gba:bg-accent/5' : 'gba:bg-muted/30'
      }`}
      data-testid={`${dataTestId}-instance-${index}`}
    >
      <div className="gba:flex gba:items-center gba:gap-3">
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
            <span className="gba:text-sm gba:font-medium gba:truncate">
              {employee?.displayName || 'Unknown Assignee'}
            </span>
            {isCurrentUser && (
              <Badge variant="outline" size="sm" className="gba:shrink-0">
                You
              </Badge>
            )}
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
    </div>
  )
}
