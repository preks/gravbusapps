import { useCallback, useEffect, useRef } from 'react'
import { Badge } from '@newwork/nw-design-system'
import { CheckCircle2, Loader2, XCircle, ArrowRight, MessageSquare, Brain } from 'lucide-react'
import { MarkdownWithChipsRenderer } from '@/common/components/markdown/MarkdownWithChipsRenderer'

export interface CommEvent {
  id: string
  type: 'dispatch' | 'response' | 'thinking'
  fromAgent: string
  toAgent: string
  query?: string
  response?: string
  status: 'pending' | 'running' | 'success' | 'error'
  durationMs?: number
  timestamp: number
}

interface AgentCommFeedProps {
  events: CommEvent[]
  isExecuting: boolean
}

const AGENT_COLORS: Record<string, string> = {}
const COLOR_POOL = [
  { bg: 'gba:bg-primary', text: 'gba:text-primary-foreground', ring: 'gba:ring-primary/30' },
  { bg: 'gba:bg-info', text: 'gba:text-info-foreground', ring: 'gba:ring-info/30' },
  { bg: 'gba:bg-success', text: 'gba:text-success-foreground', ring: 'gba:ring-success/30' },
  { bg: 'gba:bg-warning', text: 'gba:text-warning-foreground', ring: 'gba:ring-warning/30' }
]
let colorIdx = 0

const getAgentColor = (name: string) => {
  if (!AGENT_COLORS[name]) {
    AGENT_COLORS[name] = String(colorIdx)
    colorIdx = (colorIdx + 1) % COLOR_POOL.length
  }
  return COLOR_POOL[Number(AGENT_COLORS[name])]
}

const getInitials = (name: string) => {
  return (
    name
      .split(/[\s_-]+/)
      .filter(w => w.length > 0 && w[0] === w[0].toUpperCase())
      .map(w => w[0])
      .join('')
      .slice(0, 2) || name.slice(0, 2).toUpperCase()
  )
}

const formatDuration = (ms: number) => (ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`)

const AgentAvatar = ({ name }: { name: string }) => {
  const color = getAgentColor(name)
  return (
    <div
      className={`gba:w-8 gba:h-8 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:text-xs gba:font-bold gba:flex-shrink-0 gba:ring-2 ${color.bg} ${color.text} ${color.ring}`}
      title={name}
    >
      {getInitials(name)}
    </div>
  )
}

const DecisionCard = ({ event, index }: { event: CommEvent; index: number }) => {
  return (
    <div
      className="gba:relative gba:pl-4"
      style={{ animation: `fadeInUp 0.4s ease-out ${Math.min(index * 80, 400)}ms both` }}
      data-testid={`comm-decision-${event.id}`}
    >
      <div className="gba:absolute gba:left-[19px] gba:top-0 gba:bottom-0 gba:w-px gba:bg-border" />
      <div className="gba:relative gba:flex gba:gap-3 gba:pb-5">
        <div className="gba:relative gba:z-10 gba:flex-shrink-0">
          <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-accent gba:ring-4 gba:ring-accent/20 gba:mt-2" />
        </div>
        <div className="gba:flex-1 gba:rounded-xl gba:border gba:border-accent/40 gba:bg-accent/5 gba:p-3">
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <Brain className="gba:w-4 gba:h-4 gba:text-accent-foreground" />
            <span className="gba:text-xs gba:font-semibold gba:text-foreground">{event.fromAgent}</span>
            <Badge variant="secondary" className="gba:text-xs">
              Decision
            </Badge>
          </div>
          {event.query && (
            <div className="gba:rounded-lg gba:bg-muted/50 gba:p-2.5 gba:mb-2">
              <p className="gba:text-xs gba:text-foreground gba:leading-relaxed gba:font-medium">{event.query}</p>
            </div>
          )}
          {event.response && (
            <div className="gba:text-xs gba:text-muted-foreground gba:leading-relaxed gba:pl-1">{event.response}</div>
          )}
        </div>
      </div>
    </div>
  )
}

const CommEventCard = ({ event, index }: { event: CommEvent; index: number }) => {
  const isRunning = event.status === 'running'
  const isSuccess = event.status === 'success'
  const isError = event.status === 'error'

  return (
    <div
      className="gba:relative gba:pl-4"
      style={{ animation: `fadeInUp 0.4s ease-out ${Math.min(index * 80, 400)}ms both` }}
      data-testid={`comm-event-${event.id}`}
    >
      {/* Connecting line */}
      <div className="gba:absolute gba:left-[19px] gba:top-0 gba:bottom-0 gba:w-px gba:bg-border" />

      <div className="gba:relative gba:flex gba:gap-3 gba:pb-5">
        {/* Timeline node */}
        <div className="gba:relative gba:z-10 gba:flex-shrink-0">
          {isRunning ? (
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-primary gba:ring-4 gba:ring-primary/20 gba:animate-pulse gba:mt-2" />
          ) : isSuccess ? (
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-success gba:ring-4 gba:ring-success/10 gba:mt-2" />
          ) : isError ? (
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-destructive gba:ring-4 gba:ring-destructive/10 gba:mt-2" />
          ) : (
            <div className="gba:w-3 gba:h-3 gba:rounded-full gba:bg-muted-foreground/30 gba:mt-2" />
          )}
        </div>

        {/* Content card */}
        <div
          className={`gba:flex-1 gba:rounded-xl gba:border gba:p-3 gba:transition-all gba:duration-300 ${
            isRunning
              ? 'gba:border-primary/40 gba:bg-primary/5'
              : isSuccess
                ? 'gba:border-border gba:bg-card'
                : isError
                  ? 'gba:border-destructive/30 gba:bg-destructive/5'
                  : 'gba:border-border gba:bg-muted/30'
          }`}
        >
          {/* Agent header */}
          <div className="gba:flex gba:items-center gba:gap-2 gba:mb-2">
            <AgentAvatar name={event.fromAgent} />
            <ArrowRight className="gba:w-3 gba:h-3 gba:text-muted-foreground gba:flex-shrink-0" />
            <AgentAvatar name={event.toAgent} />
            <div className="gba:flex-1 gba:min-w-0">
              <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-wrap">
                <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:truncate">
                  {event.fromAgent}
                </span>
                <ArrowRight className="gba:w-2.5 gba:h-2.5 gba:text-muted-foreground" />
                <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:truncate">{event.toAgent}</span>
              </div>
            </div>
            <div className="gba:flex gba:items-center gba:gap-1.5 gba:flex-shrink-0">
              {isRunning && (
                <Badge variant="info" className="gba:text-xs gba:gap-1">
                  <Loader2 className="gba:w-3 gba:h-3 gba:animate-spin" />
                  working
                </Badge>
              )}
              {isSuccess && event.durationMs !== undefined && (
                <Badge variant="success" className="gba:text-xs">
                  {formatDuration(event.durationMs)}
                </Badge>
              )}
              {isError && (
                <Badge variant="destructive" className="gba:text-xs">
                  failed
                </Badge>
              )}
            </div>
          </div>

          {/* Query */}
          {event.query && (
            <div className="gba:rounded-lg gba:bg-muted/50 gba:p-2.5 gba:mb-2">
              <div className="gba:flex gba:items-start gba:gap-2">
                <MessageSquare className="gba:w-3 gba:h-3 gba:text-primary gba:mt-0.5 gba:flex-shrink-0" />
                <p className="gba:text-xs gba:text-foreground gba:leading-relaxed">{event.query}</p>
              </div>
            </div>
          )}

          {/* Response */}
          {isRunning && !event.response && (
            <div className="gba:flex gba:items-center gba:gap-2 gba:px-2">
              <div className="gba:flex gba:gap-1">
                <div
                  className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <div
                  className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <div
                  className="gba:w-1.5 gba:h-1.5 gba:rounded-full gba:bg-primary gba:animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
              <span className="gba:text-xs gba:text-muted-foreground">Agent is thinking...</span>
            </div>
          )}

          {event.response && (
            <div
              className={`gba:rounded-lg gba:p-2.5 gba:border ${
                isSuccess ? 'gba:bg-success/5 gba:border-success/20' : 'gba:bg-destructive/5 gba:border-destructive/20'
              }`}
            >
              <div className="gba:flex gba:items-start gba:gap-2">
                {isSuccess ? (
                  <CheckCircle2 className="gba:w-3 gba:h-3 gba:text-success gba:mt-0.5 gba:flex-shrink-0" />
                ) : (
                  <XCircle className="gba:w-3 gba:h-3 gba:text-destructive gba:mt-0.5 gba:flex-shrink-0" />
                )}
                <div className="gba:text-xs gba:text-foreground gba:leading-relaxed gba:flex-1 gba:min-w-0">
                  <MarkdownWithChipsRenderer content={event.response} variant="chat" />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export const AgentCommFeed = ({ events, isExecuting }: AgentCommFeedProps) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)
  const prevEventCountRef = useRef(0)

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    userScrolledUpRef.current = distanceFromBottom > 80
  }, [])

  // Reset scroll lock when a new execution starts (events wiped back to 0)
  useEffect(() => {
    if (events.length === 0) {
      userScrolledUpRef.current = false
      prevEventCountRef.current = 0
    }
  }, [events.length])

  // Auto-scroll only when user hasn't manually scrolled up
  useEffect(() => {
    if (events.length > prevEventCountRef.current && !userScrolledUpRef.current) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    }
    prevEventCountRef.current = events.length
  }, [events])

  const hasEvents = events.length > 0

  return (
    <div className="gba:flex gba:flex-col gba:h-full gba:bg-background" data-testid="agent-comm-feed">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="gba:flex-1 gba:overflow-y-auto gba:p-4"
        data-testid="agent-comm-feed-content"
      >
        {!hasEvents && !isExecuting && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:text-muted-foreground gba:gap-3">
            <MessageSquare className="gba:w-10 gba:h-10 gba:opacity-30" />
            <p className="gba:text-sm gba:text-center">Ask a question to see agents communicate in real-time</p>
          </div>
        )}

        {isExecuting && !hasEvents && (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:h-full gba:gap-3">
            <Loader2 className="gba:w-8 gba:h-8 gba:animate-spin gba:text-primary" />
            <p className="gba:text-sm gba:text-muted-foreground gba:text-center">
              Steering Agent is analyzing your question and routing to division experts...
            </p>
          </div>
        )}

        {hasEvents && (
          <div className="gba:relative">
            {events.map((event, idx) =>
              event.type === 'thinking' ? (
                <DecisionCard key={event.id} event={event} index={idx} />
              ) : (
                <CommEventCard key={event.id} event={event} index={idx} />
              )
            )}

            {/* Completion summary */}
            {!isExecuting && events.length > 0 && (
              <div
                className="gba:flex gba:items-center gba:gap-2 gba:pl-8 gba:pt-2"
                style={{ animation: 'fadeInUp 0.4s ease-out 200ms both' }}
              >
                <CheckCircle2 className="gba:w-4 gba:h-4 gba:text-success" />
                <span className="gba:text-xs gba:text-muted-foreground">
                  All {events.filter(e => e.status === 'success' && e.type !== 'thinking').length} agents responded
                  {' \u2022 '}
                  Total: {formatDuration(events.reduce((sum, e) => sum + (e.durationMs || 0), 0))}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
