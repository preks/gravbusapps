import React from 'react'
import { Skeleton } from '@newwork/nw-design-system'
import TaskSegment from '../../form-segments/task-segment/TaskSegment'
import type { TaskSegmentProps } from '../../form-segments/task-segment/TaskSegment'

export interface TaskLayoutProps extends TaskSegmentProps {
  // Loading state - shows skeletons while data is being fetched
  loading?: boolean
}

const TaskLayout: React.FC<TaskLayoutProps> = ({ loading = false, ...segmentProps }) => {
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

  return <TaskSegment data-testid="task-layout" {...segmentProps} />
}

export default TaskLayout
