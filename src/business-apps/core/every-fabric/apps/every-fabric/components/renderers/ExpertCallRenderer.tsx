import { CheckIcon, ShareNetworkIcon, SpinnerGapIcon, XIcon } from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'

export interface ExpertCallRendererProps {
  agentId: string
  task: string
  status: 'running' | 'done' | 'failed'
  output?: string
  outputPreview?: string
  durationMs?: number
}

const normalizeText = (value: string) => value.trim().replace(/\s+/g, ' ').toLowerCase()

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

const ExpertCallStatusIcon: React.FC<{ status: 'running' | 'done' | 'failed' }> = ({ status }) => {
  if (status === 'running') {
    return <SpinnerGapIcon className="gba:h-3 gba:w-3 gba:animate-spin gba:text-sky-600" />
  }
  if (status === 'done') {
    return <CheckIcon className="gba:h-3 gba:w-3 gba:text-green-500" />
  }
  return <XIcon className="gba:h-3 gba:w-3 gba:text-destructive" />
}

export const ExpertCallRenderer = ({
  agentId,
  task,
  status,
  output,
  outputPreview,
  durationMs
}: ExpertCallRendererProps) => {
  const normalizedAgentId = agentId.trim()
  const normalizedTask = task.trim()
  const displayName = resolveExpertDisplayName(normalizedAgentId, normalizedTask)
  const subtitle = hasSubtitle(displayName, normalizedTask) ? '' : normalizedTask || 'Working on a delegated task'

  return (
    <div
      className="gba:overflow-hidden gba:rounded-lg gba:border gba:border-border/60 gba:bg-background"
      data-testid={`enterprise-agent-expert-${agentId}`}
    >
      <div className="gba:flex gba:items-start gba:gap-2 gba:px-2.5 gba:py-1.5">
        <span className="gba:flex gba:h-6 gba:w-6 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-sky-100 gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300">
          <ShareNetworkIcon className="gba:h-3 gba:w-3" />
        </span>
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-1.5 gba:gap-y-0.5">
            <span className="gba:text-[9px] gba:font-semibold gba:uppercase gba:tracking-[0.14em] gba:text-muted-foreground/80">
              Enterprise expert:
            </span>
            <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-sky-100 gba:px-2 gba:py-0.5 gba:text-[10px] gba:font-semibold gba:leading-none gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300">
              {displayName}
            </span>
            {durationMs !== undefined && (
              <span className="gba:text-[10px] gba:text-muted-foreground/60">{(durationMs / 1000).toFixed(2)}s</span>
            )}
          </div>
          {subtitle ? (
            <p className="gba:mt-0.5 gba:text-[11px] gba:leading-4 gba:text-muted-foreground/85 gba:line-clamp-2">
              {subtitle}
            </p>
          ) : null}
          {(output || outputPreview) && (
            <div className="gba:mt-1">
              {output ? (
                <MarkdownWithChipsRenderer content={output} />
              ) : (
                <p className="gba:text-[11px] gba:leading-4 gba:text-muted-foreground gba:truncate">{outputPreview}</p>
              )}
            </div>
          )}
        </div>
        <div className="gba:flex gba:h-6 gba:shrink-0 gba:items-center">
          <ExpertCallStatusIcon status={status} />
        </div>
      </div>
    </div>
  )
}
