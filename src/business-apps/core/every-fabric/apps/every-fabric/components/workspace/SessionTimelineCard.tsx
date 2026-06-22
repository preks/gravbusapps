import React, { useEffect, useMemo, useRef, type FC } from 'react'
import type { DecisionItem } from '../../hooks/useFabricDecisions'
import type { ActivityEvent } from '../../types/enterpriseAgent'
import { PanelCard } from './PanelCard'
import { formatTimelineClockTime, mergeSessionTimelineEntries } from './sessionTimelineMerge'
import { UnifiedSessionTimeline } from './UnifiedSessionTimeline'

interface SessionTimelineCardProps {
  decisions: DecisionItem[]
  activityEvents: ActivityEvent[]
  isStreaming?: boolean
  defaultCollapsed?: boolean
  /** Opens the delegated-agent detail panel for a `subagent_spawn` row. */
  onOpenDelegatedDetail?: (stepId: string) => void
}

export const SessionTimelineCard: FC<SessionTimelineCardProps> = ({
  decisions,
  activityEvents,
  isStreaming = false,
  defaultCollapsed = false,
  onOpenDelegatedDetail
}) => {
  const scrollRef = useRef<HTMLDivElement>(null)
  const entries = useMemo(() => mergeSessionTimelineEntries(decisions, activityEvents), [decisions, activityEvents])
  const latestEntryId = entries.length > 0 ? entries[entries.length - 1]?.id : null

  useEffect(() => {
    if (!latestEntryId) return
    const container = scrollRef.current
    if (!container) return
    // Match debug trace: chronological list with oldest at the top when idle.
    // While streaming, keep the viewport pinned to the newest row at the bottom.
    container.scrollTop = isStreaming ? container.scrollHeight : 0
  }, [isStreaming, latestEntryId])

  const summary = (() => {
    if (entries.length === 0) return undefined
    const latest = entries[entries.length - 1]
    const time = formatTimelineClockTime(latest.timestamp)
    return time ? `Latest ${time}` : `${entries.length} events`
  })()

  return (
    <PanelCard
      title="Session timeline"
      badge={entries.length > 0 ? entries.length : undefined}
      summary={summary}
      defaultOpen={!defaultCollapsed}
    >
      <div
        ref={scrollRef}
        className="gba:max-h-120 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain"
        data-testid="fabric-session-timeline-scroll"
      >
        <UnifiedSessionTimeline
          decisions={decisions}
          activityEvents={activityEvents}
          onOpenDelegatedDetail={onOpenDelegatedDetail}
        />
      </div>
    </PanelCard>
  )
}
