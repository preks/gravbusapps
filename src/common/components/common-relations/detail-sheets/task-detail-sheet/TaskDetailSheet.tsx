'use client'

import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { Task, TaskReference } from './types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { TaskDetailContent } from './TaskDetailContent'

export interface TaskDetailSheetProps {
  task: Task | null
  open: boolean
  onOpenChange: (open: boolean) => void
  buildReferenceUrl?: (reference: TaskReference) => string
  'data-testid'?: string
  accessToken?: string
  assignedUserId?: string
  currentUserId?: string
  businessAppContext?: BusinessAppContextProps
  flowContext?: FlowContextName
}

const DATA_TEST_ID_PREFIX = 'TaskDetailSheet'

/**
 * TaskDetailSheet - Main wrapper component for task detail side panel
 * Displays detailed task information in a slide-out Sheet component
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
  businessAppContext,
  flowContext
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
        <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left gba:mb-3">
            {task?.name || 'Task Details'}
          </SheetTitle>
          {accessToken && flowContext && task && (
            <div className="gba:flex gba:justify-end">
              <AppAction
                contexts={[{ context: flowContext, contextData: { taskId: task.id } }]}
                accessToken={accessToken}
                mode="button"
                buttonSize="sm"
                buttonVariant="outline"
                emptyState="enable"
                lazyLoad
                prefixDataTestId={`${dataTestId || DATA_TEST_ID_PREFIX}-actions`}
                data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-actions-button`}
              >
                <DotsThreeVerticalIcon size={16} className="gba:mr-2" />
                Actions
              </AppAction>
            </div>
          )}
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

export default TaskDetailSheet
