import { Button } from '@newwork/nw-design-system'
import {
  ArrowLeftIcon,
  ArrowsClockwiseIcon,
  CalendarCheckIcon,
  CaretDownIcon,
  CaretUpIcon,
  CheckCircleIcon,
  ClockIcon,
  MinusCircleIcon,
  SpinnerGapIcon,
  WarningCircleIcon,
  XCircleIcon
} from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import type { DispatchStatus, ScheduledDispatch } from '@/common/network/ai/prompt-manager/PromptManagerClient'
import { useScheduledDispatches } from '../../hooks/useScheduledDispatches'
import { useEmployeeSummaries, type EmployeeSummary } from '../../hooks/useEmployeeSummary'
import { AssigneeChip } from './AssigneeChip'

interface ScheduledDispatchesScreenProps {
  accessToken: string
  onBack: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_TABS: { label: string; value: DispatchStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending', value: 'pending' },
  { label: 'Sent', value: 'fired' },
  { label: 'Failed', value: 'failed' },
  { label: 'Cancelled', value: 'cancelled' }
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
  const configs: Record<DispatchStatus, { label: string; classes: string; Icon: React.FC<{ className?: string }> }> = {
    pending: {
      label: 'Pending',
      classes: 'gba:bg-amber-100 gba:text-amber-800 dark:gba:bg-amber-900/30 dark:gba:text-amber-300',
      Icon: ClockIcon
    },
    firing: {
      label: 'Sending…',
      classes: 'gba:bg-blue-100 gba:text-blue-800 dark:gba:bg-blue-900/30 dark:gba:text-blue-300',
      Icon: SpinnerGapIcon
    },
    fired: {
      label: 'Sent',
      classes: 'gba:bg-emerald-100 gba:text-emerald-800 dark:gba:bg-emerald-900/30 dark:gba:text-emerald-300',
      Icon: CheckCircleIcon
    },
    cancelled: {
      label: 'Cancelled',
      classes: 'gba:bg-muted gba:text-muted-foreground',
      Icon: MinusCircleIcon
    },
    failed: {
      label: 'Failed',
      classes: 'gba:bg-red-100 gba:text-red-800 dark:gba:bg-red-900/30 dark:gba:text-red-300',
      Icon: XCircleIcon
    }
  }

  const { label, classes, Icon } = configs[status] ?? configs.pending

  return (
    <span
      className={`gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:text-[11px] gba:font-medium ${classes}`}
    >
      <Icon className={`gba:h-3 gba:w-3 ${status === 'firing' ? 'gba:animate-spin' : ''}`} />
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Dispatch row with expandable detail
// ---------------------------------------------------------------------------

interface DispatchRowProps {
  dispatch: ScheduledDispatch
  onCancel: (id: string) => Promise<boolean>
  summaries: Map<string, EmployeeSummary>
}

const DispatchRow: React.FC<DispatchRowProps> = ({ dispatch, onCancel, summaries }) => {
  const [expanded, setExpanded] = useState(false)
  const [cancelling, setCancelling] = useState(false)

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setCancelling(true)
    await onCancel(dispatch.dispatchId)
    setCancelling(false)
  }

  const scheduledStr = formatScheduledAt(dispatch.scheduledAt)
  const assigneeUserIds = dispatch.assigneeUserIds ?? []
  const workflowIds = dispatch.workflowIds ?? []
  const assigneeCount = assigneeUserIds.length

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
            <span className="gba:text-[13px] gba:font-semibold gba:text-foreground gba:truncate">{dispatch.title}</span>
          </div>
          <p className="gba:mt-1 gba:text-[12px] gba:text-muted-foreground gba:flex gba:items-center gba:gap-1">
            <CalendarCheckIcon className="gba:h-3.5 gba:w-3.5 gba:shrink-0" />
            {scheduledStr}
          </p>
          <p className="gba:mt-0.5 gba:text-[11px] gba:text-muted-foreground">
            {assigneeCount} assignee{assigneeCount === 1 ? '' : 's'}
          </p>
        </button>
        <div className="gba:flex gba:items-center gba:gap-2 gba:shrink-0">
          {dispatch.status === 'pending' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCancel}
              disabled={cancelling}
              className="gba:h-7 gba:px-2 gba:text-[11px] gba:text-destructive gba:hover:text-destructive gba:hover:bg-destructive/10"
            >
              {cancelling ? <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin" /> : 'Cancel'}
            </Button>
          )}
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            aria-label={expanded ? 'Collapse' : 'Expand'}
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
        <div className="gba:border-t gba:border-border/60 gba:px-4 gba:py-3 gba:bg-muted/20 gba:space-y-3">
          <div>
            <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
              Message
            </p>
            <p className="gba:text-[13px] gba:text-foreground gba:whitespace-pre-wrap gba:break-words">
              {dispatch.message}
            </p>
          </div>

          <div>
            <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
              Assignees ({assigneeCount})
            </p>
            <div className="gba:flex gba:flex-col gba:gap-1.5">
              {assigneeUserIds.map(uid => (
                <AssigneeChip key={uid} userId={uid} summary={summaries.get(uid)} />
              ))}
            </div>
          </div>

          {workflowIds.length > 0 && (
            <div>
              <p className="gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
                Workflow IDs
              </p>
              {workflowIds.map(wid => (
                <span key={wid} className="gba:block gba:text-[12px] gba:text-foreground gba:font-mono">
                  {wid}
                </span>
              ))}
            </div>
          )}

          {dispatch.firedAt && (
            <p className="gba:text-[11px] gba:text-muted-foreground">Sent at: {formatScheduledAt(dispatch.firedAt)}</p>
          )}

          {dispatch.error && (
            <div className="gba:flex gba:items-start gba:gap-1.5 gba:text-destructive">
              <WarningCircleIcon className="gba:h-3.5 gba:w-3.5 gba:mt-0.5 gba:shrink-0" />
              <p className="gba:text-[12px]">{dispatch.error}</p>
            </div>
          )}

          <p className="gba:text-[10px] gba:text-muted-foreground/60">ID: {dispatch.dispatchId}</p>
        </div>
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

export const ScheduledDispatchesScreen: React.FC<ScheduledDispatchesScreenProps> = ({ accessToken, onBack }) => {
  const { dispatches, isLoading, error, refresh, cancel, statusFilter, setStatusFilter } =
    useScheduledDispatches(accessToken)

  // Collect all unique userIds across all visible dispatches for a single batch GraphQL call
  const allUserIds = useMemo(() => {
    const ids = new Set<string>()
    for (const d of dispatches) {
      for (const uid of d.assigneeUserIds ?? []) ids.add(uid)
    }
    return Array.from(ids)
  }, [dispatches])

  const { summaries } = useEmployeeSummaries(accessToken, allUserIds)

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="scheduled-dispatches-screen">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-3 gba:px-4 gba:py-3 gba:border-b gba:border-border/60 gba:shrink-0">
        <button
          type="button"
          onClick={onBack}
          aria-label="Back"
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
        >
          <ArrowLeftIcon className="gba:h-4 gba:w-4" />
        </button>
        <div className="gba:flex gba:items-center gba:gap-2 gba:flex-1 gba:min-w-0">
          <CalendarCheckIcon className="gba:h-4 gba:w-4 gba:text-muted-foreground gba:shrink-0" />
          <h2 className="gba:text-[14px] gba:font-semibold gba:text-foreground gba:truncate">Scheduled Tasks</h2>
        </div>
        <button
          type="button"
          onClick={refresh}
          aria-label="Refresh"
          className="gba:inline-flex gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-lg gba:text-muted-foreground gba:hover:text-foreground gba:hover:bg-muted/60 gba:transition-colors"
          disabled={isLoading}
        >
          <ArrowsClockwiseIcon className={`gba:h-4 gba:w-4 ${isLoading ? 'gba:animate-spin' : ''}`} />
        </button>
      </div>

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
            {tab.label}
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
              Try again
            </Button>
          </div>
        )}

        {!isLoading && !error && dispatches.length === 0 && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-12 gba:gap-3 gba:text-center gba:text-muted-foreground">
            <CalendarCheckIcon className="gba:h-10 gba:w-10 gba:opacity-30" />
            <p className="gba:text-[13px] gba:font-medium">No scheduled tasks</p>
            <p className="gba:text-[12px] gba:max-w-[220px]">
              Ask the agent to schedule a task for someone and it will appear here.
            </p>
          </div>
        )}

        {dispatches.map(d => (
          <DispatchRow key={d.dispatchId} dispatch={d} onCancel={cancel} summaries={summaries} />
        ))}
      </div>
    </div>
  )
}
