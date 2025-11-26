/**
 * TaskDetailFooter Component
 * Reusable footer component for task detail screens
 * Displays action buttons (approve, reject, etc.) in a sticky footer
 *
 * Actions can be provided either as:
 * 1. `task` prop - auto-generates actions from task.availableActions (cFlow integration)
 * 2. `actions` prop - array of action button configs (manual control)
 * 3. `children` prop - custom React nodes (for static actions or custom layouts)
 */

import React, { useMemo } from 'react'
import { Button, cn } from '@newwork/nw-design-system'
import { LucideIcon, Send, XCircle, UserCog, UserPlus, UserMinus } from 'lucide-react'
import { UnifiedTask } from '../types'

export interface TaskAction {
  label: string
  onClick: () => void | Promise<void>
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  disabled?: boolean
  loading?: boolean
  icon?: LucideIcon
  className?: string
  testId?: string
}

export interface TaskDetailFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  // Auto-generate actions from cFlow task (preferred for cFlow tasks)
  task?: UnifiedTask
  onTaskAction?: (action: string, data?: any) => Promise<void>

  // Manual action buttons/configs - recommended for non-cFlow tasks
  actions?: TaskAction[]

  // Custom content/buttons - for static actions or custom layouts
  children?: React.ReactNode

  // Custom className
  className?: string

  // Loading state for task actions
  isLoading?: boolean
}

export const TaskDetailFooter: React.FC<TaskDetailFooterProps> = ({
  task,
  onTaskAction,
  actions,
  children,
  className,
  isLoading = false,
  ...props
}) => {
  // Auto-generate actions from task.availableActions if task is provided
  const generatedActions = useMemo(() => {
    // If manual actions provided, use those
    if (actions) {
      return actions
    }

    // If no task or availableActions, return empty
    if (!task?.availableActions || !onTaskAction) {
      return []
    }

    const taskActions: TaskAction[] = []

    // canClaim - Claim claimable task
    if (task.availableActions.canClaim) {
      taskActions.push({
        label: 'Claim Task',
        onClick: () => onTaskAction('claim'),
        variant: 'default',
        icon: UserPlus,
        loading: isLoading,
        testId: 'claim-task-button'
      })
    }

    // canComplete - Complete task
    if (task.availableActions.canComplete) {
      taskActions.push({
        label: 'Complete Task',
        onClick: () => onTaskAction('complete'),
        variant: 'default',
        icon: Send,
        loading: isLoading,
        testId: 'complete-task-button'
      })
    }

    // canReject - Reject task (approval tasks only)
    if (task.availableActions.canReject) {
      taskActions.push({
        label: 'Reject',
        onClick: () => onTaskAction('reject'),
        variant: 'destructive',
        icon: XCircle,
        loading: isLoading,
        testId: 'reject-task-button'
      })
    }

    // canReassign - Reassign task to another user
    if (task.availableActions.canReassign) {
      taskActions.push({
        label: 'Reassign',
        onClick: () => onTaskAction('reassign'),
        variant: 'outline',
        icon: UserCog,
        loading: isLoading,
        testId: 'reassign-task-button'
      })
    }

    // canUnclaim - Return task to pool
    if (task.availableActions.canUnclaim) {
      taskActions.push({
        label: 'Unclaim',
        onClick: () => onTaskAction('unclaim'),
        variant: 'outline',
        icon: UserMinus,
        loading: isLoading,
        testId: 'unclaim-task-button'
      })
    }

    return taskActions
  }, [task, actions, onTaskAction, isLoading])

  // If no actions or children, don't render footer
  if ((!generatedActions || generatedActions.length === 0) && !children) {
    return null
  }

  return (
    <div
      className={cn(
        'gba:sticky gba:bottom-0 gba:z-40 gba:bg-card/95 gba:backdrop-blur-sm gba:border-t gba:shadow-sm gba:py-0 gba:-mx-6 gba:w-[calc(100%+3rem)]',
        className
      )}
      {...props}
    >
      <div className="gba:px-6 gba:py-4 gba:flex gba:items-center gba:justify-end gba:gap-2">
        {generatedActions && generatedActions.length > 0
          ? // Render generated or manual actions
            generatedActions.map(action => {
              const Icon = action.icon
              return (
                <Button
                  key={action.testId || action.label}
                  variant={action.variant || 'default'}
                  onClick={action.onClick}
                  disabled={action.disabled || action.loading}
                  className={cn('gba:flex gba:items-center gba:gap-2', action.className)}
                  data-testid={action.testId}
                >
                  {Icon && <Icon className="gba:h-4 gba:w-4" />}
                  {action.loading ? `${action.label}...` : action.label}
                </Button>
              )
            })
          : // Render custom children
            children}
      </div>
    </div>
  )
}
