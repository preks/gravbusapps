import { Button } from '@newwork/nw-design-system'
import { DownloadSimple, GitBranch } from '@phosphor-icons/react'
import type { TraceEvent } from '../../types/enterpriseAgent'

interface TracePanelProps {
  trace?: TraceEvent[]
  sessionId: string
}

export const TracePanel = ({ trace, sessionId }: TracePanelProps) => {
  const handleExport = () => {
    const json = JSON.stringify(trace ?? [], null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trace-${sessionId}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="enterprise-agent-trace-panel">
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:border-b gba:border-border gba:flex-shrink-0">
        <GitBranch className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">Trace</span>
        <Button
          variant="ghost"
          size="sm"
          className="gba:h-6 gba:text-xs gba:gap-1 gba:ml-auto"
          onClick={handleExport}
          data-testid="enterprise-agent-trace-export"
        >
          <DownloadSimple className="gba:h-3 gba:w-3" />
          JSON
        </Button>
      </div>

      <div className="gba:flex-1 gba:overflow-y-auto gba:p-3">
        {!trace || trace.length === 0 ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
            <p className="gba:text-xs gba:text-muted-foreground">No trace available yet</p>
          </div>
        ) : (
          <div className="gba:space-y-2">
            {trace.map(event => (
              <div
                key={event.event_id}
                className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/30 gba:p-3 gba:space-y-1"
                data-testid={`enterprise-agent-trace-node-${event.event_id}`}
              >
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <span className="gba:text-xs gba:font-mono gba:text-foreground">
                    {event.role}
                    {event.chunk_kind ? `:${event.chunk_kind}` : ''}
                  </span>
                  <span className="gba:text-xs gba:text-muted-foreground">#{event.seq}</span>
                </div>
                <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap">
                  {event.content || 'No content'}
                </p>
                <div className="gba:text-[11px] gba:text-muted-foreground">{event.timestamp}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
