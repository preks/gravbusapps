import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Avatar, AvatarImage, AvatarFallback, Badge } from '@newwork/nw-design-system'
import { TrayIcon } from '@phosphor-icons/react'
import { navigateTo, Navigation } from '@/common/utils/navigationUtils'
import { useInboxTasks } from '@/business-apps/core/every/apps/every-box/hooks/useInboxTasks'
import {
  useEmployeeAvatarsBatch,
  type EmployeeAvatarData
} from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatarsBatch'
import { base64ToDataURL } from '@/business-apps/core/every/apps/every-box/utils/avatarUtils'
import type { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import WorkplacePanel from './WorkplacePanel'
import { EveryBoxTaskDialog } from './EveryBoxTaskDialog'
import { relativeFromNow, initialsFromName } from '../utils/timeFormat'
import { resolveTaskTitle, getTaskCreatorId } from '../utils/taskTitle'
import type { WorkplacePanelBaseProps } from '../types'

const TEST_ID = 'digital-workplace-tasks'

function resolveSenderName(employee: EmployeeAvatarData | undefined, task: UnifiedTask, fallback: string): string {
  if (employee?.displayName) return employee.displayName
  if (employee?.firstName || employee?.lastName) {
    return `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
  }
  const meta = task.sourceMetadata
  return meta?.creatorName || meta?.ownerName || meta?.flowInitiatedByName || fallback
}

interface TaskRowProps {
  task: UnifiedTask
  employee: EmployeeAvatarData | undefined
  overdueLabel: string
  dueSoonLabel: string
  fallbackTitle: string
  unknownSender: string
  onSelect: (task: UnifiedTask) => void
}

const TaskRow: React.FC<TaskRowProps> = ({
  task,
  employee,
  overdueLabel,
  dueSoonLabel,
  fallbackTitle,
  unknownSender,
  onSelect
}) => {
  const title = resolveTaskTitle(task, fallbackTitle)
  const sender = resolveSenderName(employee, task, unknownSender)
  const dueStatus = task.dueMeta?.status
  const createdAt = task.createdAt || task.scheduledAt || task.sourceMetadata?.createdAt
  const avatarUrl =
    employee?.avatarUrl || (employee?.pictureThumbnail ? base64ToDataURL(employee.pictureThumbnail) : undefined)

  return (
    <button
      type="button"
      onClick={() => onSelect(task)}
      className="gba:flex gba:w-full gba:items-start gba:gap-3 gba:rounded-lg gba:border gba:border-border gba:p-3 gba:text-left gba:transition-colors gba:hover:bg-accent"
      data-testid={`${TEST_ID}-task-${task.id}`}
    >
      <Avatar className="gba:size-8 gba:shrink-0">
        {avatarUrl ? <AvatarImage src={avatarUrl} alt={sender} /> : null}
        <AvatarFallback className="gba:text-[10px] gba:font-medium">{initialsFromName(sender)}</AvatarFallback>
      </Avatar>

      <div className="gba:min-w-0 gba:flex-1">
        <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
          <p className="gba:min-w-0 gba:flex-1 gba:truncate gba:text-sm gba:font-medium gba:text-foreground">{title}</p>
          {dueStatus === 'overdue' ? (
            <Badge variant="destructive" size="sm" className="gba:shrink-0">
              {overdueLabel}
            </Badge>
          ) : dueStatus === 'dueSoon24h' ? (
            <Badge variant="warning" size="sm" className="gba:shrink-0">
              {dueSoonLabel}
            </Badge>
          ) : null}
        </div>
        <div className="gba:mt-0.5 gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:text-muted-foreground">
          <span className="gba:truncate">{sender}</span>
          {createdAt ? (
            <>
              <span aria-hidden>·</span>
              <span className="gba:shrink-0 gba:whitespace-nowrap">{relativeFromNow(createdAt)}</span>
            </>
          ) : null}
        </div>
      </div>
    </button>
  )
}

/** EveryBox inbox preview with friendly names, sender avatars and due badges. */
const TasksPanel: React.FC<WorkplacePanelBaseProps> = ({ context, onMetric, className }) => {
  const { t } = useWorkplaceTranslation()
  const { tasks, totalCount, isLoading, error, refetch } = useInboxTasks(context, {
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null)

  useEffect(() => {
    if (!isLoading) onMetric('tasksDue', totalCount)
  }, [isLoading, totalCount, onMetric])

  const handleTaskCompleted = useCallback(() => {
    setActiveTask(null)
    void refetch()
  }, [refetch])

  const handleTaskUpdated = useCallback(() => {
    void refetch()
  }, [refetch])

  const { userIds, employeeIds } = useMemo(() => {
    const uIds: string[] = []
    const eIds: string[] = []
    tasks.forEach(task => {
      if (task.sourceMetadata?.creatorUserId) uIds.push(task.sourceMetadata.creatorUserId)
      if (task.sourceMetadata?.creatorEmployeeId) eIds.push(task.sourceMetadata.creatorEmployeeId)
    })
    return { userIds: [...new Set(uIds)], employeeIds: [...new Set(eIds)] }
  }, [tasks])

  const { employeeMap } = useEmployeeAvatarsBatch(context.accessToken || '', userIds, employeeIds)

  return (
    <>
      <WorkplacePanel
        title={t('tasks-title')}
        icon={TrayIcon}
        count={totalCount}
        onTitleClick={() => navigateTo(Navigation.PLATFORM_TASK_MANAGER)}
        titleActionLabel={t('tasks-open')}
        className={className}
        testId={TEST_ID}
        loading={isLoading && tasks.length === 0}
        error={error}
        errorTitle={t('error-title')}
        isEmpty={!isLoading && tasks.length === 0}
        emptyTitle={t('tasks-empty-title')}
        emptyDescription={t('tasks-empty-desc')}
      >
        <div className="gba:flex gba:flex-col gba:gap-2">
          {tasks.map(task => {
            const creatorId = getTaskCreatorId(task)
            return (
              <TaskRow
                key={task.id}
                task={task}
                employee={creatorId ? employeeMap.get(creatorId) : undefined}
                overdueLabel={t('tasks-overdue')}
                dueSoonLabel={t('tasks-due-soon')}
                fallbackTitle={t('tasks-untitled')}
                unknownSender={t('tasks-sender-unknown')}
                onSelect={setActiveTask}
              />
            )
          })}
        </div>
      </WorkplacePanel>

      <EveryBoxTaskDialog
        open={activeTask !== null}
        task={activeTask}
        context={context}
        onClose={() => setActiveTask(null)}
        onTaskCompleted={handleTaskCompleted}
        onTaskUpdated={handleTaskUpdated}
      />
    </>
  )
}

export default TasksPanel
export { TasksPanel }
