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
  CardTitle
} from '@newwork/nw-design-system'
import { UserIcon } from '@phosphor-icons/react'
import { Task } from '../types'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'
import { TaskInstanceCard } from './TaskInstanceCard'
import {
  computeTaskStatus,
  formatTaskProgress,
  getTaskStatusLabel
} from '@/common/components/common-relations/utils/taskStatusUtils'
import { getTaskStatusBadgeVariant } from '../utils'

export interface TaskInstancesCardProps {
  task: Task
  taskType?: CatalogEntry
  currentUserId?: string
  dataTestId?: string
}

/**
 * TaskInstancesCard - Displays task assignee instances with individual statuses
 *
 * CRITICAL: This component only renders for tasks with type 'APPROVAL'
 * For non-approval tasks, it returns null and does not display.
 */
export const TaskInstancesCard: React.FC<TaskInstancesCardProps> = ({
  task,
  taskType,
  currentUserId,
  dataTestId = 'TaskDetailSheet'
}) => {
  // CRITICAL: Only show this section for APPROVAL task types
  if (taskType?.type !== 'APPROVAL') {
    return null
  }

  // Check if task has assignees
  const hasTaskAssignees = task.taskAssignees && task.taskAssignees.length > 0
  const hasAssignedTo = task.assignedTo && (Array.isArray(task.assignedTo) ? task.assignedTo.length > 0 : true)

  if (!hasTaskAssignees && !hasAssignedTo) {
    return null
  }

  return (
    <Card data-testid={`${dataTestId}-instances-card`}>
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
              <Badge variant={getTaskStatusBadgeVariant(computeTaskStatus(task.taskAssignees as any).overallStatus)}>
                {getTaskStatusLabel(computeTaskStatus(task.taskAssignees as any).overallStatus)}
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
                dataTestId={dataTestId}
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
  )
}
