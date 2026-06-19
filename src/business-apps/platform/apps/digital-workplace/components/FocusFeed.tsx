import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsBadge
} from '@newwork/nw-design-system'
import { RobotIcon, BellIcon, CheckIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { navigateTo, buildPlatformUrl, Navigation } from '@/common/utils/navigationUtils'
import { useWorkforceLiveActivity } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/useWorkforceLiveActivity'
import {
  runStatusVisual,
  statusVisualForRun,
  shortenInput
} from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/runDisplay'
import type { WorkforceActiveRun } from '@/business-apps/core/every-fabric/apps/every-fabric/components/enterprise-workforce/workforceTypes'
import { useInboxTasks } from '@/business-apps/core/every/apps/every-box/hooks/useInboxTasks'
import {
  useEmployeeAvatarsBatch,
  type EmployeeAvatarData
} from '@/business-apps/core/every/apps/every-box/hooks/useEmployeeAvatarsBatch'
import { base64ToDataURL } from '@/business-apps/core/every/apps/every-box/utils/avatarUtils'
import type { UnifiedTask } from '@/business-apps/core/every/apps/every-api/types'
import { useWorkplaceTranslation } from '../_i18n/useWorkplaceTranslation'
import WorkplacePanel from './WorkplacePanel'
import { FocusRow } from './FocusRow'
import { WorkforceHitlDialog } from './WorkforceHitlDialog'
import { EveryBoxTaskDialog } from './EveryBoxTaskDialog'
import { ViewAllButton } from './ViewAllButton'
import WorkplaceReminders, { type WorkplaceRemindersProps } from './WorkplaceReminders'
import { resolveTaskTitle, getTaskCreatorId } from '../utils/taskTitle'
import { relativeFromNow, initialsFromName, isPast } from '../utils/timeFormat'
import type { Reminder } from '../hooks/useReminders'
import type { WorkplaceMetricKey } from '../types'

const TEST_ID = 'digital-workplace-focus'
const DUE_SOON_HOURS = 24

type FocusFilter = 'all' | 'agents' | 'tasks' | 'reminders'
type DueSeverity = 'overdue' | 'dueSoon'

export interface FocusFeedProps {
  context: BusinessAppContextProps
  onMetric: (key: WorkplaceMetricKey, value: number) => void
  className?: string
  reminders: WorkplaceRemindersProps
}

function reminderSeverity(reminder: Reminder): DueSeverity | null {
  if (!reminder.reminderDateTime) return null
  if (isPast(reminder.reminderDateTime)) return 'overdue'
  const diffMs = new Date(reminder.reminderDateTime).getTime() - Date.now()
  return diffMs <= DUE_SOON_HOURS * 60 * 60 * 1000 ? 'dueSoon' : null
}

function resolveSenderName(employee: EmployeeAvatarData | undefined, task: UnifiedTask, fallback: string): string {
  if (employee?.displayName) return employee.displayName
  if (employee?.firstName || employee?.lastName) {
    return `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim()
  }
  const meta = task.sourceMetadata
  return meta?.creatorName || meta?.ownerName || meta?.flowInitiatedByName || fallback
}

function runRecencyMs(run: WorkforceActiveRun): number {
  const stamp = run.updated_at || run.started_at
  const ms = stamp ? new Date(stamp).getTime() : NaN
  return Number.isNaN(ms) ? 0 : ms
}

function openRun(run: WorkforceActiveRun): void {
  if (!run.agent_id) {
    navigateTo(buildPlatformUrl(Navigation.EVERY_FABRIC, { view: 'enterprise-workforce' }))
    return
  }
  navigateTo(
    buildPlatformUrl(Navigation.EVERY_FABRIC, {
      view: 'enterprise-workforce',
      agentId: run.agent_id,
      tab: 'runs',
      runId: run.session_id
    })
  )
}

/**
 * Unified focus feed. "All" answers what needs the user now (agents waiting,
 * overdue / due-soon tasks and due reminders); the Agents / EveryBox / Reminders
 * segments give quick access to the full list for each source. Reminders can be
 * created right from the Reminders segment.
 */
const FocusFeed: React.FC<FocusFeedProps> = ({ context, onMetric, className, reminders }) => {
  const { t } = useWorkplaceTranslation()
  const { reminders: reminderItems, completeReminder } = reminders
  const [filter, setFilter] = useState<FocusFilter>('all')
  const { overview, totalWorking } = useWorkforceLiveActivity(context.accessToken)
  const {
    tasks,
    totalCount,
    isLoading: tasksLoading,
    refetch
  } = useInboxTasks(context, {
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })

  const [activeRun, setActiveRun] = useState<WorkforceActiveRun | null>(null)
  const [activeTask, setActiveTask] = useState<UnifiedTask | null>(null)

  const runs = useMemo(() => overview?.runs ?? [], [overview])
  // Completed runs whose triggered flow is paused on a human approval. The
  // backend surfaces them separately; they still need the user, so they share
  // the "waiting" lane with deep-agent HITL runs.
  const flowPending = useMemo(() => overview?.flow_pending ?? [], [overview])
  const waitingAgents = useMemo(() => {
    const seen = new Set<string>()
    const out: WorkforceActiveRun[] = []
    for (const run of [...runs.filter(run => run.status === 'waiting_for_human'), ...flowPending]) {
      if (seen.has(run.session_id)) continue
      seen.add(run.session_id)
      out.push(run)
    }
    // Newest first so the latest item needing the user leads, regardless of
    // whether it is a deep-agent HITL run or a flow awaiting approval.
    return out.sort((a, b) => runRecencyMs(b) - runRecencyMs(a))
  }, [runs, flowPending])
  const sortedAgents = useMemo(() => {
    const seen = new Set<string>()
    const out: WorkforceActiveRun[] = []
    for (const run of [...waitingAgents, ...runs]) {
      if (seen.has(run.session_id)) continue
      seen.add(run.session_id)
      out.push(run)
    }
    return out
  }, [runs, waitingAgents])
  const overdueTasks = useMemo(() => tasks.filter(task => task.dueMeta?.status === 'overdue'), [tasks])
  const dueSoonTasks = useMemo(() => tasks.filter(task => task.dueMeta?.status === 'dueSoon24h'), [tasks])
  const otherTasks = useMemo(
    () => tasks.filter(task => task.dueMeta?.status !== 'overdue' && task.dueMeta?.status !== 'dueSoon24h'),
    [tasks]
  )
  const overdueReminders = useMemo(() => reminderItems.filter(r => reminderSeverity(r) === 'overdue'), [reminderItems])
  const dueSoonReminders = useMemo(() => reminderItems.filter(r => reminderSeverity(r) === 'dueSoon'), [reminderItems])

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

  useEffect(() => onMetric('agentsWaiting', waitingAgents.length), [waitingAgents.length, onMetric])
  useEffect(() => onMetric('agentsWorking', totalWorking), [totalWorking, onMetric])
  useEffect(() => {
    if (!tasksLoading) onMetric('tasksDue', totalCount)
  }, [tasksLoading, totalCount, onMetric])

  const handleTaskCompleted = useCallback(() => {
    setActiveTask(null)
    void refetch()
  }, [refetch])

  const handleAgentSelect = useCallback((run: WorkforceActiveRun) => {
    if (run.status === 'waiting_for_human' || run.pending_flow_approval) setActiveRun(run)
    else openRun(run)
  }, [])

  const allCount =
    waitingAgents.length + overdueTasks.length + dueSoonTasks.length + overdueReminders.length + dueSoonReminders.length

  const renderAgentRow = (run: WorkforceActiveRun) => {
    const waiting = run.status === 'waiting_for_human'
    const awaitingApproval = Boolean(run.pending_flow_approval)
    const needsYou = waiting || awaitingApproval
    const badgeLabel = waiting
      ? t('focus-needs-you')
      : awaitingApproval
        ? statusVisualForRun(run).label
        : runStatusVisual(run.status).label
    return (
      <FocusRow
        key={`agent-${run.session_id}`}
        glyph={RobotIcon}
        title={run.display_name || run.agent_id}
        detail={
          needsYou
            ? run.pending_human_question || run.current_activity || t('agents-waiting-default')
            : run.current_activity || shortenInput(run.input, 80) || t('agents-no-activity')
        }
        badgeLabel={badgeLabel}
        badgeVariant={needsYou ? 'warning' : 'secondary'}
        onClick={() => handleAgentSelect(run)}
        testId={`${TEST_ID}-agent-${run.session_id}`}
      />
    )
  }

  const renderTaskRow = (task: UnifiedTask, severity?: DueSeverity) => {
    const creatorId = getTaskCreatorId(task)
    const employee = creatorId ? employeeMap.get(creatorId) : undefined
    const sender = resolveSenderName(employee, task, t('tasks-sender-unknown'))
    const createdAt = task.createdAt || task.scheduledAt || task.sourceMetadata?.createdAt
    const avatarUrl =
      employee?.avatarUrl || (employee?.pictureThumbnail ? base64ToDataURL(employee.pictureThumbnail) : undefined)
    return (
      <FocusRow
        key={`task-${task.id}`}
        leading={
          <Avatar className="gba:size-8 gba:shrink-0">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={sender} /> : null}
            <AvatarFallback className="gba:text-[10px] gba:font-medium">{initialsFromName(sender)}</AvatarFallback>
          </Avatar>
        }
        title={resolveTaskTitle(task, t('tasks-untitled'))}
        detail={createdAt ? `${sender} · ${relativeFromNow(createdAt)}` : sender}
        badgeLabel={
          severity === 'overdue' ? t('tasks-overdue') : severity === 'dueSoon' ? t('focus-due-soon') : undefined
        }
        badgeVariant={severity === 'overdue' ? 'destructive' : 'warning'}
        onClick={() => setActiveTask(task)}
        testId={`${TEST_ID}-task-${task.id}`}
      />
    )
  }

  const renderReminderRow = (reminder: Reminder) => {
    const severity = reminderSeverity(reminder)
    return (
      <FocusRow
        key={`reminder-${reminder.workflowId}`}
        glyph={BellIcon}
        title={reminder.title}
        detail={`${t('reminders-due')} ${relativeFromNow(reminder.reminderDateTime)}`}
        badgeLabel={
          severity === 'overdue' ? t('reminders-overdue') : severity === 'dueSoon' ? t('focus-due-soon') : undefined
        }
        badgeVariant={severity === 'overdue' ? 'destructive' : 'warning'}
        onClick={() => navigateTo(Navigation.PLATFORM_TASK_MANAGER)}
        testId={`${TEST_ID}-reminder-${reminder.workflowId}`}
        trailing={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => completeReminder(reminder.workflowId)}
            title={t('reminders-done')}
            aria-label={t('reminders-done')}
            className="gba:size-8 gba:shrink-0 gba:text-muted-foreground"
            data-testid={`${TEST_ID}-reminder-done-${reminder.workflowId}`}
          >
            <CheckIcon className="gba:size-4" />
          </Button>
        }
      />
    )
  }

  const renderRows = (): React.ReactNode => {
    if (filter === 'agents') return sortedAgents.map(renderAgentRow)
    if (filter === 'reminders') return <WorkplaceReminders {...reminders} />
    if (filter === 'tasks') {
      return (
        <>
          {overdueTasks.map(task => renderTaskRow(task, 'overdue'))}
          {dueSoonTasks.map(task => renderTaskRow(task, 'dueSoon'))}
          {otherTasks.map(task => renderTaskRow(task))}
          {totalCount > tasks.length ? (
            <ViewAllButton
              label={t('view-all')}
              onClick={() => navigateTo(Navigation.PLATFORM_TASK_MANAGER)}
              testId={`${TEST_ID}-tasks-view-all`}
            />
          ) : null}
        </>
      )
    }
    return (
      <>
        {waitingAgents.map(renderAgentRow)}
        {overdueTasks.map(task => renderTaskRow(task, 'overdue'))}
        {overdueReminders.map(renderReminderRow)}
        {dueSoonTasks.map(task => renderTaskRow(task, 'dueSoon'))}
        {dueSoonReminders.map(renderReminderRow)}
      </>
    )
  }

  const emptyByFilter: Record<FocusFilter, { title: string; desc: string }> = {
    all: { title: t('focus-empty-title'), desc: t('focus-empty-desc') },
    agents: { title: t('agents-empty-title'), desc: t('agents-empty-desc') },
    tasks: { title: t('tasks-empty-title'), desc: t('tasks-empty-desc') },
    reminders: { title: t('reminders-empty-title'), desc: t('reminders-empty-desc') }
  }

  const countByFilter: Record<FocusFilter, number> = {
    all: allCount,
    agents: sortedAgents.length,
    tasks: totalCount,
    reminders: reminderItems.length
  }

  const loading =
    (filter === 'tasks' && tasksLoading && tasks.length === 0) || (filter === 'all' && tasksLoading && allCount === 0)

  // The Reminders segment renders its own list/empty state plus the add form,
  // so it must never be replaced by the panel's empty state.
  const isEmpty = filter !== 'reminders' && !loading && countByFilter[filter] === 0

  return (
    <>
      <WorkplacePanel
        title={t('focus-title')}
        className={className}
        testId={TEST_ID}
        loading={loading}
        errorTitle={t('error-title')}
        isEmpty={isEmpty}
        emptyTitle={emptyByFilter[filter].title}
        emptyDescription={emptyByFilter[filter].desc}
        action={
          <Tabs value={filter} onValueChange={value => setFilter(value as FocusFilter)}>
            <TabsList data-testid={`${TEST_ID}-filters`}>
              <TabsTrigger
                value="all"
                endAdornment={<TabsBadge size="sm">{allCount}</TabsBadge>}
                data-testid={`${TEST_ID}-filter-all`}
              >
                {t('focus-filter-all')}
              </TabsTrigger>
              <TabsTrigger value="agents" data-testid={`${TEST_ID}-filter-agents`}>
                {t('focus-filter-agents')}
              </TabsTrigger>
              <TabsTrigger value="tasks" data-testid={`${TEST_ID}-filter-tasks`}>
                {t('focus-filter-tasks')}
              </TabsTrigger>
              <TabsTrigger value="reminders" data-testid={`${TEST_ID}-filter-reminders`}>
                {t('reminders-title')}
              </TabsTrigger>
            </TabsList>
          </Tabs>
        }
      >
        <div className="gba:flex gba:flex-col gba:gap-0.5">{renderRows()}</div>
      </WorkplacePanel>

      <WorkforceHitlDialog
        open={activeRun !== null}
        sessionId={activeRun?.session_id ?? null}
        agentId={activeRun?.agent_id ?? null}
        agentName={activeRun?.display_name || activeRun?.agent_id || ''}
        accessToken={context.accessToken}
        onClose={() => setActiveRun(null)}
      />

      <EveryBoxTaskDialog
        open={activeTask !== null}
        task={activeTask}
        context={context}
        onClose={() => setActiveTask(null)}
        onTaskCompleted={handleTaskCompleted}
        onTaskUpdated={() => void refetch()}
      />
    </>
  )
}

export default FocusFeed
export { FocusFeed }
