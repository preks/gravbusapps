/**
 * TaskDetailDialog Component
 * Dialog wrapper for task details - uses TaskDetailContent internally
 */

import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { UnifiedTask } from '../types'
import { TaskDetailContent } from './TaskDetailContent'

interface TaskDetailDialogProps {
  task: UnifiedTask | null
  onClose: () => void
  onTaskUpdated: () => void
  onTaskCompleted?: (taskId: string) => void
  accessToken: string
  userId?: string
  userInfo?: any
}

export const TaskDetailDialog: React.FC<TaskDetailDialogProps> = ({
  task,
  onClose,
  onTaskUpdated,
  onTaskCompleted,
  accessToken,
  userId,
  userInfo
}) => {
  if (!task) {
    return null
  }

  return (
    <Card className="gba:h-full gba:flex gba:flex-col gba:shadow-lg nw:pt-6 nw:pb-0" data-testid="task-detail-dialog">
      <TaskDetailContent
        task={task}
        onClose={onClose}
        onTaskUpdated={onTaskUpdated}
        onTaskCompleted={onTaskCompleted}
        accessToken={accessToken}
        userId={userId}
        userInfo={userInfo}
        showActions={true}
      />
    </Card>
  )
}
