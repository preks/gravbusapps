import { BrainIcon, CaretDownIcon, CaretUpIcon, WifiHighIcon, WifiXIcon } from '@phosphor-icons/react'
import type { FC } from 'react'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { ChatMessage } from '../../types/enterpriseAgent'
import { StreamingPreviewBubble } from '../chat/StreamingPreviewBubble'

const THINKING_TAIL = 16
const FADE_OUT_DURATION_MS = 300

const toEpoch = (ts: string): number => {
  const n = Date.parse(ts)
  return Number.isNaN(n) ? 0 : n
}

function streamingProgressLabel(totalCount: number, completedCount: number, isStreaming: boolean): string {
  if (totalCount === 0) return 'Starting…'
  if (isStreaming && completedCount < totalCount) return `${completedCount} of ${totalCount} done`
  if (isStreaming && completedCount >= totalCount) return 'Finalizing…'
  return `${completedCount} of ${totalCount} done`
}

function collapsedStreamingSummary(statusHeadline: string | null, thinkingText: string): string {
  if (statusHeadline) return statusHeadline
  if (!thinkingText) return 'Agent is working…'

  const preview = thinkingText.slice(0, 72)
  return thinkingText.length > 72 ? `${preview}…` : preview
}

interface WorkspaceStreamingIslandProps {
  sessionId: string
  messages: ChatMessage[]
  /** One line for current plan step / progress (Progress rail remains canonical for full list) */
  statusHeadline: string | null
  /**
   * Recent agent activity lines (oldest first, newest last) — derived from
   * real-time status / live_status / step_started events. Feeds the flowing
   * StreamingPreviewBubble inside the island so the user sees more context
   * than the single status pill above.
   */
  activityLines?: readonly string[]
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
  activityLines,
  completedCount,
  totalCount,
  progressPercent,
  isConnected,
  isStreaming
}) => {
  // Collapsed by default — the island shows a single thin pill above the
  // composer with the current status, and the user can click it open if they
  // want to see the thinking stream. Reset to collapsed whenever the active
  // session changes so a new chat never starts expanded.
  const [expanded, setExpanded] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [isFadingOut, setIsFadingOut] = useState(false)
  const thinkingScrollRef = useRef<HTMLDivElement>(null)
  const fadeOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const wasStreamingRef = useRef(isStreaming)

  useEffect(() => {
    setExpanded(false)
  }, [sessionId])

  useEffect(() => {
    const wasStreaming = wasStreamingRef.current
    wasStreamingRef.current = isStreaming

    if (isStreaming) {
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current)
        fadeOutTimerRef.current = null
      }
      setIsFadingOut(false)
      setIsVisible(true)
      return
    }

    if (wasStreaming && isVisible) {
      setIsFadingOut(true)
      fadeOutTimerRef.current = setTimeout(() => {
        setIsVisible(false)
        setIsFadingOut(false)
        fadeOutTimerRef.current = null
      }, FADE_OUT_DURATION_MS)
    }

    return () => {
      if (fadeOutTimerRef.current) {
        clearTimeout(fadeOutTimerRef.current)
        fadeOutTimerRef.current = null
      }
    }
  }, [isStreaming, isVisible])

  const thinkingText = useMemo(() => {
    const chunks = messages
      .filter(
        (m): m is ChatMessage & { content: string } =>
          m.type === 'agent_thinking' && typeof m.content === 'string' && !m.content.startsWith('🔄') // Exclude status updates
      )
      .sort((a, b) => toEpoch(a.timestamp) - toEpoch(b.timestamp))
      .slice(-THINKING_TAIL)
      .map(m => m.content.trim())
      .filter(Boolean)
    return chunks.join('\n\n')
  }, [messages])

  const displayPercent = isStreaming && totalCount > 0 && completedCount >= totalCount ? 96 : progressPercent
  const progressLabel = streamingProgressLabel(totalCount, completedCount, isStreaming)

  const collapsedSummary = collapsedStreamingSummary(statusHeadline, thinkingText)

  useLayoutEffect(() => {
    const el = thinkingScrollRef.current
    if (!el || !thinkingText) return
    el.scrollTop = el.scrollHeight
  }, [thinkingText])

  if (!isVisible) return null

  const fadeClass = isFadingOut
    ? 'gba:animate-out gba:fade-out gba:slide-out-to-bottom-2 gba:duration-300'
    : 'gba:animate-in gba:fade-in gba:slide-in-from-bottom-2 gba:duration-200'

  if (!expanded) {
    return (
      <div className={`gba:pointer-events-auto ${fadeClass}`} data-testid="fabric-workspace-streaming-island">
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
          <CaretDownIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground/70" aria-hidden />
        </button>
      </div>
    )
  }

  return (
    <div
      className={`gba:pointer-events-auto gba:max-h-52 gba:min-h-0 gba:overflow-hidden gba:rounded-[1.25rem] gba:border gba:border-border/80 gba:bg-background/96 gba:shadow-[0_10px_26px_rgba(15,23,42,0.05)] ${fadeClass}`}
      data-testid="fabric-workspace-streaming-island"
    >
      <div className="gba:flex gba:min-h-0 gba:items-center gba:gap-2 gba:border-b gba:border-border/50 gba:px-3 gba:py-2 sm:gba:px-3.5">
        <BrainIcon className="gba:h-4 gba:w-4 gba:shrink-0 gba:text-muted-foreground" />
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
              className="gba:mt-1.5 gba:text-xs gba:leading-snug gba:text-foreground/90 gba:line-clamp-2 gba:animate-in gba:fade-in gba:duration-200"
              data-testid="fabric-streaming-island-status-headline"
            >
              {statusHeadline}
            </p>
          ) : null}
          <StreamingPreviewBubble activityLines={activityLines ?? []} isStreaming={isStreaming} variant="compact" />
        </div>
        <div className="gba:flex gba:shrink-0 gba:items-center gba:gap-1 gba:border-l gba:border-border/40 gba:pl-2">
          {isConnected ? (
            <>
              <WifiHighIcon className="gba:h-3 gba:w-3 gba:text-green-500" />
              <span className="gba:hidden sm:gba:inline gba:text-[11px] gba:text-green-600 gba:font-medium">Live</span>
            </>
          ) : (
            <WifiXIcon className="gba:h-3 gba:w-3 gba:text-muted-foreground/40" />
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
          <CaretUpIcon className="gba:h-4 gba:w-4" />
        </button>
      </div>

      <div
        ref={thinkingScrollRef}
        className="gba:max-h-36 gba:min-h-0 gba:overflow-y-auto gba:px-3 gba:py-2.5 sm:gba:px-3.5"
        data-testid="fabric-streaming-island-thinking"
      >
        {thinkingText ? (
          <p className="gba:whitespace-pre-wrap gba:wrap-break-word gba:text-xs gba:leading-relaxed gba:text-muted-foreground">
            {thinkingText}
          </p>
        ) : (
          <p className="gba:text-xs gba:italic gba:text-muted-foreground/60">Waiting for model output…</p>
        )}
      </div>
    </div>
  )
}
