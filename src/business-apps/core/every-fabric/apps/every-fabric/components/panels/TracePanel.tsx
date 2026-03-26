import { useState } from 'react'
import { Button } from '@newwork/nw-design-system'
import { CaretDown, CaretRight, DownloadSimple, GitBranch, WifiHigh, WifiX } from '@phosphor-icons/react'
import type { AgentStreamEvent, TraceEvent } from '../../types/enterpriseAgent'

interface TracePanelProps {
  trace?: TraceEvent[]
  events?: AgentStreamEvent[]
  sessionId: string
  isConnected?: boolean
}

const EVENT_TYPE_LABEL: Record<string, string> = {
  agent_chunk: 'chunk',
  step_started: 'step:start',
  step_completed: 'step:done',
  subagent_spawned: 'agent:spawn',
  subagent_completed: 'agent:done',
  terminal: 'terminal',
  error: 'error'
}

const EVENT_TYPE_COLOR: Record<string, string> = {
  step_started: 'gba:text-blue-500',
  step_completed: 'gba:text-green-500',
  subagent_spawned: 'gba:text-purple-500',
  subagent_completed: 'gba:text-purple-400',
  terminal: 'gba:text-primary',
  error: 'gba:text-destructive',
  agent_chunk: 'gba:text-muted-foreground'
}

function eventLabel(event: AgentStreamEvent | TraceEvent): string {
  if (event.type === 'agent_chunk') {
    const role = 'role' in event ? event.role : 'unknown'
    const kind = 'chunk_kind' in event && event.chunk_kind ? `:${event.chunk_kind}` : ''
    return `${role}${kind}`
  }
  if (event.type === 'step_started' || event.type === 'step_completed') {
    return `${EVENT_TYPE_LABEL[event.type]} · ${'name' in event && event.name ? event.name : event.step_id}`
  }
  if (event.type === 'subagent_spawned' || event.type === 'subagent_completed') {
    return `${EVENT_TYPE_LABEL[event.type]} · ${'name' in event && event.name ? event.name : 'sub-agent'}`
  }
  return EVENT_TYPE_LABEL[event.type] ?? event.type
}

function eventContent(event: AgentStreamEvent | TraceEvent): string {
  if ('content' in event && event.content) return String(event.content)
  if ('task_summary' in event && event.task_summary) return String(event.task_summary)
  if ('output' in event && event.output) return String(event.output)
  if ('message' in event && event.message) return String(event.message)
  return ''
}

function TraceRow({ event }: { event: AgentStreamEvent | TraceEvent }) {
  const [expanded, setExpanded] = useState(false)
  const seq = 'seq' in event ? event.seq : null
  const timestamp = 'timestamp' in event ? event.timestamp : undefined
  const typeColor = EVENT_TYPE_COLOR[event.type] ?? 'gba:text-muted-foreground'
  const label = eventLabel(event)
  const content = eventContent(event)
  const durationMs = 'duration_ms' in event ? event.duration_ms : undefined

  const hasDetails = content.length > 0 || ('input' in event && event.input) || ('output' in event && event.output)

  return (
    <div
      className="gba:rounded-lg gba:border gba:border-border gba:bg-muted/20 gba:overflow-hidden"
      data-testid={`enterprise-agent-trace-node-${'event_id' in event ? event.event_id : seq}`}
    >
      <button
        className="gba:w-full gba:flex gba:items-center gba:gap-2 gba:px-3 gba:py-2 gba:text-left gba:hover:bg-muted/40 gba:transition-colors"
        onClick={() => hasDetails && setExpanded(v => !v)}
        disabled={!hasDetails}
      >
        <span className="gba:text-xs gba:text-muted-foreground/50 gba:w-7 gba:text-right gba:shrink-0 gba:font-mono">
          {seq ?? '—'}
        </span>
        <span className={`gba:text-xs gba:font-mono gba:font-semibold ${typeColor} gba:shrink-0`}>
          {EVENT_TYPE_LABEL[event.type] ?? event.type}
        </span>
        <span className="gba:text-xs gba:text-foreground gba:truncate gba:flex-1">{label}</span>
        {durationMs !== undefined && (
          <span className="gba:text-xs gba:text-muted-foreground/60 gba:shrink-0">
            {(durationMs / 1000).toFixed(2)}s
          </span>
        )}
        <span className="gba:text-[10px] gba:text-muted-foreground/40 gba:shrink-0 gba:hidden gba:sm:inline">
          {timestamp ? new Date(timestamp).toLocaleTimeString() : ''}
        </span>
        {hasDetails && (
          <div className="gba:shrink-0">
            {expanded ? (
              <CaretDown className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
            ) : (
              <CaretRight className="gba:h-3 gba:w-3 gba:text-muted-foreground" />
            )}
          </div>
        )}
      </button>

      {expanded && (
        <div className="gba:border-t gba:border-border gba:p-3 gba:space-y-2">
          {'input' in event && event.input && (
            <div>
              <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
                Input
              </p>
              <pre className="gba:text-xs gba:font-mono gba:bg-muted gba:rounded gba:p-2 gba:overflow-x-auto gba:whitespace-pre-wrap gba:max-h-40">
                {JSON.stringify(event.input, null, 2)}
              </pre>
            </div>
          )}
          {content && (
            <div>
              <p className="gba:text-xs gba:font-semibold gba:text-muted-foreground gba:uppercase gba:tracking-wide gba:mb-1">
                {'output' in event && event.output ? 'Output' : 'Content'}
              </p>
              <p className="gba:text-sm gba:text-foreground gba:whitespace-pre-wrap gba:max-h-48 gba:overflow-y-auto">
                {content}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const TracePanel = ({ trace, events, sessionId, isConnected }: TracePanelProps) => {
  // Merge live SSE events with the REST-loaded trace, deduping by event_id / seq
  const mergedEvents: (AgentStreamEvent | TraceEvent)[] = (() => {
    if (events && events.length > 0) return events
    return trace ?? []
  })()

  const handleExport = () => {
    const json = JSON.stringify(mergedEvents, null, 2)
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
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2.5 gba:border-b gba:border-border gba:shrink-0">
        <GitBranch className="gba:h-4 gba:w-4 gba:text-muted-foreground" />
        <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:uppercase gba:tracking-wide">Trace</span>
        <span className="gba:text-xs gba:text-muted-foreground gba:ml-1">({mergedEvents.length} events)</span>

        {isConnected !== undefined && (
          <span className="gba:inline-flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground gba:ml-auto">
            {isConnected ? (
              <>
                <WifiHigh className="gba:h-3 gba:w-3 gba:text-green-500" />
                <span className="gba:text-green-600">Live</span>
              </>
            ) : (
              <>
                <WifiX className="gba:h-3 gba:w-3 gba:text-muted-foreground/50" />
                <span>Offline</span>
              </>
            )}
          </span>
        )}

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
        {mergedEvents.length === 0 ? (
          <div className="gba:flex gba:items-center gba:justify-center gba:h-full">
            <p className="gba:text-xs gba:text-muted-foreground">No trace available yet</p>
          </div>
        ) : (
          <div className="gba:space-y-1.5">
            {mergedEvents.map((event, idx) => (
              <TraceRow key={'event_id' in event ? event.event_id : `trace-${idx}`} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
