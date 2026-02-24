import { useEffect, useRef } from 'react'
import { Badge, Button } from '@newwork/nw-design-system'
import { ChevronUp, ChevronDown, CheckCircle2, Loader2, XCircle, Zap, Clock, Activity, GitBranch } from 'lucide-react'
import type { ExecutionTrace, ExecutionTraceNode } from '../../types/agentMesh'

interface LiveEvent {
  execution_id: string
  prompt_name: string
  status: string
  duration_ms: number
  input_preview?: string
  output_preview?: string
  timestamp: number
}

interface LiveTracePanelProps {
  trace: ExecutionTrace | null
  isExpanded: boolean
  onToggle: () => void
  liveEvents?: LiveEvent[]
  isExecuting?: boolean
}

const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

const LiveEventCard = ({ event, index }: { event: LiveEvent; index: number }) => {
  const isSuccess = event.status === 'success'
  const isRunning = event.status === 'running'

  return (
    <div
      className="gba:flex gba:items-stretch gba:gap-3"
      style={{
        animation: `fadeInUp 0.4s ease-out ${index * 120}ms both`
      }}
      data-testid={`live-event-${event.execution_id}`}
    >
      {/* Timeline dot + line */}
      <div className="gba:flex gba:flex-col gba:items-center gba:gap-0">
        <div
          className={`gba:w-3 gba:h-3 gba:rounded-full gba:flex-shrink-0 gba:ring-2 gba:ring-background ${
            isRunning ? 'gba:bg-primary gba:animate-pulse' : isSuccess ? 'gba:bg-success' : 'gba:bg-destructive'
          }`}
        />
        <div className="gba:w-px gba:flex-1 gba:bg-border gba:min-h-[20px]" />
      </div>

      {/* Event card */}
      <div
        className={`gba:flex-1 gba:rounded-lg gba:border gba:p-3 gba:mb-2 gba:transition-all gba:duration-300 ${
          isRunning
            ? 'gba:border-primary/50 gba:bg-primary/5'
            : isSuccess
              ? 'gba:border-success/30 gba:bg-card'
              : 'gba:border-destructive/30 gba:bg-destructive/5'
        }`}
      >
        <div className="gba:flex gba:items-center gba:justify-between gba:mb-1">
          <div className="gba:flex gba:items-center gba:gap-2">
            {isRunning ? (
              <Loader2 className="gba:w-3.5 gba:h-3.5 gba:animate-spin gba:text-primary" />
            ) : isSuccess ? (
              <CheckCircle2 className="gba:w-3.5 gba:h-3.5 gba:text-success" />
            ) : (
              <XCircle className="gba:w-3.5 gba:h-3.5 gba:text-destructive" />
            )}
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">{event.prompt_name}</span>
            <Badge variant={isRunning ? 'info' : isSuccess ? 'success' : 'destructive'} className="gba:text-xs">
              {isRunning ? 'executing...' : event.status}
            </Badge>
          </div>
          {!isRunning && (
            <div className="gba:flex gba:items-center gba:gap-1 gba:text-xs gba:text-muted-foreground">
              <Clock className="gba:w-3 gba:h-3" />
              {formatDuration(event.duration_ms)}
            </div>
          )}
        </div>

        {event.input_preview && (
          <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:mt-1">
            <span className="gba:text-primary/70 gba:font-medium">Query:</span> {event.input_preview}
          </div>
        )}
        {event.output_preview && !isRunning && (
          <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:mt-0.5">
            <span className="gba:text-success/70 gba:font-medium">Response:</span> {event.output_preview}
          </div>
        )}
      </div>
    </div>
  )
}

const TraceTreeNode = ({
  node,
  level = 0,
  siblingCount = 1,
  siblingIndex = 0
}: {
  node: ExecutionTraceNode
  level?: number
  siblingCount?: number
  siblingIndex?: number
}) => {
  const isSuccess = node.status === 'success'
  const isError = node.status === 'error' || node.status === 'timeout'
  const hasChildren = node.children && node.children.length > 0
  const isParallelSibling = siblingCount > 1
  const isLastSibling = siblingIndex === siblingCount - 1
  const dispatchesInParallel = hasChildren && node.children.length > 1

  return (
    <div className="gba:relative" data-testid={`trace-node-${node.execution_id}`}>
      {/* Node row */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:py-1.5 gba:min-w-0">
        {/* Tree branch glyph for non-root nodes */}
        {level > 0 && (
          <span className="gba:text-xs gba:font-mono gba:text-border gba:flex-shrink-0 gba:select-none">
            {isLastSibling ? '└─' : '├─'}
          </span>
        )}

        {/* Status dot */}
        <div
          className={`gba:w-2 gba:h-2 gba:rounded-full gba:flex-shrink-0 ${
            isSuccess ? 'gba:bg-success' : isError ? 'gba:bg-destructive' : 'gba:bg-primary gba:animate-pulse'
          }`}
        />

        {/* Parallel badge */}
        {isParallelSibling && (
          <span className="gba:text-[9px] gba:font-semibold gba:uppercase gba:tracking-wide gba:px-1.5 gba:py-0.5 gba:rounded gba:bg-info-secondary gba:text-info-secondary-foreground gba:flex-shrink-0">
            parallel
          </span>
        )}

        <span className="gba:text-sm gba:font-medium gba:text-foreground gba:truncate">{node.prompt_name}</span>

        <Badge
          variant={isSuccess ? 'success' : isError ? 'destructive' : 'info'}
          className="gba:text-xs gba:flex-shrink-0"
        >
          {node.status}
        </Badge>

        <span className="gba:text-xs gba:text-muted-foreground gba:flex-shrink-0">
          {formatDuration(node.duration_ms)}
        </span>
      </div>

      {/* Children */}
      {hasChildren && (
        <div className={level === 0 ? 'gba:ml-3' : 'gba:ml-6'}>
          {/* Parallel dispatch label */}
          {dispatchesInParallel && (
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:py-0.5 gba:mb-0.5 gba:pl-1">
              <GitBranch className="gba:w-3 gba:h-3 gba:text-info gba:flex-shrink-0" />
              <span className="gba:text-[10px] gba:font-medium gba:text-info">
                Dispatched {node.children.length} agents in parallel
              </span>
            </div>
          )}

          {/* Child nodes indented under a vertical line */}
          <div className="gba:border-l gba:border-border/60 gba:pl-3">
            {node.children.map((child, idx) => (
              <TraceTreeNode
                key={child.execution_id}
                node={child}
                level={level + 1}
                siblingCount={node.children.length}
                siblingIndex={idx}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export const LiveTracePanel = ({
  trace,
  isExpanded,
  onToggle,
  liveEvents = [],
  isExecuting = false
}: LiveTracePanelProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [liveEvents])

  const hasContent = trace || liveEvents.length > 0 || isExecuting

  return (
    <div className="gba:border-t gba:border-border gba:bg-card gba:flex gba:flex-col" data-testid="live-trace-panel">
      {/* Header - always visible */}
      <div
        className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2 gba:cursor-pointer"
        onClick={onToggle}
        data-testid="live-trace-panel-header"
      >
        <div className="gba:flex gba:items-center gba:gap-3">
          <div className="gba:flex gba:items-center gba:gap-2">
            {isExecuting ? (
              <Activity className="gba:w-4 gba:h-4 gba:text-primary gba:animate-pulse" />
            ) : (
              <Zap className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
            )}
            <span className="gba:text-sm gba:font-semibold gba:text-foreground">Live Trace</span>
          </div>

          {isExecuting && (
            <Badge variant="info" className="gba:text-xs gba:animate-pulse">
              Agents working...
            </Badge>
          )}

          {trace && !isExecuting && (
            <div className="gba:flex gba:items-center gba:gap-3 gba:text-xs gba:text-muted-foreground">
              <Badge variant="secondary" className="gba:text-xs">
                {trace.correlation_id.slice(0, 8)}...
              </Badge>
              <span>{formatDuration(trace.total_duration_ms)}</span>
              <span>{trace.agent_count} agents</span>
              <span>{trace.execution_count} calls</span>
            </div>
          )}

          {liveEvents.length > 0 && isExecuting && (
            <span className="gba:text-xs gba:text-muted-foreground">
              {liveEvents.filter(e => e.status === 'success').length}/{liveEvents.length} agents responded
            </span>
          )}
        </div>

        <Button variant="ghost" size="sm" className="gba:gap-1 gba:h-7" data-testid="live-trace-panel-toggle">
          {isExpanded ? <ChevronDown className="gba:w-4 gba:h-4" /> : <ChevronUp className="gba:w-4 gba:h-4" />}
        </Button>
      </div>

      {/* Content */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="gba:overflow-y-auto gba:max-h-72 gba:border-t gba:border-border"
          data-testid="live-trace-panel-content"
        >
          {/* Live events stream (during execution) */}
          {(isExecuting || (liveEvents.length > 0 && !trace)) && (
            <div className="gba:p-4">
              {liveEvents.length === 0 && isExecuting && (
                <div className="gba:flex gba:items-center gba:gap-3 gba:text-sm gba:text-muted-foreground">
                  <Loader2 className="gba:w-4 gba:h-4 gba:animate-spin gba:text-primary" />
                  <span>Steering agent is analyzing your question and dispatching to division agents...</span>
                </div>
              )}
              {liveEvents.map((event, idx) => (
                <LiveEventCard key={event.execution_id} event={event} index={idx} />
              ))}
            </div>
          )}

          {/* Final trace tree (after execution) */}
          {trace && !isExecuting && (
            <div className="gba:p-4">
              <TraceTreeNode node={trace.tree} />
            </div>
          )}

          {!hasContent && (
            <div className="gba:p-4 gba:text-center gba:text-sm gba:text-muted-foreground">
              Ask a question to see the live agent trace
            </div>
          )}
        </div>
      )}
    </div>
  )
}
