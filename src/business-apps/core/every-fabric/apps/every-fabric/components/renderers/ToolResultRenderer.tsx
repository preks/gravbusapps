import { useState } from 'react'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'
import { detectRendererType } from '../../utils/renderUtils'

export interface ToolResultRendererProps {
  callId: string
  toolName?: string
  result: unknown
  durationMs: number
  cached: boolean
}

export const ToolResultRenderer = ({ callId, toolName, result, durationMs, cached }: ToolResultRendererProps) => {
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
          <ResultContent toolName={toolName} result={result} rendererType={rendererType} />
        </div>
      )}
    </div>
  )
}

function ResultContent({
  toolName,
  result,
  rendererType
}: {
  toolName?: string
  result: unknown
  rendererType: ReturnType<typeof detectRendererType>
}) {
  if (
    toolName === 'web_search' &&
    result &&
    typeof result === 'object' &&
    'results' in result &&
    Array.isArray((result as { results?: unknown[] }).results)
  ) {
    const parsed = result as {
      source?: string
      results: Array<{ title?: string; url?: string; snippet?: string }>
    }

    return (
      <div className="gba:space-y-3">
        <div className="gba:flex gba:items-center gba:justify-between">
          <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide">
            Sources
          </p>
          {parsed.source && <span className="gba:text-[11px] gba:text-muted-foreground/70">{parsed.source}</span>}
        </div>

        <div className="gba:grid gba:gap-2">
          {parsed.results.slice(0, 6).map((item, index) => (
            <a
              key={`${item.url ?? item.title ?? 'result'}-${index}`}
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="gba:block gba:rounded-xl gba:border gba:border-border gba:bg-card gba:px-3 gba:py-2.5 gba:hover:bg-muted/25 gba:transition-colors"
            >
              <p className="gba:text-sm gba:font-medium gba:text-foreground">
                {item.title || item.url || `Result ${index + 1}`}
              </p>
              {item.snippet && (
                <p className="gba:mt-1 gba:text-xs gba:leading-5 gba:text-muted-foreground">{item.snippet}</p>
              )}
              {item.url && (
                <p className="gba:mt-1 gba:text-[11px] gba:text-muted-foreground/70 gba:truncate">{item.url}</p>
              )}
            </a>
          ))}
        </div>
      </div>
    )
  }

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
