'use client'

import React from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, Button } from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { Task, TaskReference } from './types'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { useTaskCompletion } from './hooks/useTaskCompletion'
import { TaskDetailContent } from './TaskDetailContent'
import type { CatalogEntry } from '@/common/network/graphql/commonTypes'

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
  onTaskCompleted?: () => void
  /** When true, DocuSign signing UI is shown (set by CRM/IRM parents from FeatureHub). */
  docuSignEnabled?: boolean
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
  flowContext,
  onTaskCompleted,
  docuSignEnabled = false
}) => {
  // Get businessKey from task (shared by all task instances)
  const businessKey = task?.businessKey

  // Get task-level status (from task.taskStatus catalog entry)
  const taskStatusType = (task as any)?.taskStatus?.type as string | undefined
  const isTaskCompleted = React.useMemo(() => {
    if (!taskStatusType) return false
    return taskStatusType.includes('COMPLETED') || taskStatusType.includes('APPROVED')
  }, [taskStatusType])

  // Check if task is an approval task (should only be completed in everybox)
  const taskType = (task as any)?.taskType as CatalogEntry
  const isApprovalTask = React.useMemo(() => {
    if (!taskType) return false
    return (
      taskType.type?.toUpperCase().includes('APPROVAL') ||
      taskType.code?.toUpperCase() === 'APPROVAL' ||
      taskType.value?.toUpperCase() === 'APPROVAL'
    )
  }, [taskType])

  // Use task completion hook
  const { isCompleting, completeTask, hasTask } = useTaskCompletion({
    businessKey,
    accessToken,
    userId: currentUserId,
    enabled: open && !!businessKey && !isTaskCompleted
  })

  // Handle task completion
  const handleCompleteTask = React.useCallback(async () => {
    const success = await completeTask()
    if (success) {
      onTaskCompleted?.()
      onOpenChange(false)
    }
  }, [completeTask, onTaskCompleted, onOpenChange])

  // Get button text based on task state
  const getCompleteButtonText = () => {
    if (isTaskCompleted) return 'Completed'
    if (isCompleting) return 'Completing...'
    return 'Complete Task'
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gba:!w-[500px] gba:sm:!w-[500px] gba:!max-w-[90vw] gba:p-0 gba:flex gba:flex-col">
        <SheetHeader className="gba:px-6 gba:py-6 gba:border-b gba:border-border gba:shrink-0">
          <SheetTitle className="gba:text-xl gba:font-semibold gba:text-left gba:mb-3">
            {task?.name || 'Task Details'}
          </SheetTitle>
          <div className="gba:flex gba:gap-2 gba:justify-end">
            {/* Existing AppAction button */}
            {accessToken && flowContext && task && (
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
            )}

            {/* Complete Task Button - Hide for approval tasks (must be completed in everybox) */}
            {(hasTask || isTaskCompleted) && assignedUserId === currentUserId && !isApprovalTask && (
              <Button
                size="sm"
                onClick={handleCompleteTask}
                disabled={isCompleting || isTaskCompleted}
                className={
                  isTaskCompleted
                    ? 'gba:bg-success gba:text-success-foreground'
                    : 'gba:bg-primary gba:text-primary-foreground gba:hover:bg-primary/90'
                }
                data-testid={`${dataTestId || DATA_TEST_ID_PREFIX}-complete-button`}
              >
                <CheckCircleIcon size={16} className="gba:mr-2" />
                {getCompleteButtonText()}
              </Button>
            )}
          </div>
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
              docuSignEnabled={docuSignEnabled}
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
