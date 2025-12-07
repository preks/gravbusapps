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
import { Button, cn, useTranslation } from '@newwork/nw-design-system'
import { LucideIcon, Send, XCircle, CheckCircle, ThumbsUp } from 'lucide-react'
import { UnifiedTask } from '../types'
import translations from '../_i18n'

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
  const { t } = useTranslation(translations)

  // Auto-generate actions from task.availableActions if task is provided
  // Returns { left: TaskAction[], right: TaskAction[] } for proper positioning
  const { leftActions, rightActions } = useMemo(() => {
    // If manual actions provided, put them all on the right
    if (actions) {
      return { leftActions: [], rightActions: actions }
    }

    // If no task or availableActions, return empty
    if (!task?.availableActions || !onTaskAction) {
      return { leftActions: [], rightActions: [] }
    }

    const left: TaskAction[] = []
    const right: TaskAction[] = []

    // canReject - Reject task (approval tasks only) - goes on LEFT
    if (task.availableActions.canReject) {
      left.push({
        label: t('task-footer-reject'),
        onClick: () => onTaskAction('reject'),
        variant: 'destructive',
        icon: XCircle,
        loading: isLoading,
        testId: 'reject-task-button'
      })
    }

    // canComplete - Complete task (or Approve/Acknowledge based on task type) - goes on RIGHT
    // Priority: 1. Approval (has canReject) 2. Acknowledge (name contains "acknowledge") 3. Complete Task
    if (task.availableActions.canComplete) {
      const isApprovalTask = task.availableActions.canReject
      const taskName = (task.referenceTaskName || task.name || task.title || '').toLowerCase()
      const isAcknowledgeTask = !isApprovalTask && taskName.includes('acknowledge')

      // Determine label, icon, and styling based on task type
      let label: string
      let icon: LucideIcon
      let testId: string
      let buttonClassName: string | undefined

      if (isApprovalTask) {
        label = t('task-footer-approve')
        icon = ThumbsUp
        testId = 'approve-task-button'
        buttonClassName = 'gba:bg-success gba:text-success-foreground gba:hover:bg-success/90'
      } else if (isAcknowledgeTask) {
        label = t('task-footer-acknowledge')
        icon = CheckCircle
        testId = 'acknowledge-task-button'
        buttonClassName = 'gba:bg-success gba:text-success-foreground gba:hover:bg-success/90'
      } else {
        label = t('task-footer-complete')
        icon = Send
        testId = 'complete-task-button'
        buttonClassName = undefined // Default blue styling
      }

      right.push({
        label,
        onClick: () => onTaskAction('complete'),
        variant: 'default',
        icon,
        loading: isLoading,
        testId,
        className: buttonClassName
      })
    }

    return { leftActions: left, rightActions: right }
  }, [task, actions, onTaskAction, isLoading, t])

  // Combined actions for empty check
  const hasActions = leftActions.length > 0 || rightActions.length > 0

  // If no actions or children, don't render footer
  if (!hasActions && !children) {
    return null
  }

  // Helper to render action buttons
  const renderAction = (action: TaskAction) => {
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
        {hasActions ? (
          <>
            {/* Reject button first (left of Approve) */}
            {leftActions.map(renderAction)}
            {/* Approve/Acknowledge/Complete button last (rightmost) */}
            {rightActions.map(renderAction)}
          </>
        ) : (
          // Render custom children
          children
        )}
      </div>
    </div>
  )
}
