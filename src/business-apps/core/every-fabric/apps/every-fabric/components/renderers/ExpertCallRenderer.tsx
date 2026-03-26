import { Check, ShareNetwork, SpinnerGap } from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'

export interface ExpertCallRendererProps {
  agentId: string
  task: string
  status: 'running' | 'done' | 'failed'
  output?: string
}

export const ExpertCallRenderer = ({ agentId, task, status, output }: ExpertCallRendererProps) => {
  return (
    <div
      className="gba:rounded-xl gba:border gba:border-border gba:bg-muted/40 gba:overflow-hidden gba:max-w-3xl"
      data-testid={`enterprise-agent-expert-${agentId}`}
    >
      <div className="gba:flex gba:items-center gba:gap-2.5 gba:px-4 gba:py-2.5">
        <ShareNetwork className="gba:h-4 gba:w-4 gba:text-primary gba:flex-shrink-0" />
        <div className="gba:flex-1 gba:min-w-0">
          <div className="gba:flex gba:items-center gba:gap-2">
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">Expert Delegated</span>
            <span className="gba:text-xs gba:font-mono gba:bg-muted gba:text-muted-foreground gba:px-1.5 gba:py-0.5 gba:rounded">
              {agentId}
            </span>
          </div>
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-0.5 gba:truncate">{task}</p>
        </div>
        <div className="gba:flex-shrink-0">
          {status === 'running' ? (
            <SpinnerGap className="gba:h-3.5 gba:w-3.5 gba:animate-spin gba:text-primary" />
          ) : status === 'done' ? (
            <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary" />
          ) : null}
        </div>
      </div>

      {output && (
        <div className="gba:border-t gba:border-border gba:px-4 gba:py-3 gba:bg-background">
          <MarkdownWithChipsRenderer content={output} />
        </div>
      )}
    </div>
  )
}
