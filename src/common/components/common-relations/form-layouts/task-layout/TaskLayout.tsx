import React from 'react'
import { Skeleton } from '@newwork/nw-design-system'
import TaskSegment from '../../form-segments/task-segment/TaskSegment'
import type { TaskSegmentProps } from '../../form-segments/task-segment/TaskSegment'

export interface TaskLayoutProps
  extends Omit<TaskSegmentProps, 'titleLabel' | 'descriptionLabel' | 'deadlineLabel' | 'typeLabel' | 'priorityLabel'> {
  // Labels (required)
  titleLabel: string
  descriptionLabel: string
  deadlineLabel: string
  typeLabel: string
  priorityLabel: string
  statusLabel?: string
  assigneeLabel?: string
  timingTypeLabel?: string
  entityLabel?: string
  uploadFileLabel?: string

  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
}

const TaskLayout: React.FC<TaskLayoutProps> = ({
  titleLabel,
  descriptionLabel,
  deadlineLabel,
  typeLabel,
  priorityLabel,
  statusLabel,
  assigneeLabel,
  timingTypeLabel,
  entityLabel,
  uploadFileLabel,
  loading = false,
  ...segmentProps
}) => {
  // Show skeletons while loading
  if (loading) {
    return (
      <div data-testid="task-layout-loading" className="gba:space-y-4">
        <Skeleton className="gba:h-10 gba:w-full" />
        <Skeleton className="gba:h-10 gba:w-full" />
        <Skeleton className="gba:h-10 gba:w-full" />
        <Skeleton className="gba:h-32 gba:w-full" />
        <Skeleton className="gba:h-10 gba:w-full" />
      </div>
    )
  }

  return (
    <div data-testid="task-layout">
      <TaskSegment
        {...segmentProps}
        titleLabel={titleLabel}
        descriptionLabel={descriptionLabel}
        deadlineLabel={deadlineLabel}
        typeLabel={typeLabel}
        priorityLabel={priorityLabel}
        statusLabel={statusLabel}
        assigneeLabel={assigneeLabel}
        timingTypeLabel={timingTypeLabel}
        entityLabel={entityLabel}
        uploadFileLabel={uploadFileLabel}
      />
    </div>
  )
}

export default TaskLayout
