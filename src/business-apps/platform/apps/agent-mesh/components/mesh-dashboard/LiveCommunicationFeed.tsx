import { useState, useRef, useEffect, useMemo } from 'react'
import { Badge, Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@newwork/nw-design-system'
import type { ExecutionListItem } from '../../types/agentMesh'

interface LiveCommunicationFeedProps {
  executions: ExecutionListItem[]
  onTraceClick: (correlationId: string) => void
}

export const LiveCommunicationFeed = ({ executions, onTraceClick }: LiveCommunicationFeedProps) => {
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const [filterAgent, setFilterAgent] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [executions, isAutoScroll])

  const agentNames = useMemo(() => {
    const names = new Set<string>()
    executions.forEach(e => {
      if (e.caller_name) names.add(e.caller_name)
      if (e.prompt_name) names.add(e.prompt_name)
    })
    return Array.from(names).sort()
  }, [executions])

  const statuses = useMemo(() => {
    const s = new Set<string>()
    executions.forEach(e => s.add(e.status))
    return Array.from(s).sort()
  }, [executions])

  const filteredExecutions = executions.filter(exec => {
    if (filterAgent !== 'all') {
      const matchesCaller = exec.caller_name?.toLowerCase() === filterAgent.toLowerCase()
      const matchesCallee = exec.prompt_name?.toLowerCase() === filterAgent.toLowerCase()
      if (!matchesCaller && !matchesCallee) return false
    }
    if (filterStatus !== 'all' && exec.status !== filterStatus) return false
    return true
  })

  const getStatusVariant = (status: string): 'success' | 'destructive' | 'warning' | 'info' => {
    switch (status.toLowerCase()) {
      case 'success':
        return 'success'
      case 'error':
        return 'destructive'
      case 'timeout':
        return 'warning'
      default:
        return 'info'
    }
  }

  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const formatTime = (ts: string | null): string => {
    if (!ts) return ''
    try {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    } catch {
      return ''
    }
  }

  return (
    <div className="gba:flex gba:flex-col gba:h-full" data-testid="live-communication-feed">
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:px-4 gba:py-2.5 gba:border-b gba:border-border gba:shrink-0">
        <div className="gba:flex gba:items-center gba:gap-2">
          <span className="gba:text-sm gba:font-semibold gba:text-foreground">Live Feed</span>
          {filteredExecutions.length > 0 && (
            <Badge variant="secondary" className="gba:text-[10px]" data-testid="live-feed-count">
              {filteredExecutions.length}
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsAutoScroll(!isAutoScroll)}
          data-testid="live-feed-toggle-scroll"
        >
          {isAutoScroll ? 'Pause' : 'Resume'}
        </Button>
      </div>

      {/* Filters */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:px-4 gba:py-2 gba:border-b gba:border-border gba:shrink-0">
        <Select value={filterAgent} onValueChange={setFilterAgent}>
          <SelectTrigger className="gba:flex-1 gba:h-8 gba:text-xs" data-testid="live-feed-filter-agent">
            <SelectValue placeholder="Agent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Agents</SelectItem>
            {agentNames.map(name => (
              <SelectItem key={name} value={name}>
                {name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="gba:w-[100px] gba:h-8 gba:text-xs" data-testid="live-feed-filter-status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            {statuses.map(s => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Execution list - vertical card layout for narrow panel */}
      <div ref={scrollRef} className="gba:flex-1 gba:overflow-y-auto">
        {filteredExecutions.length === 0 ? (
          <div className="gba:p-4 gba:text-sm gba:text-muted-foreground gba:text-center" data-testid="live-feed-empty">
            No executions found
          </div>
        ) : (
          <div className="gba:divide-y gba:divide-border">
            {filteredExecutions.map(exec => (
              <div
                key={exec.execution_id}
                className="gba:px-4 gba:py-3 gba:hover:bg-muted/50 gba:cursor-pointer gba:transition-colors"
                onClick={() => onTraceClick(exec.correlation_id)}
                data-testid={`live-feed-execution-${exec.execution_id}`}
              >
                {/* Row 1: Caller → Callee + status */}
                <div className="gba:flex gba:items-center gba:justify-between gba:gap-2">
                  <div className="gba:flex gba:items-center gba:gap-1.5 gba:min-w-0 gba:flex-1">
                    <span className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate">
                      {exec.caller_name || 'User'}
                    </span>
                    <span className="gba:text-xs gba:text-muted-foreground gba:shrink-0">→</span>
                    <span className="gba:text-xs gba:font-medium gba:text-foreground gba:truncate">
                      {exec.prompt_name}
                    </span>
                  </div>
                  <Badge variant={getStatusVariant(exec.status)} className="gba:text-[10px] gba:shrink-0">
                    {exec.status}
                  </Badge>
                </div>

                {/* Row 2: Preview text */}
                {(exec.input_preview || exec.output_preview) && (
                  <p className="gba:text-xs gba:text-muted-foreground gba:truncate gba:mt-1">
                    {exec.input_preview || exec.output_preview}
                  </p>
                )}

                {/* Row 3: Timestamp + Duration */}
                <div className="gba:flex gba:items-center gba:gap-3 gba:mt-1.5">
                  <span className="gba:text-[10px] gba:text-muted-foreground">{formatTime(exec.created_at)}</span>
                  {exec.duration_ms > 0 && (
                    <span className="gba:text-[10px] gba:text-muted-foreground">
                      {formatDuration(exec.duration_ms)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
