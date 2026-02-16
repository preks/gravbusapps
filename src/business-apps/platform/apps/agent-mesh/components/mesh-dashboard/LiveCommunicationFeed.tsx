import { useState, useRef, useEffect } from 'react'
import { Badge, Button, Input, Avatar, AvatarFallback, AvatarImage } from '@newwork/nw-design-system'
import type { ExecutionListItem } from '../../types/agentMesh'
import type { UserInfoProps } from '@/common/BusinessAppContext'

interface LiveCommunicationFeedProps {
  executions: ExecutionListItem[]
  userInfo?: UserInfoProps
  userAvatarUrl?: string | null
  onTraceClick: (correlationId: string) => void
}

export const LiveCommunicationFeed = ({
  executions,
  userInfo,
  userAvatarUrl,
  onTraceClick
}: LiveCommunicationFeedProps) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const [isAutoScroll, setIsAutoScroll] = useState(true)
  const [filterAgent, setFilterAgent] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new executions arrive
  useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [executions, isAutoScroll])

  // Filter executions
  const filteredExecutions = executions.filter(exec => {
    if (filterAgent && exec.caller_name && !exec.caller_name.toLowerCase().includes(filterAgent.toLowerCase())) {
      return false
    }
    if (filterStatus && exec.status !== filterStatus) {
      return false
    }
    return true
  })

  // Get status badge variant
  const getStatusBadgeVariant = (status: string): 'success' | 'destructive' | 'warning' | 'info' => {
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

  // Format duration
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(2)}s`
  }

  // Format timestamp
  const formatTimestamp = (timestamp: string | null): string => {
    if (!timestamp) return 'N/A'
    try {
      const date = new Date(timestamp)
      return date.toLocaleTimeString()
    } catch {
      return 'N/A'
    }
  }

  return (
    <div
      className={`gba:absolute gba:bottom-0 gba:left-0 gba:right-0 gba:bg-card gba:border-t gba:border-border gba:shadow-lg gba:transition-all ${
        isExpanded ? 'gba:h-[400px]' : 'gba:h-[60px]'
      }`}
      data-testid="live-communication-feed"
    >
      {/* Header */}
      <div className="gba:flex gba:items-center gba:justify-between gba:p-3 gba:border-b gba:border-border">
        <div className="gba:flex gba:items-center gba:gap-2">
          <h3 className="gba:text-sm gba:font-semibold gba:text-foreground" data-testid="live-feed-title">
            Live Communication Feed
          </h3>
          {filteredExecutions.length > 0 && (
            <Badge variant="secondary" className="gba:text-xs" data-testid="live-feed-count">
              {filteredExecutions.length}
            </Badge>
          )}
        </div>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsAutoScroll(!isAutoScroll)}
            data-testid="live-feed-toggle-scroll"
          >
            {isAutoScroll ? 'Pause' : 'Resume'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            data-testid="live-feed-toggle-expand"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </Button>
        </div>
      </div>

      {/* Filters */}
      {isExpanded && (
        <div className="gba:flex gba:items-center gba:gap-2 gba:p-3 gba:border-b gba:border-border">
          <Input
            placeholder="Filter by agent..."
            value={filterAgent}
            onChange={e => setFilterAgent(e.target.value)}
            className="gba:flex-1"
            data-testid="live-feed-filter-agent"
          />
          <Input
            placeholder="Filter by status..."
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="gba:flex-1"
            data-testid="live-feed-filter-status"
          />
        </div>
      )}

      {/* Execution List */}
      {isExpanded && (
        <div ref={scrollRef} className="gba:overflow-y-auto gba:h-[calc(400px-120px)]">
          {filteredExecutions.length === 0 ? (
            <div
              className="gba:p-4 gba:text-sm gba:text-muted-foreground gba:text-center"
              data-testid="live-feed-empty"
            >
              No executions found
            </div>
          ) : (
            <div className="gba:divide-y gba:divide-border">
              {filteredExecutions.map(exec => (
                <div
                  key={exec.execution_id}
                  className="gba:p-3 gba:hover:bg-muted/50 gba:cursor-pointer gba:transition-colors"
                  onClick={() => onTraceClick(exec.correlation_id)}
                  data-testid={`live-feed-execution-${exec.execution_id}`}
                >
                  <div className="gba:grid gba:grid-cols-12 gba:gap-2 gba:items-center">
                    {/* Timestamp */}
                    <div
                      className="gba:col-span-2 gba:text-xs gba:text-muted-foreground"
                      data-testid={`live-feed-execution-${exec.execution_id}-timestamp`}
                    >
                      {formatTimestamp(exec.created_at)}
                    </div>

                    {/* Caller */}
                    <div
                      className="gba:col-span-2 gba:flex gba:items-center gba:gap-1.5 gba:text-xs gba:font-medium gba:text-foreground gba:truncate"
                      data-testid={`live-feed-execution-${exec.execution_id}-caller`}
                    >
                      {exec.caller_name ? (
                        exec.caller_name
                      ) : userInfo ? (
                        <>
                          <Avatar className="gba:w-4 gba:h-4 gba:flex-shrink-0">
                            {userAvatarUrl && <AvatarImage src={userAvatarUrl} alt={userInfo.givenName} />}
                            <AvatarFallback className="gba:text-[8px] gba:bg-primary gba:text-primary-foreground">
                              {userInfo.givenName?.[0]}
                              {userInfo.familyName?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <span className="gba:truncate">
                            {userInfo.givenName} {userInfo.familyName}
                          </span>
                        </>
                      ) : (
                        'User'
                      )}
                    </div>

                    {/* Arrow */}
                    <div className="gba:col-span-1 gba:text-xs gba:text-muted-foreground gba:text-center">→</div>

                    {/* Callee (prompt name) */}
                    <div
                      className="gba:col-span-2 gba:text-xs gba:font-medium gba:text-foreground gba:truncate"
                      data-testid={`live-feed-execution-${exec.execution_id}-callee`}
                    >
                      {exec.prompt_name}
                    </div>

                    {/* Message Preview */}
                    <div
                      className="gba:col-span-3 gba:text-xs gba:text-muted-foreground gba:truncate"
                      data-testid={`live-feed-execution-${exec.execution_id}-preview`}
                    >
                      {exec.input_preview || exec.output_preview || 'N/A'}
                    </div>

                    {/* Duration */}
                    <div
                      className="gba:col-span-1 gba:text-xs gba:text-muted-foreground"
                      data-testid={`live-feed-execution-${exec.execution_id}-duration`}
                    >
                      {formatDuration(exec.duration_ms)}
                    </div>

                    {/* Status */}
                    <div className="gba:col-span-1 gba:flex gba:justify-end">
                      <Badge
                        variant={getStatusBadgeVariant(exec.status)}
                        className="gba:text-xs"
                        data-testid={`live-feed-execution-${exec.execution_id}-status`}
                      >
                        {exec.status}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
