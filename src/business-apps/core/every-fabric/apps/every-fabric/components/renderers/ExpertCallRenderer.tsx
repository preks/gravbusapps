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

const ExpertCallStatusIcon: React.FC<{ status: 'running' | 'done' | 'failed' }> = ({ status }) => {
  if (status === 'running') {
    return <SpinnerGapIcon className="gba:h-3.5 gba:w-3.5 gba:animate-spin gba:text-primary" />
  }
  if (status === 'done') {
    return <CheckIcon className="gba:h-3.5 gba:w-3.5 gba:text-green-500" />
  }
  return <XIcon className="gba:h-3.5 gba:w-3.5 gba:text-destructive" />
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
  const subtitle =
    normalizeText(displayName) !== normalizeText(normalizedTask) ? normalizedTask || 'Working on a delegated task' : ''

  return (
    <div
      className="gba:overflow-hidden gba:rounded-xl gba:border gba:border-border gba:bg-muted/28"
      data-testid={`enterprise-agent-expert-${agentId}`}
    >
      <div className="gba:flex gba:items-start gba:gap-3 gba:px-4 gba:py-3">
        <span className="gba:flex gba:h-8 gba:w-8 gba:shrink-0 gba:items-center gba:justify-center gba:rounded-full gba:bg-sky-100 gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300">
          <ShareNetworkIcon className="gba:h-4 gba:w-4" />
        </span>
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap gba:mb-1">
            <span className="gba:text-[11px] gba:font-semibold gba:uppercase gba:tracking-[0.08em] gba:text-muted-foreground">
              Enterprise expert:
            </span>
            <span className="gba:inline-flex gba:items-center gba:rounded-full gba:bg-sky-100 gba:px-2.5 gba:py-0.5 gba:text-[11px] gba:font-semibold gba:text-sky-700 dark:gba:bg-sky-950/40 dark:gba:text-sky-300">
              {displayName}
            </span>
            {durationMs !== undefined && (
              <span className="gba:text-[11px] gba:text-muted-foreground/65">{(durationMs / 1000).toFixed(2)}s</span>
            )}
          </div>
          <p className="gba:text-xs gba:text-muted-foreground gba:leading-5 gba:line-clamp-2">{subtitle}</p>
        </div>
        <div className="gba:shrink-0 gba:pt-0.5">
          <ExpertCallStatusIcon status={status} />
        </div>
      </div>

      {(output || outputPreview) && (
        <div className="gba:border-t gba:border-border gba:bg-background gba:px-4 gba:py-3">
          {output ? (
            <MarkdownWithChipsRenderer content={output} />
          ) : (
            <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{outputPreview}</p>
          )}
        </div>
      )}
    </div>
  )
}
