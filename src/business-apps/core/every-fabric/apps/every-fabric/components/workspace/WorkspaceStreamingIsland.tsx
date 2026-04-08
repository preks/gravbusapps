import { Brain, CaretDown, CaretUp, WifiHigh, WifiX } from '@phosphor-icons/react'
import type { FC } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage } from '../../types/enterpriseAgent'

const THINKING_TAIL = 16

const toEpoch = (ts: string): number => {
  const n = Date.parse(ts)
  return Number.isNaN(n) ? 0 : n
}

interface WorkspaceStreamingIslandProps {
  sessionId: string
  messages: ChatMessage[]
  /** One line for current plan step / progress (Progress rail remains canonical for full list) */
  statusHeadline: string | null
  completedCount: number
  totalCount: number
  progressPercent: number
  isConnected: boolean
  isStreaming: boolean
}

export const WorkspaceStreamingIsland: FC<WorkspaceStreamingIslandProps> = ({
  sessionId,
  messages,
  statusHeadline,
  completedCount,
  totalCount,
  progressPercent,
  isConnected,
  isStreaming
}) => {
  const [expanded, setExpanded] = useState(true)
  const thinkingScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setExpanded(true)
  }, [sessionId])

  const thinkingText = useMemo(() => {
    const chunks = messages
      .filter(
        (m): m is ChatMessage & { content: string } => m.type === 'agent_thinking' && typeof m.content === 'string'
      )
      .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))
      .slice(-THINKING_TAIL)
      .map(m => m.content.trim())
      .filter(Boolean)
    return chunks.join('\n\n')
  }, [messages])

  const displayPercent = isStreaming && totalCount > 0 && completedCount >= totalCount ? 96 : progressPercent
  const progressLabel =
    totalCount === 0
      ? 'Starting…'
      : isStreaming && completedCount < totalCount
        ? `${completedCount} of ${totalCount} done`
        : isStreaming && completedCount >= totalCount
          ? 'Finalizing…'
          : `${completedCount} of ${totalCount} done`

  const collapsedSummary =
    statusHeadline ??
    (thinkingText ? `${thinkingText.slice(0, 72)}${thinkingText.length > 72 ? '…' : ''}` : null) ??
    'Agent is working…'

  useLayoutEffect(() => {
    const el = thinkingScrollRef.current
    if (!el || !thinkingText) return
    el.scrollTop = el.scrollHeight
  }, [thinkingText])

  if (!isStreaming) return null

  if (!expanded) {
    return (
      <div className="gba:pointer-events-auto" data-testid="fabric-workspace-streaming-island">
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="gba:flex gba:w-full gba:max-w-full gba:items-center gba:gap-2.5 gba:rounded-full gba:border gba:border-border/70 gba:bg-background/94 gba:px-3 gba:py-2 gba:text-left gba:text-xs gba:text-muted-foreground gba:backdrop-blur-md gba:shadow-[0_6px_18px_rgba(15,23,42,0.05)] gba:transition-colors gba:hover:bg-background"
          data-testid="fabric-streaming-island-expand"
          aria-expanded={false}
        >
          <span className="gba:inline-flex gba:gap-1 gba:rounded-full gba:bg-muted gba:px-2 gba:py-1 gba:shrink-0">
            <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-muted-foreground/60 gba:animate-pulse" />
            <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-muted-foreground/45 gba:animate-pulse" />
            <span className="gba:h-1.5 gba:w-1.5 gba:rounded-full gba:bg-muted-foreground/30 gba:animate-pulse" />
          </span>
          <span className="gba:min-w-0 gba:flex-1 gba:truncate">{collapsedSummary}</span>
          <CaretDown className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground/70" aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <div
      className="gba:pointer-events-auto gba:max-h-52 gba:min-h-0 gba:overflow-hidden gba:rounded-[1.25rem] gba:border gba:border-border/80 gba:bg-background/96 gba:shadow-[0_10px_26px_rgba(15,23,42,0.05)]"
      data-testid="fabric-workspace-streaming-island"
    >
      <div className="gba:flex gba:min-h-0 gba:items-center gba:gap-2 gba:border-b gba:border-border/50 gba:px-3 gba:py-2 sm:gba:px-3.5">
        <Brain className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
        <div className="gba:min-w-0 gba:flex-1">
          <div className="gba:flex gba:flex-wrap gba:items-center gba:gap-x-2 gba:gap-y-0.5">
            <span className="gba:text-[10px] gba:font-semibold gba:uppercase gba:tracking-wide gba:text-muted-foreground">
              Agent activity
            </span>
            {totalCount > 0 && (
              <span className="gba:text-[11px] gba:text-muted-foreground/80">
                {progressLabel} · {displayPercent}%
              </span>
            )}
          </div>
          {totalCount > 0 && (
            <div className="gba:mt-1 gba:h-1 gba:w-full gba:max-w-xs gba:rounded-full gba:bg-border gba:overflow-hidden">
              <div
                className="gba:h-full gba:rounded-full gba:bg-primary gba:transition-all gba:duration-500"
                style={{ width: `${displayPercent}%` }}
              />
            </div>
          )}
          {statusHeadline ? (
            <p
              className="gba:mt-1.5 gba:text-xs gba:leading-snug gba:text-foreground/90 gba:line-clamp-2"
              data-testid="fabric-streaming-island-status-headline"
            >
              {statusHeadline}
            </p>
          ) : null}
        </div>
        <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-1 gba:border-l gba:border-border/40 gba:pl-2">
          {isConnected ? (
            <>
              <WifiHigh className="gba:h-3 gba:w-3 gba:text-green-500" />
              <span className="gba:hidden sm:gba:inline gba:text-[11px] gba:text-green-600 gba:font-medium">Live</span>
            </>
          ) : (
            <WifiX className="gba:h-3 gba:w-3 gba:text-muted-foreground/40" />
          )}
        </div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="gba:inline-flex gba:shrink-0 gba:items-center gba:justify-center gba:h-8 gba:w-8 gba:rounded-full gba:text-muted-foreground gba:hover:bg-muted/50 gba:transition-colors"
          aria-expanded={true}
          aria-label="Collapse agent activity"
          data-testid="fabric-streaming-island-collapse"
        >
          <CaretUp className="gba:h-4 gba:w-4" />
        </button>
      </div>

      <div
        ref={thinkingScrollRef}
        className="gba:max-h-36 gba:min-h-0 gba:overflow-y-auto gba:px-3 gba:py-2.5 sm:gba:px-3.5"
        data-testid="fabric-streaming-island-thinking"
      >
        {thinkingText ? (
          <p className="gba:whitespace-pre-wrap gba:break-words gba:text-xs gba:leading-relaxed gba:text-muted-foreground">
            {thinkingText}
          </p>
        ) : (
          <p className="gba:text-xs gba:italic gba:text-muted-foreground/60">Waiting for model output…</p>
        )}
      </div>
    </div>
  )
}
