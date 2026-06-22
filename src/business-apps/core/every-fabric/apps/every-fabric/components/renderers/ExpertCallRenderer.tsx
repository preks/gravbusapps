import React from 'react'
import { CheckIcon, HeadCircuitIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react'

type ExpertCallStatus = 'running' | 'done' | 'failed'

export interface ExpertCallRendererProps {
  agentId: string
  task: string
  description?: string
  status: ExpertCallStatus
  output?: string
  outputPreview?: string
  durationMs?: number
  /**
   * When provided, the pill becomes an interactive button that opens the
   * delegated-agent detail panel. Absent for native-agent pills (no
   * delegation lifecycle to drill into).
   */
  onOpenDetail?: () => void
}

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()

const firstSentence = (value: string): string => {
  const compact = value.trim().replace(/\s+/g, ' ')
  if (!compact) return ''
  const match = compact.match(/^.*?[.!?](?=\s|$)/)
  return (match ? match[0] : compact).trim()
}

const isLikelyTaskText = (value: string) => {
  const compact = value.trim()
  if (!compact) return false
  return compact.length > 42 || compact.split(/\s+/).length > 5
}

const isCompactRoleLabel = (value: string) => {
  const compact = value.trim()
  if (!compact) return false
  return compact.length <= 42 && compact.split(/\s+/).length <= 6
}

function resolveExpertDisplayName(normalizedAgentId: string, normalizedTask: string): string {
  const hasDistinctName =
    !!normalizedAgentId &&
    !isLikelyTaskText(normalizedAgentId) &&
    normalizeText(normalizedAgentId) !== normalizeText(normalizedTask)
  if (hasDistinctName) return normalizedAgentId
  if (isCompactRoleLabel(normalizedTask)) return normalizedTask
  return 'Sub-agent'
}

function hasSubtitle(displayName: string, normalizedTask: string): boolean {
  return normalizeText(displayName) === normalizeText(normalizedTask)
}

const ExpertCallStatusIcon: React.FC<{ status: ExpertCallStatus }> = ({ status }) => {
  if (status === 'running') {
    return <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-sky-600" />
  }
  if (status === 'done') {
    return <CheckIcon className="gba:h-3 gba:w-3 gba:text-green-500" />
  }
  return <XIcon className="gba:h-3 gba:w-3 gba:text-destructive" />
}

const statusLabel = (status: ExpertCallStatus) => {
  if (status === 'running') return 'Working'
  if (status === 'failed') return 'Failed'
  return 'Completed'
}

export const ExpertCallRenderer = ({
  agentId,
  task,
  description,
  status,
  output,
  outputPreview,
  durationMs,
  onOpenDetail
}: ExpertCallRendererProps) => {
  const normalizedAgentId = agentId.trim()
  const normalizedTask = task.trim()
  const normalizedDescription = (description ?? '').trim()
  const displayName = resolveExpertDisplayName(normalizedAgentId, normalizedTask)
  const subtitle =
    normalizedDescription || !hasSubtitle(displayName, normalizedTask)
      ? firstSentence(normalizedDescription || normalizedTask)
      : ''
  const previewTitle = [displayName, subtitle, outputPreview || output].filter(Boolean).join(' - ')
  const isInteractive = typeof onOpenDetail === 'function'
  const title = isInteractive
    ? `${previewTitle ? `${previewTitle} — ` : ''}Click to see what ${displayName} did`
    : previewTitle || undefined

  const sharedClassName =
    'gba:inline-flex gba:max-w-full gba:items-center gba:gap-1.5 gba:rounded-full gba:border gba:border-sky-500/15 gba:bg-sky-50/60 gba:px-2 gba:py-1 gba:text-left gba:text-sky-800 gba:shadow-[0_1px_4px_rgba(14,165,233,0.08)] dark:gba:border-sky-400/15 dark:gba:bg-sky-950/25 dark:gba:text-sky-200'
  const interactiveClassName = isInteractive
    ? ' gba:cursor-pointer gba:transition-colors hover:gba:border-sky-500/35 hover:gba:bg-sky-100/70 focus-visible:gba:outline-none focus-visible:gba:ring-2 focus-visible:gba:ring-sky-500/40 dark:hover:gba:bg-sky-900/40'
    : ''

  const inner = (
    <>
      <span className="gba:flex gba:h-5 gba:w-5 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-white/85 gba:text-foreground/70 gba:ring-1 gba:ring-sky-500/10 dark:gba:bg-sky-950/60 dark:gba:text-foreground/70">
        <HeadCircuitIcon className="gba:h-3 gba:w-3" weight="regular" />
      </span>
      <span className="gba:min-w-0 gba:truncate gba:text-[11px] gba:font-semibold gba:leading-none">
        <span className="gba:text-muted-foreground/80">Agent</span>
        <span className="gba:mx-1 gba:text-sky-500/70">/</span>
        <span>{displayName}</span>
      </span>
      <span className="gba:flex gba:shrink-0 gba:items-center gba:gap-1 gba:rounded-full gba:bg-white/70 gba:px-1.5 gba:py-0.5 gba:text-[10px] gba:font-medium gba:leading-none gba:text-muted-foreground gba:ring-1 gba:ring-border/40 dark:gba:bg-background/40">
        <ExpertCallStatusIcon status={status} />
        <span>{statusLabel(status)}</span>
        {durationMs !== undefined && (
          <span className="gba:text-muted-foreground/55">{(durationMs / 1000).toFixed(1)}s</span>
        )}
      </span>
      {subtitle ? (
        <span className="gba:hidden gba:max-w-2xs gba:truncate gba:text-[10px] gba:leading-none gba:text-muted-foreground/70 sm:gba:inline">
          {subtitle}
        </span>
      ) : null}
    </>
  )

  if (isInteractive) {
    return (
      <button
        type="button"
        onClick={onOpenDetail}
        className={sharedClassName + interactiveClassName}
        data-testid={`enterprise-agent-expert-${agentId}`}
        title={title}
        aria-label={`Open details for agent ${displayName}`}
      >
        {inner}
      </button>
    )
  }

  return (
    <div className={sharedClassName} data-testid={`enterprise-agent-expert-${agentId}`} title={title}>
      {inner}
    </div>
  )
}
