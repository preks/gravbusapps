import type { FC } from 'react'
import { useEffect, useRef, useState } from 'react'

interface StreamingPreviewBubbleProps {
  /**
   * Recent activity lines (oldest first, newest last). Driven by
   * `agentActivityLines` in `useAgentSession` and refreshed every time a
   * `status` / `live_status` / `step_started` / `decision` event arrives for
   * the current turn. Empty array hides the ticker after the exit animation.
   */
  activityLines: readonly string[] | null | undefined
  /** Whether the agent is still running. Auto-hides when the turn ends. */
  isStreaming: boolean
  /** Optional density variant. `compact` is used inside WorkspaceStreamingIsland. */
  variant?: 'default' | 'compact'
}

const EXIT_DELAY_MS = 280
const MAX_VISIBLE_LINES = 3

/**
 * Flowing "what the agent is doing right now" ticker.
 *
 * Renders the most recent 1-3 real-time activity lines as plain italic gray
 * text — no border, no card, no background — with a soft mask gradient at the
 * top so older lines fade away as newer ones slide in from below. The data
 * source is the live signals the backend already emits (tool calls, status
 * milestones, expert delegations, decisions), so the ticker mirrors exactly
 * what the spinner status pill is showing while adding the previous one or
 * two lines for context.
 */
export const StreamingPreviewBubble: FC<StreamingPreviewBubbleProps> = ({
  activityLines,
  isStreaming,
  variant = 'default'
}) => {
  const lines = (activityLines ?? []).slice(-MAX_VISIBLE_LINES)
  const hasLines = lines.length > 0 && isStreaming

  const [isMounted, setIsMounted] = useState(hasLines)
  const [isLeaving, setIsLeaving] = useState(false)
  const lastLinesRef = useRef<readonly string[]>([])

  useEffect(() => {
    if (hasLines) {
      lastLinesRef.current = lines
      setIsMounted(true)
      setIsLeaving(false)
      return
    }
    if (!isMounted) return
    setIsLeaving(true)
    const t = setTimeout(() => {
      setIsMounted(false)
      setIsLeaving(false)
    }, EXIT_DELAY_MS)
    return () => clearTimeout(t)
  }, [hasLines, lines, isMounted])

  if (!isMounted) return null

  const displayLines = hasLines ? lines : lastLinesRef.current
  if (displayLines.length === 0) return null

  const isCompact = variant === 'compact'
  const textSize = isCompact ? 'gba:text-[11px]' : 'gba:text-xs'
  const lineSpacing = isCompact ? 'gba:py-px' : 'gba:py-0.5'
  const containerSpacing = isCompact ? 'gba:mt-1' : 'gba:mt-2'

  // Slightly different opacity per line so the older ones feel like they're
  // fading upward. The newest line (last in the array) is the most prominent.
  const opacityFor = (idx: number, total: number): number => {
    if (total === 1) return 0.85
    const distanceFromNewest = total - 1 - idx
    if (distanceFromNewest === 0) return 0.9
    if (distanceFromNewest === 1) return 0.55
    return 0.3
  }

  return (
    <div
      data-testid="agent-streaming-preview"
      className={`gba:relative gba:overflow-hidden ${containerSpacing}`}
      style={{
        opacity: isLeaving ? 0 : 1,
        transform: isLeaving ? 'translateY(-4px)' : 'translateY(0)',
        transition: 'opacity 220ms ease-out, transform 220ms ease-out',
        maskImage: 'linear-gradient(to bottom, transparent 0%, black 35%, black 100%)'
      }}
    >
      <div className="gba:flex gba:flex-col">
        {displayLines.map((line, idx) => (
          <p
            key={`${idx}-${line}`}
            className={`${textSize} ${lineSpacing} gba:leading-snug gba:text-muted-foreground gba:italic gba:animate-in gba:fade-in gba:slide-in-from-bottom-1 gba:duration-300`}
            style={{ opacity: opacityFor(idx, displayLines.length) }}
          >
            {line}
            {hasLines && idx === displayLines.length - 1 ? (
              <span
                aria-hidden
                className="gba:inline-block gba:ml-1.5 gba:w-1 gba:h-1 gba:rounded-full gba:bg-muted-foreground/60 gba:animate-pulse gba:align-middle"
              />
            ) : null}
          </p>
        ))}
      </div>
    </div>
  )
}
