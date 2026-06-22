import { useMemo, type FC, type ReactNode } from 'react'
import { ArrowSquareOutIcon, CheckCircleIcon, CircleIcon, ProhibitIcon, WarningCircleIcon } from '@phosphor-icons/react'
import { useTranslation } from '@newwork/nw-design-system'
import translations from '../../_i18n'

import { STATUS_BADGE_CLASS, type ActionCardStatus, type ActionCardStatusVariant } from '../../utils/actionCardTrace'
import type { CaseItemState, CaseState } from '../../hooks/useFabricCases'
import { useLiveFlowStatus } from '../../hooks/useLiveFlowStatus'
import { PanelCard } from './PanelCard'
import { SubjectAvatar } from './SubjectAvatar'

interface CasePanelProps {
  cases: CaseState[]
  accessToken?: string
  /** Mirrors PlanCard: fold the card when the live preview is dominating the rail. */
  defaultCollapsed?: boolean
}

/**
 * Maps a row's logical status to the visual variant the badge / icon
 * use. Workflow rows additionally get overridden by the live Flow
 * Engine status — see `RowBadge`.
 */
function variantForRow(status: CaseItemState['status']): ActionCardStatusVariant {
  switch (status) {
    case 'in_progress':
      return 'running'
    case 'done':
      return 'success'
    case 'failed':
      return 'destructive'
    case 'skipped':
      return 'muted'
    case 'pending':
    default:
      return 'pending'
  }
}

function labelForRow(status: CaseItemState['status'], t: (key: string) => string): string {
  switch (status) {
    case 'in_progress':
      return t('sidebar-status-running')
    case 'done':
      return t('sidebar-status-done')
    case 'failed':
      return t('sidebar-status-failed')
    case 'skipped':
      return t('workspace-status-skipped')
    case 'pending':
    default:
      return t('sidebar-status-pending')
  }
}

const STATUS_DOT_CLASS: Record<ActionCardStatusVariant, string> = {
  pending:
    'gba:border-amber-400 gba:bg-amber-100/60 gba:text-amber-600 dark:gba:bg-amber-900/30 dark:gba:text-amber-200 gba:animate-pulse',
  running: 'gba:border-blue-500 gba:bg-blue-100 gba:text-blue-600 dark:gba:bg-blue-900/40 dark:gba:text-blue-200',
  success: 'gba:border-green-600 gba:bg-green-100 gba:text-green-700 dark:gba:bg-green-900/40 dark:gba:text-green-200',
  destructive: 'gba:border-red-500 gba:bg-red-100 gba:text-red-700 dark:gba:bg-red-900/40 dark:gba:text-red-200',
  muted: 'gba:border-border gba:bg-muted gba:text-muted-foreground'
}

const STATUS_DOT_ICON: Record<ActionCardStatusVariant, typeof CircleIcon> = {
  success: CheckCircleIcon,
  destructive: WarningCircleIcon,
  muted: ProhibitIcon,
  pending: CircleIcon,
  running: CircleIcon
}

const StatusDot: FC<{ variant: ActionCardStatusVariant }> = ({ variant }) => {
  const Icon = STATUS_DOT_ICON[variant]
  const baseClass =
    'gba:flex gba:h-6 gba:w-6 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:border-2 gba:transition-colors gba:duration-300'

  let inner: ReactNode
  if (variant === 'running') {
    inner = <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-current gba:animate-pulse" />
  } else if (variant === 'pending') {
    inner = <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-current" />
  } else {
    inner = <Icon className="gba:h-4 gba:w-4" weight="fill" />
  }

  return (
    <span className={`${baseClass} ${STATUS_DOT_CLASS[variant]}`} aria-hidden>
      {inner}
    </span>
  )
}

const Chip: FC<{ label: string; value: string }> = ({ label, value }) => (
  <span className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-md gba:bg-muted/50 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:text-muted-foreground">
    <span className="gba:font-semibold gba:uppercase gba:tracking-wide gba:text-[9px] gba:text-muted-foreground/70">
      {label}
    </span>
    <span className="gba:truncate gba:max-w-[8rem]">{value}</span>
  </span>
)

interface CaseRowProps {
  item: CaseItemState
  isLast: boolean
  accessToken?: string
}

const CaseRow: FC<CaseRowProps> = ({ item, isLast, accessToken }) => {
  const { t } = useTranslation(translations)
  // Workflow rows: once the row reaches a non-terminal state and we
  // know a workflow id, ask Flow Engine for the live status. The hook
  // is a no-op for rows without a workflow id, so non-flow steps stay
  // driven purely by the agent's case_panel_update events.
  const isWorkflowRow = Boolean(item.workflowId)
  const isTerminal = item.status === 'done' || item.status === 'failed' || item.status === 'skipped'
  const initialStatus: ActionCardStatus = {
    code: item.status,
    label: labelForRow(item.status, t),
    variant: variantForRow(item.status)
  }
  const liveStatus = useLiveFlowStatus({
    workflowId: item.workflowId ?? null,
    accessToken,
    initialStatus,
    enabled: isWorkflowRow && !isTerminal
  })

  // For workflow rows, the live Flow Engine status overrides the
  // agent-reported one as soon as the first poll lands. For non-flow
  // rows, fall back to the local mapping.
  const variant: ActionCardStatusVariant = isWorkflowRow ? liveStatus.variant : variantForRow(item.status)
  const label = isWorkflowRow ? liveStatus.label : labelForRow(item.status, t)

  const handleOpenFlow = () => {
    if (!item.workflowId) return
    window.open(`/platform/apps/flow/apps/detail?flowId=${item.workflowId}`, '_blank', 'noopener,noreferrer')
  }

  return (
    <li className="gba:relative gba:flex gba:gap-3 gba:px-4 gba:py-2.5">
      {!isLast && (
        <span
          aria-hidden
          className="gba:absolute gba:left-[1.75rem] gba:top-9 gba:bottom-0 gba:w-px gba:bg-border/60"
        />
      )}
      <StatusDot variant={variant} />
      <div className="gba:flex-1 gba:min-w-0 gba:space-y-1">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
          <div className="gba:min-w-0">
            <div className="gba:text-[13px] gba:font-medium gba:text-foreground gba:truncate">{item.label}</div>
            {item.description && (
              <div className="gba:text-[11px] gba:text-muted-foreground gba:line-clamp-2">{item.description}</div>
            )}
          </div>
          <span
            className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:whitespace-nowrap ${STATUS_BADGE_CLASS[variant]}`}
            data-status-variant={variant}
            data-status-code={isWorkflowRow ? liveStatus.code : item.status}
          >
            {variant === 'running' && (
              <span className="gba:h-1 gba:w-1 gba:rounded-full gba:bg-current gba:animate-pulse" aria-hidden />
            )}
            {label}
          </span>
        </div>
        {(item.owner || item.due) && (
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-1">
            {item.owner && <Chip label={t('workspace-case-owner')} value={item.owner} />}
            {item.due && <Chip label={t('workspace-case-due')} value={item.due} />}
          </div>
        )}
        {item.workflowId && (
          <button
            type="button"
            onClick={handleOpenFlow}
            className="gba:inline-flex gba:items-center gba:gap-1 gba:text-[11px] gba:font-medium gba:text-muted-foreground gba:hover:text-foreground gba:transition-colors"
          >
            <span>{t('workspace-case-open-workflow')}</span>
            <ArrowSquareOutIcon className="gba:h-3 gba:w-3" />
          </button>
        )}
      </div>
    </li>
  )
}

interface SingleCaseProps {
  caseState: CaseState
  accessToken?: string
}

const CLOSED_VARIANT_BY_STATUS: Record<string, ActionCardStatusVariant> = {
  completed: 'success',
  failed: 'destructive'
}

const CLOSED_LABEL_BY_STATUS: Record<string, string> = {
  completed: 'enterprise-agent-status-completed',
  failed: 'sidebar-status-failed',
  cancelled: 'sidebar-status-cancelled'
}

const PROGRESS_BAR_BY_VARIANT: Record<ActionCardStatusVariant, string> = {
  success: 'gba:bg-green-500',
  destructive: 'gba:bg-red-500',
  muted: 'gba:bg-muted-foreground/40',
  pending: 'gba:bg-blue-500',
  running: 'gba:bg-blue-500'
}

function resolveAccentVariant(
  isClosed: boolean,
  caseStatus: CaseState['status'],
  failed: boolean
): ActionCardStatusVariant {
  if (isClosed) return CLOSED_VARIANT_BY_STATUS[caseStatus] ?? 'muted'
  return failed ? 'destructive' : 'running'
}

function resolveBadgeLabel(
  isClosed: boolean,
  caseStatus: CaseState['status'],
  completed: number,
  total: number,
  t: (key: string, vars?: Record<string, unknown>) => string
): string {
  if (!isClosed) return t('workspace-plan-progress', { done: completed, total })
  const closedKey = CLOSED_LABEL_BY_STATUS[caseStatus]
  if (closedKey) return t(closedKey)
  return t('workspace-case-partial')
}

const SingleCase: FC<SingleCaseProps> = ({ caseState, accessToken }) => {
  const { t } = useTranslation(translations)
  const { items } = caseState
  const completed = useMemo(() => items.filter(i => i.status === 'done' || i.status === 'skipped').length, [items])
  const total = items.length
  const progress = total > 0 ? Math.round((completed / total) * 100) : 0
  const failed = items.some(i => i.status === 'failed')
  const isClosed = caseState.status !== 'open'
  const accentVariant = resolveAccentVariant(isClosed, caseState.status, failed)
  const badgeLabel = resolveBadgeLabel(isClosed, caseState.status, completed, total, t)
  const progressBarClass = PROGRESS_BAR_BY_VARIANT[accentVariant]

  return (
    <div className="gba:flex gba:flex-col">
      <header className="gba:px-4 gba:pt-3 gba:pb-2 gba:space-y-1.5">
        <div className="gba:flex gba:items-start gba:justify-between gba:gap-2">
          <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2.5">
            <SubjectAvatar subject={caseState.subject} accessToken={accessToken} size={32} />
            <div className="gba:min-w-0">
              <div className="gba:text-[13px] gba:font-semibold gba:text-foreground gba:truncate">
                {caseState.title}
              </div>
              {caseState.subject?.label && (
                <div className="gba:text-[11px] gba:text-muted-foreground gba:truncate">{caseState.subject.label}</div>
              )}
            </div>
          </div>
          <span
            className={`gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-medium gba:whitespace-nowrap ${STATUS_BADGE_CLASS[accentVariant]}`}
          >
            {badgeLabel}
          </span>
        </div>
        <div className="gba:relative gba:h-1 gba:w-full gba:rounded-full gba:bg-muted">
          <div
            className={`gba:absolute gba:left-0 gba:top-0 gba:h-1 gba:rounded-full gba:transition-[width] gba:duration-500 ${progressBarClass}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        {caseState.summary && isClosed && (
          <div className="gba:text-[11px] gba:text-muted-foreground gba:line-clamp-2">{caseState.summary}</div>
        )}
      </header>
      <ol className="gba:flex gba:flex-col gba:py-1">
        {items.map((item, idx) => (
          <CaseRow key={item.stepId} item={item} isLast={idx === items.length - 1} accessToken={accessToken} />
        ))}
      </ol>
    </div>
  )
}

/**
 * Right-rail "Case Panel" widget. Renders one collapsible section per
 * open or recently-closed case the agent has declared via the generic
 * `case_panel_open/update/close` tools. Each row mirrors the live
 * status of its underlying workflow (when applicable) so the operator
 * gets a real-time mirror of the agent's progress without scrolling
 * through chat.
 *
 * Mounting: rendered inside `WorkspaceRightPanel` alongside `PlanCard`.
 * Hidden entirely when no case is active (`cases.length === 0`).
 */
export const CasePanel: FC<CasePanelProps> = ({ cases, accessToken, defaultCollapsed = false }) => {
  const { t } = useTranslation(translations)
  if (cases.length === 0) return null
  const total = cases.reduce((acc, c) => acc + c.items.length, 0)
  const completed = cases.reduce(
    (acc, c) => acc + c.items.filter(i => i.status === 'done' || i.status === 'skipped').length,
    0
  )
  const openCount = cases.filter(c => c.status === 'open').length
  const summary = openCount > 0 ? t('workspace-case-steps', { completed, total }) : t('workspace-case-all-closed')

  return (
    <PanelCard title={t('workspace-case-title')} badge={openCount} summary={summary} defaultOpen={!defaultCollapsed}>
      <div className="gba:flex gba:flex-col gba:divide-y gba:divide-border/40">
        {cases.map(caseState => (
          <div
            key={caseState.caseId}
            id={`case-panel-${caseState.caseId}`}
            data-case-id={caseState.caseId}
            className="gba:py-1"
          >
            <SingleCase caseState={caseState} accessToken={accessToken} />
          </div>
        ))}
      </div>
    </PanelCard>
  )
}

export default CasePanel
