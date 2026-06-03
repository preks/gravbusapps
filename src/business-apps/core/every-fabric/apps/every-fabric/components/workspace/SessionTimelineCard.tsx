import React, { useMemo, type FC } from 'react'
import type { DecisionItem } from '../../hooks/useFabricDecisions'
import type { ActivityEvent } from '../../types/enterpriseAgent'
import { PanelCard } from './PanelCard'
import { formatTimelineClockTime, mergeSessionTimelineEntries } from './sessionTimelineMerge'
import { UnifiedSessionTimeline } from './UnifiedSessionTimeline'

interface SessionTimelineCardProps {
  decisions: DecisionItem[]
  activityEvents: ActivityEvent[]
  defaultCollapsed?: boolean
}

export const SessionTimelineCard: FC<SessionTimelineCardProps> = ({
  decisions,
  activityEvents,
  defaultCollapsed = false
}) => {
  const entries = useMemo(() => mergeSessionTimelineEntries(decisions, activityEvents), [decisions, activityEvents])

  const summary = (() => {
    if (entries.length === 0) return undefined
    const latest = entries[0]
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
      <div className="gba:max-h-120 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain">
        <UnifiedSessionTimeline decisions={decisions} activityEvents={activityEvents} />
      </div>
    </PanelCard>
  )
}
