import { useState } from 'react'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { detectRendererType } from '../../utils/renderUtils'

export interface ToolResultRendererProps {
  callId: string
  result: unknown
  durationMs: number
  cached: boolean
}

export const ToolResultRenderer = ({ callId, result, durationMs, cached }: ToolResultRendererProps) => {
  const [expanded, setExpanded] = useState(false)
  const rendererType = detectRendererType(result)

  return (
    <div
      className="gba:rounded-lg gba:border gba:border-dashed gba:border-border gba:bg-background gba:overflow-hidden gba:max-w-3xl"
      data-testid={`enterprise-agent-tool-result-${callId}`}
    >
      <button
        className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-1.5 gba:hover:bg-muted/30 gba:transition-colors gba:text-left"
        onClick={() => setExpanded(v => !v)}
      >
        <span className="gba:text-xs gba:text-muted-foreground gba:font-medium">Result</span>
        <span className="gba:text-xs gba:text-muted-foreground/70">· {rendererType}</span>
        {cached && <span className="gba:text-xs gba:text-muted-foreground">cached</span>}
        <span className="gba:text-xs gba:text-muted-foreground/60 gba:ml-auto">{(durationMs / 1000).toFixed(2)}s</span>
        <div className="gba:flex-shrink-0">
          {expanded ? (
            <CaretDown className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
          ) : (
            <CaretRight className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="gba:border-t gba:border-border gba:p-3">
          <ResultContent result={result} rendererType={rendererType} />
        </div>
      )}
    </div>
  )
}

function ResultContent({
  result,
  rendererType
}: {
  result: unknown
  rendererType: ReturnType<typeof detectRendererType>
}) {
  if (rendererType === 'markdown' && typeof result === 'string') {
    return <MarkdownWithChipsRenderer content={result} />
  }

  if (rendererType === 'table' && Array.isArray(result) && result.length > 0) {
    const rows = result as Record<string, unknown>[]
    const cols = Object.keys(rows[0])
    const shown = rows.slice(0, 10)
    return (
      <div className="gba:overflow-x-auto">
        <table className="gba:w-full gba:text-xs gba:border-collapse">
          <thead>
            <tr>
              {cols.map(col => (
                <th
                  key={col}
                  className="gba:text-left gba:px-2 gba:py-1 gba:bg-muted gba:font-semibold gba:text-muted-foreground gba:border gba:border-border"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {shown.map(row => (
              <tr key={JSON.stringify(row)} className="gba:even:bg-muted/30">
                {cols.map(col => (
                  <td
                    key={col}
                    className="gba:px-2 gba:py-1 gba:border gba:border-border gba:truncate gba:max-w-[200px]"
                  >
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 10 && (
          <p className="gba:text-xs gba:text-muted-foreground gba:mt-1">Showing 10 of {rows.length} rows</p>
        )}
      </div>
    )
  }

  if (rendererType === 'text' && typeof result === 'string') {
    return <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">{result}</p>
  }

  // json fallback
  return (
    <pre className="gba:text-xs gba:font-mono gba:bg-muted gba:rounded gba:p-2 gba:overflow-x-auto gba:whitespace-pre-wrap gba:max-h-64">
      {JSON.stringify(result, null, 2)}
    </pre>
  )
}
