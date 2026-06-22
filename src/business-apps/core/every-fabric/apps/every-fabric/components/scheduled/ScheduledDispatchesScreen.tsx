import { Button, useTranslation } from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  ArrowSquareOutIcon,
  ArrowsClockwiseIcon,
  CalendarCheckIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  ClockIcon,
  MinusCircleIcon,
  PencilSimpleIcon,
  PlayIcon,
  SpinnerGapIcon,
  TrashIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import type { DispatchStatus, ScheduledDispatch } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { usePromptManagerClient } from '@/common/network/ai/prompt-manager/usePromptManagerClient'
import translations from '../../_i18n'
import { useScheduledDispatches } from '../../hooks/useScheduledDispatches'
import { useScheduledTaskTemplates } from '../../hooks/useScheduledTaskTemplates'
import { useEmployeeSummaries, type EmployeeSummary } from '../../hooks/useEmployeeSummary'
import { AssigneeChip } from './AssigneeChip'
import { DispatchError } from './DispatchError'
import { ScheduledTaskTemplates, type ScheduledTaskDraft } from './ScheduledTaskTemplates'

interface ScheduledDispatchesScreenProps {
  accessToken: string
  onBack: () => void
  /** Open an agent session (e.g. a scheduled run's result) in the workspace. */
  onOpenSession?: (sessionId: string) => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_TABS: { labelKey: string; value: DispatchStatus | 'all' }[] = [
  { labelKey: 'scheduled-tab-all', value: 'all' },
  { labelKey: 'scheduled-tab-pending', value: 'pending' },
  { labelKey: 'scheduled-tab-sent', value: 'fired' },
  { labelKey: 'scheduled-tab-failed', value: 'failed' },
  { labelKey: 'scheduled-tab-cancelled', value: 'cancelled' }
]

function formatScheduledAt(isoUtc: string): string {
  try {
    // Strings without a timezone suffix (e.g. "2026-04-23T12:15:00") are
    // treated as LOCAL time by the JS Date constructor, which causes a 2-hour
    // shift for UTC+2 users. Append 'Z' when there is no explicit offset.
    const normalized = isoUtc.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(isoUtc) ? isoUtc : `${isoUtc}Z`
    const date = new Date(normalized)
    // Format in the browser's local timezone so the user sees their own clock.
    return date.toLocaleString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZoneName: 'short'
    })
  } catch {
    return isoUtc
  }
}

interface StatusBadgeProps {
  status: DispatchStatus
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation(translations)
  const configs: Record<DispatchStatus, { labelKey: string; classes: string; Icon: React.FC<{ className?: string }> }> =
    {
      pending: {
        labelKey: 'scheduled-status-pending',
        classes: 'gba:bg-amber-100 gba:text-amber-800 dark:gba:bg-amber-900/30 dark:gba:text-amber-300',
        Icon: ClockIcon
      },
      firing: {
        labelKey: 'scheduled-status-firing',
        classes: 'gba:bg-blue-100 gba:text-blue-800 dark:gba:bg-blue-900/30 dark:gba:text-blue-300',
        Icon: SpinnerGapIcon
      },
      fired: {
        labelKey: 'scheduled-status-fired',
        classes: 'gba:bg-emerald-100 gba:text-emerald-800 dark:gba:bg-emerald-900/30 dark:gba:text-emerald-300',
        Icon: CheckCircleIcon
      },
      cancelled: {
        labelKey: 'scheduled-status-cancelled',
        classes: 'gba:bg-muted gba:text-muted-foreground',
        Icon: MinusCircleIcon
      },
      failed: {
        labelKey: 'scheduled-status-failed',
        classes: 'gba:bg-red-100 gba:text-red-800 dark:gba:bg-red-900/30 dark:gba:text-red-300',
        Icon: XCircleIcon
      }
    }

  const { labelKey, classes, Icon } = configs[status] ?? configs.pending

  return (
    <span
      className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-medium ${classes}`}
    >
      <Icon className={`gba:h-3 gba:w-3 ${status === 'firing' ? 'gba:animate-spin' : ''}`} />
      {t(labelKey)}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Dispatch row — expanded detail panel (extracted to reduce DispatchRow complexity)
// ---------------------------------------------------------------------------

interface DispatchRowDetailProps {
  dispatch: ScheduledDispatch
  isAgentSession: boolean
  assigneeCount: number
  assigneeUserIds: string[]
  workflowIds: string[]
  scheduledStr: string
  recurrenceLabel: string | null
  summaries: Map<string, EmployeeSummary>
  onOpenSession?: (sessionId: string) => void
}

const DispatchRowDetail: React.FC<DispatchRowDetailProps> = ({
  dispatch,
  isAgentSession,
  assigneeCount,
  assigneeUserIds,
  workflowIds,
  scheduledStr,
  recurrenceLabel,
  summaries,
  onOpenSession
}) => {
  const { t } = useTranslation(translations)

  return (
    <div className="gba:border-t gba:border-border/60 gba:px-4 gba:py-3 gba:bg-muted/20 gba:space-y-3">
      <div>
        <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
          {t('scheduled-detail-message')}
        </p>
        <p className="gba:text-[13px] gba:text-foreground gba:whitespace-pre-wrap gba:break-words">
          {dispatch.agentTask || dispatch.message}
        </p>
      </div>

      {!isAgentSession && (
        <div>
          <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
            {t('scheduled-detail-assignees', { count: assigneeCount })}
          </p>
          <div className="gba:flex gba:flex-col gba:gap-1.5">
            {assigneeUserIds.map(uid => (
              <AssigneeChip key={uid} userId={uid} summary={summaries.get(uid)} />
            ))}
          </div>
        </div>
      )}

      {dispatch.createdSessionId && (
        <div>
          <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
            {t('scheduled-detail-result')}
          </p>
          {onOpenSession ? (
            <button
              type="button"
              onClick={() => onOpenSession(dispatch.createdSessionId as string)}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[12px] gba:font-medium gba:text-primary gba:hover:underline"
            >
              <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
              {t('scheduled-detail-open-session')}
            </button>
          ) : (
            <span className="gba:block gba:text-[12px] gba:text-foreground gba:font-mono">
              {dispatch.createdSessionId}
            </span>
          )}
        </div>
      )}

      {recurrenceLabel && (
        <div>
          <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
            {t('scheduled-detail-recurrence')}
          </p>
          <p className="gba:text-[12px] gba:text-foreground">
            {t('scheduled-detail-recurrence-next', { label: recurrenceLabel, when: scheduledStr })}
          </p>
        </div>
      )}

      {dispatch.runHistory && dispatch.runHistory.length > 0 && (
        <div>
          <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
            {t('scheduled-detail-run-history')}
          </p>
          <div className="gba:space-y-1">
            {dispatch.runHistory.slice(-5).map((run, idx) => (
              <div
                key={`${run.session_id ?? idx}-${run.triggered_at ?? idx}`}
                className="gba:flex gba:items-center gba:gap-2 gba:text-[12px] gba:text-foreground"
              >
                <span>
                  {run.triggered_at ? formatScheduledAt(run.triggered_at) : t('scheduled-detail-triggered')} ·{' '}
                  {run.status ?? 'started'}
                </span>
                {run.session_id && onOpenSession && (
                  <button
                    type="button"
                    onClick={() => onOpenSession(run.session_id as string)}
                    className="gba:inline-flex gba:items-center gba:gap-1 gba:text-primary gba:font-medium gba:hover:underline"
                  >
                    <ArrowSquareOutIcon className="gba:h-3 gba:w-3" />
                    {t('scheduled-detail-open')}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {workflowIds.length > 0 && (
        <div>
          <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
            {t('scheduled-detail-inbox')}
          </p>
          <p className="gba:flex gba:items-center gba:gap-1.5 gba:text-[12px] gba:text-foreground">
            <CheckCircleIcon className="gba:h-3.5 gba:w-3.5 gba:text-emerald-600" />
            {t('scheduled-detail-inbox-summary', {
              count: workflowIds.length,
              plural: assigneeCount === 1 ? "'s" : "s'"
            })}
          </p>
        </div>
      )}

      {dispatch.firedAt && (
        <p className="gba:text-[11px] gba:text-muted-foreground">
          {dispatch.status === 'failed' ? t('scheduled-detail-last-attempt') : t('scheduled-detail-sent-at')}{' '}
          {formatScheduledAt(dispatch.firedAt)}
        </p>
      )}

      {dispatch.error && <DispatchError error={dispatch.error} />}

      <p className="gba:text-[10px] gba:text-muted-foreground/60">
        {t('scheduled-detail-id', { id: dispatch.dispatchId })}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dispatch row with expandable detail
// ---------------------------------------------------------------------------

interface DispatchRowProps {
  dispatch: ScheduledDispatch
  onCancel: (id: string) => Promise<boolean>
  onUpdate: (
    id: string,
    body: { enabled?: boolean; scheduledAt?: string; recurrence?: Record<string, unknown> | null }
  ) => Promise<boolean>
  onRetry: (id: string) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
  onEdit: (dispatch: ScheduledDispatch) => void
  onRunNow: (id: string) => Promise<boolean>
  summaries: Map<string, EmployeeSummary>
  onOpenSession?: (sessionId: string) => void
}

const DispatchRow: React.FC<DispatchRowProps> = ({
  dispatch,
  onCancel,
  onUpdate,
  onRetry,
  onDelete,
  onEdit,
  onRunNow,
  summaries,
  onOpenSession
}) => {
  const { t } = useTranslation(translations)
  const [expanded, setExpanded] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [actioning, setActioning] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const isTerminal = dispatch.status === 'fired' || dispatch.status === 'cancelled' || dispatch.status === 'failed'

  const handleCancel = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setCancelling(true)
    await onCancel(dispatch.dispatchId)
    setCancelling(false)
  }

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDeleting(true)
    await onDelete(dispatch.dispatchId)
    setDeleting(false)
  }

  const scheduledStr = formatScheduledAt(dispatch.scheduledAt)
  const assigneeUserIds = dispatch.assigneeUserIds ?? []
  const workflowIds = dispatch.workflowIds ?? []
  const assigneeCount = assigneeUserIds.length
  const isAgentSession = dispatch.kind === 'agent_session'
  const isRecurring = Boolean(dispatch.recurrence)
  const recurrenceLabel = isRecurring
    ? `${String(dispatch.recurrence?.frequency ?? 'recurring')} every ${String(dispatch.recurrence?.interval ?? dispatch.recurrence?.interval_days ?? 1)}`
    : null

  const handleToggleEnabled = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActioning(true)
    await onUpdate(dispatch.dispatchId, { enabled: dispatch.status !== 'pending' })
    setActioning(false)
  }

  const handleRetry = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActioning(true)
    await onRetry(dispatch.dispatchId)
    setActioning(false)
  }

  const handleRunNow = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setActioning(true)
    await onRunNow(dispatch.dispatchId)
    setActioning(false)
  }

  return (
    <div className="gba:border gba:border-border/60 gba:rounded-xl gba:overflow-hidden">
      {/* Split clickable toggle and action area so we never nest <button> inside <button>. */}
      <div className="gba:w-full gba:flex gba:items-start gba:gap-3 gba:px-4 gba:py-3 gba:hover:bg-muted/40 gba:transition-colors">
        <button
          type="button"
          onClick={() => setExpanded(v => !v)}
          className="gba:flex-1 gba:min-w-0 gba:text-left gba:bg-transparent gba:border-0 gba:p-0 gba:cursor-pointer"
          aria-expanded={expanded}
        >
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <StatusBadge status={dispatch.status} />
            {isAgentSession && (
              <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-sky-100 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300">
                {t('scheduled-badge-agent-run')}
              </span>
            )}
            {isRecurring && (
              <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-violet-100 gba:px-2 gba:py-0.5 gba:text-[11px] gba:font-medium gba:text-violet-700 dark:gba:bg-violet-950/40 dark:gba:text-violet-300">
                {t('scheduled-badge-recurring')}
              </span>
            )}
            <span className="gba:text-[13px] gba:font-semibold gba:text-foreground gba:truncate">{dispatch.title}</span>
          </div>
          <p className="gba:mt-1 gba:text-[12px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
            <CalendarCheckIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0" />
            {scheduledStr}
          </p>
          <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">
            {isAgentSession
              ? t('scheduled-subtitle-agent-session')
              : t('scheduled-subtitle-assignees', { count: assigneeCount })}
          </p>
        </button>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          {dispatch.createdSessionId && onOpenSession && (
            <button
              type="button"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onOpenSession(dispatch.createdSessionId as string)
              }}
              className="gba:inline-flex gba:h-7 gba:items-center gba:gap-1 gba:rounded-md gba:px-2 gba:text-[11px] gba:font-medium gba:text-primary gba:hover:bg-primary/10"
              data-testid="scheduled-open-result"
            >
              <ArrowSquareOutIcon className="gba:h-3.5 gba:w-3.5" />
              {t('scheduled-open-result')}
            </button>
          )}
          {dispatch.status === 'pending' && (
            <button
              type="button"
              onClick={handleRunNow}
              disabled={actioning}
              className="gba:inline-flex gba:h-7 gba:items-center gba:gap-1 gba:rounded-md gba:px-2 gba:text-[11px] gba:font-medium gba:text-foreground gba:hover:bg-muted/60 gba:disabled:pointer-events-none gba:disabled:opacity-50"
              data-testid="scheduled-run-now"
            >
              {actioning ? (
                <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" />
              ) : (
                <PlayIcon className="gba:h-3.5 gba:w-3.5" />
              )}
              {t('scheduled-run-now')}
            </button>
          )}
          {dispatch.status === 'pending' && (
            <button
              type="button"
              onClick={e => {
                e.preventDefault()
                e.stopPropagation()
                onEdit(dispatch)
              }}
              aria-label={t('scheduled-edit-aria')}
              className="gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:hover:bg-muted/60 gba:hover:text-foreground"
              data-testid="scheduled-edit"
            >
              <PencilSimpleIcon className="gba:h-3.5 gba:w-3.5" />
            </button>
          )}
          {dispatch.status === 'pending' && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="gba:h-7 gba:px-2 gba:text-[11px] gba:text-destructive gba:hover:text-destructive gba:hover:bg-destructive/10"
            >
              {cancelling ? <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" /> : t('scheduled-cancel')}
            </button>
          )}
          {isRecurring && (
            <button
              type="button"
              className="gba:inline-flex gba:h-7 gba:items-center gba:justify-center gba:rounded-md gba:px-2 gba:text-[11px] gba:font-medium gba:text-foreground gba:hover:bg-muted/60 gba:disabled:pointer-events-none gba:disabled:opacity-50"
              onClick={handleToggleEnabled}
              disabled={actioning}
            >
              {actioning ? <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" /> : null}
              <span className={actioning ? 'gba:ml-1' : ''}>
                {dispatch.status === 'pending' ? t('scheduled-disable') : t('scheduled-enable')}
              </span>
            </button>
          )}
          {dispatch.status === 'failed' && (
            <button
              type="button"
              className="gba:inline-flex gba:h-7 gba:items-center gba:justify-center gba:rounded-md gba:px-2 gba:text-[11px] gba:font-medium gba:text-foreground gba:hover:bg-muted/60 gba:disabled:pointer-events-none gba:disabled:opacity-50"
              onClick={handleRetry}
              disabled={actioning}
            >
              {actioning ? <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" /> : null}
              <span className={actioning ? 'gba:ml-1' : ''}>{t('scheduled-retry')}</span>
            </button>
          )}
          {isTerminal &&
            (confirmDelete ? (
              <span className="gba:flex gba:items-center gba:gap-1">
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleting}
                  className="gba:inline-flex gba:h-7 gba:items-center gba:gap-1 gba:rounded-md gba:bg-destructive/10 gba:px-2 gba:text-[11px] gba:font-medium gba:text-destructive gba:hover:bg-destructive/20"
                  data-testid="scheduled-confirm-delete"
                >
                  {deleting ? <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" /> : t('scheduled-delete')}
                </button>
                <button
                  type="button"
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setConfirmDelete(false)
                  }}
                  className="gba:inline-flex gba:h-7 gba:items-center gba:rounded-md gba:px-2 gba:text-[11px] gba:text-muted-foreground gba:hover:bg-muted/60"
                >
                  {t('scheduled-keep')}
                </button>
              </span>
            ) : (
              <button
                type="button"
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setConfirmDelete(true)
                }}
                aria-label={t('scheduled-delete-aria')}
                className="gba:inline-flex gba:h-7 gba:w-7 gba:items-center gba:justify-center gba:rounded-md gba:text-muted-foreground gba:hover:bg-destructive/10 gba:hover:text-destructive"
                data-testid="scheduled-delete"
              >
                <TrashIcon className="gba:h-3.5 gba:w-3.5" />
              </button>
            ))}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? t('scheduled-collapse') : t('scheduled-expand')}
            className="gba:bg-transparent gba:border-0 gba:p-0 gba:cursor-pointer gba:flex gba:items-center"
          >
            {expanded ? (
              <CaretUpIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            ) : (
              <CaretDownIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
            )}
          </button>
        </div>
      </div>

      {expanded && (
        <DispatchRowDetail
          dispatch={dispatch}
          isAgentSession={isAgentSession}
          assigneeCount={assigneeCount}
          assigneeUserIds={assigneeUserIds}
          workflowIds={workflowIds}
          scheduledStr={scheduledStr}
          recurrenceLabel={recurrenceLabel}
          summaries={summaries}
          onOpenSession={onOpenSession}
        />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

const SkeletonRow: React.FC = () => (
  <div className="gba:border gba:border-border/60 gba:rounded-xl gba:px-4 gba:py-3 gba:animate-pulse">
    <div className="gba:flex gba:items-center gba:gap-2">
      <div className="gba:h-5 gba:w-16 gba:rounded-full gba:bg-muted" />
      <div className="gba:h-4 gba:w-40 gba:rounded gba:bg-muted" />
    </div>
    <div className="gba:mt-2 gba:h-3 gba:w-56 gba:rounded gba:bg-muted" />
    <div className="gba:mt-1.5 gba:h-3 gba:w-20 gba:rounded gba:bg-muted" />
  </div>
)

// ---------------------------------------------------------------------------
// Main screen
// ---------------------------------------------------------------------------

type TranslateFn = ReturnType<typeof useTranslation<typeof translations>>['t']

function getSubmitLabel(t: TranslateFn, creating: boolean, editingId: string | null, frequency: string): string {
  if (creating) return editingId ? t('scheduled-saving') : t('scheduled-creating')
  if (editingId) return t('scheduled-save-changes')
  return frequency === 'once' ? t('scheduled-create-once') : t('scheduled-create-recurring')
}

/** Convert an ISO UTC datetime to the local `YYYY-MM-DDTHH:mm` value a
 *  `datetime-local` input expects (it has no timezone and reads as local). */
const toDatetimeLocalValue = (iso: string): string => {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 16)
}

export const ScheduledDispatchesScreen: React.FC<ScheduledDispatchesScreenProps> = ({
  accessToken,
  onBack,
  onOpenSession
}) => {
  const { t } = useTranslation(translations)
  const {
    dispatches,
    isLoading,
    error,
    refresh,
    cancel,
    remove,
    update,
    retry,
    runNow,
    statusFilter,
    setStatusFilter
  } = useScheduledDispatches(accessToken)
  const {
    templates,
    isLoading: templatesLoading,
    create: createTemplate,
    remove: removeTemplate
  } = useScheduledTaskTemplates(accessToken)
  const client = usePromptManagerClient(accessToken)
  const [showCreate, setShowCreate] = useState(false)
  const [createDraft, setCreateDraft] = useState<ScheduledTaskDraft>({
    title: '',
    task: '',
    scheduledAt: '',
    frequency: 'weekly'
  })
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [savingTemplate, setSavingTemplate] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const applyTemplate = (draft: ScheduledTaskDraft) => {
    setEditingId(null)
    setCreateDraft(draft)
    setCreateError(null)
    setShowCreate(true)
  }

  const resetDraft = () => {
    setEditingId(null)
    setCreateDraft({ title: '', task: '', scheduledAt: '', frequency: 'weekly' })
    setCreateError(null)
  }

  const startEdit = (dispatch: ScheduledDispatch) => {
    setEditingId(dispatch.dispatchId)
    setCreateError(null)
    setCreateDraft({
      title: dispatch.title ?? '',
      task: dispatch.agentTask || dispatch.message || '',
      scheduledAt: toDatetimeLocalValue(dispatch.scheduledAt),
      frequency: (dispatch.recurrence?.frequency as ScheduledTaskDraft['frequency']) ?? 'once'
    })
    setShowCreate(true)
  }

  const saveEdit = async () => {
    if (!editingId) return
    const task = createDraft.task.trim()
    if (!task) {
      setCreateError(t('scheduled-err-task-required'))
      return
    }
    if (!createDraft.scheduledAt) {
      setCreateError(t('scheduled-err-datetime-required'))
      return
    }
    const scheduledAt = new Date(createDraft.scheduledAt)
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      setCreateError(t('scheduled-err-datetime-future'))
      return
    }
    const title = createDraft.title.trim() || task.slice(0, 80)
    setCreateError(null)
    setCreating(true)
    const ok = await update(editingId, {
      title,
      task,
      scheduledAt: scheduledAt.toISOString(),
      // null clears recurrence (one-time); object sets the repeat cadence.
      recurrence: createDraft.frequency === 'once' ? null : { frequency: createDraft.frequency, interval: 1 }
    })
    setCreating(false)
    if (ok) {
      setShowCreate(false)
      resetDraft()
    } else {
      setCreateError(t('scheduled-err-save-failed'))
    }
  }

  const saveDraftAsTemplate = async () => {
    if (!createDraft.task.trim()) {
      setCreateError(t('scheduled-err-template-task'))
      return
    }
    setSavingTemplate(true)
    const ok = await createTemplate({
      title: createDraft.title.trim() || createDraft.task.trim().slice(0, 80),
      task: createDraft.task.trim(),
      defaultFrequency: createDraft.frequency,
      defaultTime: createDraft.scheduledAt ? createDraft.scheduledAt.slice(11, 16) : '09:00'
    })
    setSavingTemplate(false)
    if (!ok) setCreateError(t('scheduled-err-template-save'))
  }

  // Collect all unique userIds across all visible dispatches for a single batch GraphQL call
  const allUserIds = useMemo(() => {
    const ids = new Set<string>()
    for (const d of dispatches) {
      for (const uid of d.assigneeUserIds ?? []) ids.add(uid)
    }
    return Array.from(ids)
  }, [dispatches])

  const { summaries } = useEmployeeSummaries(accessToken, allUserIds)

  const createRecurringSchedule = async () => {
    const task = createDraft.task.trim()
    if (!task) {
      setCreateError(t('scheduled-err-task-required'))
      return
    }
    if (!createDraft.scheduledAt) {
      setCreateError(t('scheduled-err-datetime-required'))
      return
    }
    const scheduledAt = new Date(createDraft.scheduledAt)
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      setCreateError(t('scheduled-err-datetime-future'))
      return
    }

    const title = createDraft.title.trim() || task.slice(0, 80)
    setCreateError(null)
    setCreating(true)
    try {
      await client.createScheduledAgentSession({
        title,
        task,
        scheduledAt: scheduledAt.toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        // 'once' → no recurrence (single future run); otherwise repeat on the cadence.
        recurrence: createDraft.frequency === 'once' ? undefined : { frequency: createDraft.frequency, interval: 1 }
      })
      setShowCreate(false)
      setCreateDraft({ title: '', task: '', scheduledAt: '', frequency: 'weekly' })
      refresh()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : t('scheduled-err-create-failed'))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="scheduled-dispatches-screen">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:border-b gba:border-border/60 gba:shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label={t('scheduled-back-aria')}
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
        </button>
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
          <CalendarCheckIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
          <h2 className="gba:text-[14px] gba:font-semibold gba:text-foreground gba:truncate">{t('scheduled-title')}</h2>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => {
            if (showCreate) {
              setShowCreate(false)
              resetDraft()
            } else {
              resetDraft()
              setShowCreate(true)
            }
          }}
        >
          {showCreate ? t('scheduled-close') : t('scheduled-new-task')}
        </Button>
        <button
          type="button"
          onClick={refresh}
          aria-label={t('scheduled-refresh-aria')}
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          disabled={isLoading}
        >
          <ArrowsClockwiseIcon className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
        </button>
      </div>

      {/* Create panel */}
      {showCreate && (
        <div className="gba:border-b gba:border-border/40 gba:p-4 gba:space-y-3 gba:bg-muted/15">
          {editingId ? (
            <div className="gba:flex gba:items-center gba:gap-2 gba:text-[12px] gba:font-medium gba:text-foreground">
              <PencilSimpleIcon className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
              {t('scheduled-editing')}
            </div>
          ) : (
            <ScheduledTaskTemplates
              templates={templates}
              isLoading={templatesLoading}
              onApply={applyTemplate}
              onDelete={removeTemplate}
            />
          )}
          <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-3">
            <input
              value={createDraft.title}
              onChange={e => setCreateDraft(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('scheduled-title-placeholder')}
              className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
            />
            <input
              type="datetime-local"
              value={createDraft.scheduledAt}
              onChange={e => setCreateDraft(prev => ({ ...prev, scheduledAt: e.target.value }))}
              className="gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
            />
          </div>
          <textarea
            value={createDraft.task}
            onChange={e => setCreateDraft(prev => ({ ...prev, task: e.target.value }))}
            placeholder={t('scheduled-task-placeholder')}
            className="gba:min-h-20 gba:w-full gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-3 gba:py-2 gba:text-sm"
          />
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
            <label className="gba:text-xs gba:text-muted-foreground">
              {t('scheduled-repeat')}
              <select
                value={createDraft.frequency}
                onChange={e =>
                  setCreateDraft(prev => ({ ...prev, frequency: e.target.value as ScheduledTaskDraft['frequency'] }))
                }
                className="gba:ml-2 gba:rounded-lg gba:border gba:border-border gba:bg-background gba:px-2 gba:py-1 gba:text-sm gba:text-foreground"
              >
                <option value="once">{t('scheduled-frequency-once')}</option>
                <option value="daily">{t('scheduled-frequency-daily')}</option>
                <option value="weekly">{t('scheduled-frequency-weekly')}</option>
                <option value="monthly">{t('scheduled-frequency-monthly')}</option>
              </select>
            </label>
            <div className="gba:flex gba:items-center gba:gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={savingTemplate || !createDraft.task.trim()}
                onClick={() => void saveDraftAsTemplate()}
                data-testid="scheduled-save-template-button"
              >
                {savingTemplate ? t('scheduled-saving-template') : t('scheduled-save-template')}
              </Button>
              <Button
                size="sm"
                disabled={creating || !createDraft.task.trim() || !createDraft.scheduledAt}
                onClick={() => void (editingId ? saveEdit() : createRecurringSchedule())}
                data-testid="scheduled-create-recurring-button"
              >
                {getSubmitLabel(t, creating, editingId, createDraft.frequency)}
              </Button>
            </div>
          </div>
          {createError && (
            <p className="gba:text-xs gba:text-destructive" role="alert">
              {createError}
            </p>
          )}
        </div>
      )}

      {/* Status filter tabs */}
      <div className="gba:flex gba:items-center gba:gap-1 gba:px-4 gba:py-2 gba:border-b gba:border-border/40 gba:shrink-0 gba:overflow-x-auto">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatusFilter(tab.value)}
            className={`gba:px-3 gba:py-1 gba:rounded-lg gba:text-[12px] gba:font-medium gba:whitespace-nowrap gba:transition-colors ${
              statusFilter === tab.value
                ? 'gba:bg-foreground gba:text-background'
                : 'gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60'
            }`}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="gba:flex-1 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain gba:px-4 gba:py-3 gba:space-y-2">
        {isLoading && dispatches.length === 0 && (
          <>
            <SkeletonRow />
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {error && !isLoading && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:gap-3 gba:text-center">
            <XCircleIcon className="gba:h-8 gba:w-8 gba:text-destructive/60" />
            <p className="gba:text-[13px] gba:text-destructive">{error}</p>
            <Button variant="secondary" size="sm" onClick={refresh}>
              {t('scheduled-try-again')}
            </Button>
          </div>
        )}

        {!isLoading && !error && dispatches.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:gap-3 gba:py-10 gba:text-center gba:text-muted-foreground">
            <CalendarCheckIcon className="gba:h-10 gba:w-10 gba:opacity-30" />
            <p className="gba:text-[13px] gba:font-medium">{t('scheduled-empty-title')}</p>
            <p className="gba:text-[12px] gba:max-w-[260px]">{t('scheduled-empty-desc')}</p>
            {!showCreate && (
              <div className="gba:mt-3 gba:w-full gba:max-w-2xl gba:text-left">
                <ScheduledTaskTemplates
                  templates={templates}
                  isLoading={templatesLoading}
                  onApply={applyTemplate}
                  onDelete={removeTemplate}
                />
              </div>
            )}
          </div>
        )}

        {dispatches.map(d => (
          <DispatchRow
            key={d.dispatchId}
            dispatch={d}
            onCancel={cancel}
            onUpdate={update}
            onRetry={retry}
            onDelete={remove}
            onEdit={startEdit}
            onRunNow={runNow}
            summaries={summaries}
            onOpenSession={onOpenSession}
          />
        ))}
      </div>
    </div>
  )
}
