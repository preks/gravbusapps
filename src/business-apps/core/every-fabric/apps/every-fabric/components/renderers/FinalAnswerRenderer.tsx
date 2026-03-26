import { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CaretDown, CaretRight, CheckCircle, DownloadSimple, Star } from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import type { TodoItem, CostSummary, ActionSummary } from '../../types/enterpriseAgent'
import { formatDuration, formatCost } from '../../utils/renderUtils'

export interface FinalAnswerRendererProps {
  output: string
  qualityScore?: number
  todos?: TodoItem[]
  actionsPerformed?: ActionSummary[]
  recommendations?: string
  costSummary?: CostSummary
  durationMs?: number
}

export const FinalAnswerRenderer = ({
  output,
  qualityScore,
  todos,
  actionsPerformed,
  recommendations,
  costSummary,
  durationMs
}: FinalAnswerRendererProps) => {
  const [actionsExpanded, setActionsExpanded] = useState(false)

  const handleExport = () => {
    const text = output
    const blob = new Blob([text], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agent-output-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const stepsCompleted = todos ? todos.filter(t => t.status === 'done').length : undefined
  const totalSteps = todos?.length

  return (
    <div
      className="gba:rounded-xl gba:border gba:border-border gba:bg-card gba:overflow-hidden gba:max-w-4xl"
      data-testid="enterprise-agent-final-answer"
    >
      {/* Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-3 gba:border-b gba:border-border gba:bg-muted/40">
        <CheckCircle className="gba:h-4 gba:w-4 gba:text-primary gba:flex-shrink-0" weight="fill" />
        <span className="gba:text-sm gba:font-semibold gba:text-foreground">Completed</span>
        {qualityScore !== undefined && (
          <div className="gba:flex gba:items-center gba:gap-1 gba:ml-auto">
            <Star className="gba:h-3.5 gba:w-3.5 gba:text-primary" weight="fill" />
            <span className="gba:text-xs gba:font-medium gba:text-foreground">{qualityScore.toFixed(2)}</span>
          </div>
        )}
      </div>

      {/* Output / findings */}
      <div className="gba:px-4 gba:py-4">
        <MarkdownWithChipsRenderer content={output} />
      </div>

      {/* Recommendations */}
      {recommendations && (
        <div className="gba:px-4 gba:pb-4">
          <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-2">
            Recommendations
          </p>
          <MarkdownWithChipsRenderer content={recommendations} />
        </div>
      )}

      {/* Actions accordion */}
      {actionsPerformed && actionsPerformed.length > 0 && (
        <div className="gba:border-t gba:border-border">
          <button
            className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:hover:bg-muted/30 gba:transition-colors gba:text-left"
            onClick={() => setActionsExpanded(v => !v)}
            data-testid="enterprise-agent-final-actions-toggle"
          >
            <span className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
              Actions taken
            </span>
            {actionsExpanded ? (
              <CaretDown className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            ) : (
              <CaretRight className="gba:h-3.5 gba:w-3.5 gba:text-muted-foreground" />
            )}
          </button>
          {actionsExpanded && (
            <div className="gba:px-4 gba:pb-3 gba:space-y-1">
              {actionsPerformed.map((action, index) => (
                <div
                  key={`${action.step}-${action.tool ?? 'none'}`}
                  className="gba:flex gba:items-start gba:gap-2 gba:text-sm"
                >
                  <span className="gba:text-muted-foreground/50 gba:flex-shrink-0">{index + 1}.</span>
                  <span className="gba:flex-1">{action.step}</span>
                  {action.tool && (
                    <span className="gba:text-xs gba:font-mono gba:bg-muted gba:px-1.5 gba:py-0.5 gba:rounded gba:text-muted-foreground gba:flex-shrink-0">
                      {action.tool}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Stats footer */}
      <div className="gba:flex gba:items-center gba:gap-4 gba:px-4 gba:py-2.5 gba:border-t gba:border-border gba:bg-muted/30">
        {costSummary && (
          <span className="gba:text-xs gba:text-muted-foreground">
            Cost: <strong>{formatCost(costSummary.estimated_cost_usd)}</strong>
          </span>
        )}
        {durationMs !== undefined && (
          <span className="gba:text-xs gba:text-muted-foreground">
            Duration: <strong>{formatDuration(durationMs)}</strong>
          </span>
        )}
        {stepsCompleted !== undefined && totalSteps !== undefined && (
          <span className="gba:text-xs gba:text-muted-foreground">
            Steps:{' '}
            <strong>
              {stepsCompleted}/{totalSteps}
            </strong>
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-7 gba:gap-1.5 gba:text-xs gba:ml-auto"
          onClick={handleExport}
          data-testid="enterprise-agent-final-export"
        >
          <DownloadSimple className="gba:h-3.5 gba:w-3.5" />
          Export
        </Button>
      </div>
    </div>
  )
}
