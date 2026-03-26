import { Check, ShareNetwork, SpinnerGap, X } from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'

export interface ExpertCallRendererProps {
  agentId: string
  task: string
  status: 'running' | 'done' | 'failed'
  output?: string
  outputPreview?: string
  durationMs?: number
}

export const ExpertCallRenderer = ({
  agentId,
  task,
  status,
  output,
  outputPreview,
  durationMs
}: ExpertCallRendererProps) => {
  return (
    <div
      className="gba:rounded-xl gba:border gba:border-border gba:bg-muted/40 gba:overflow-hidden gba:max-w-3xl"
      data-testid={`enterprise-agent-expert-${agentId}`}
    >
      <div className="gba:flex gba:items-center gba:gap-2.5 gba:px-4 gba:py-2.5">
        <ShareNetwork className="gba:h-4 gba:w-4 gba:text-purple-500 gba:shrink-0" />
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">Sub-Agent</span>
            <span className="gba:text-xs gba:font-mono gba:bg-purple-100 gba:text-purple-700 dark:gba:bg-purple-900/30 dark:gba:text-purple-300 gba:px-1.5 gba:py-0.5 gba:rounded">
              {agentId}
            </span>
            {durationMs !== undefined && (
              <span className="gba:text-xs gba:text-muted-foreground/60">{(durationMs / 1000).toFixed(2)}s</span>
            )}
          </div>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:line-clamp-2">{task}</p>
        </div>
        <div className="gba:shrink-0">
          {status === 'running' ? (
            <SpinnerGap className="gba:h-3.5 gba:w-3.5 gba:animate-spin gba:text-primary" />
          ) : status === 'done' ? (
            <Check className="gba:h-3.5 gba:w-3.5 gba:text-green-500" />
          ) : (
            <X className="gba:h-3.5 gba:w-3.5 gba:text-destructive" />
          )}
        </div>
      </div>

      {(output || outputPreview) && (
        <div className="gba:border-t gba:border-border gba:px-4 gba:py-3 gba:bg-background">
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
