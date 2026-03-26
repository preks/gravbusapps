import { useState } from 'react'
import { CaretDown, CaretRight, Check, Lightning, SpinnerGap, X } from '@phosphor-icons/react'
import { toolCategoryColor } from '../../utils/renderUtils'

export interface ToolCallRendererProps {
  toolName: string
  input: Record<string, unknown>
  callId: string
  status: 'pending' | 'running' | 'done' | 'failed' | 'cached'
  durationMs?: number
  resultPreview?: string
}

const STATUS_ICON = {
  pending: <span className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-muted-foreground/30" />,
  running: <SpinnerGap className="gba:h-3 gba:w-3 gba:animate-spin gba:text-primary" />,
  done: <Check className="gba:h-3 gba:w-3 gba:text-primary" />,
  failed: <X className="gba:h-3 gba:w-3 gba:text-destructive" />,
  cached: <Lightning className="gba:h-3 gba:w-3 gba:text-primary" />
}

export const ToolCallRenderer = ({
  toolName,
  input,
  callId,
  status,
  durationMs,
  resultPreview
}: ToolCallRendererProps) => {
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:overflow-hidden gba:max-w-3xl"
      data-testid={`enterprise-agent-tool-call-${callId}`}
    >
      <button
        className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:hover:bg-muted/40 gba:transition-colors gba:text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="gba:flex-shrink-0">{STATUS_ICON[status]}</div>

        <span
          className={`gba:inline-flex gba:items-center gba:px-1.5 gba:py-0.5 gba:rounded gba:text-xs gba:font-mono gba:font-semibold ${toolCategoryColor(toolName)}`}
        >
          {toolName}
        </span>

        {status === 'cached' && <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">cached</span>}
        {durationMs !== undefined && (
          <span className="gba:text-xs gba:text-muted-foreground/60">{(durationMs / 1000).toFixed(2)}s</span>
        )}

        <div className="gba:ml-auto gba:flex-shrink-0">
          {expanded ? (
            <CaretDown className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
          ) : (
            <CaretRight className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="gba:border-t gba:border-border gba:px-3 gba:py-2.5 gba:space-y-2">
          <div>
            <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
              Input
            </p>
            <pre className="gba:text-xs gba:font-mono gba:bg-muted gba:rounded gba:p-2 gba:overflow-x-auto gba:whitespace-pre-wrap gba:break-all">
              {JSON.stringify(input, null, 2)}
            </pre>
          </div>
          {resultPreview && (
            <div>
              <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
                Result preview
              </p>
              <p className="gba:text-xs gba:text-muted-foreground gba:truncate">{resultPreview}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
