import React, { useEffect, useMemo, useRef, type FC } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import type { DecisionItem } from '../../hooks/useFabricDecisions'
import type { ActivityEvent } from '../../types/enterpriseAgent'
import translations from '../../_i18n'
import { PanelCard } from './PanelCard'
import { formatTimelineClockTime, mergeSessionTimelineEntries } from './sessionTimelineMerge'
import { UnifiedSessionTimeline } from './UnifiedSessionTimeline'

interface SessionTimelineCardProps {
  decisions: DecisionItem[]
  activityEvents: ActivityEvent[]
  isStreaming?: boolean
  defaultCollapsed?: boolean
}

export const SessionTimelineCard: FC<SessionTimelineCardProps> = ({
  decisions,
  activityEvents,
  isStreaming = false,
  defaultCollapsed = false
}) => {
  const { t } = useTranslation(translations)
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
    return time
      ? t('workspace-session-timeline-latest', { time })
      : t('workspace-session-timeline-event-count', { count: entries.length })
  })()

  return (
    <PanelCard
      title={t('workspace-session-timeline-title')}
      badge={entries.length > 0 ? entries.length : undefined}
      summary={summary}
      defaultOpen={!defaultCollapsed}
    >
      <div
        ref={scrollRef}
        className="gba:max-h-120 gba:min-h-0 gba:overflow-y-auto gba:overscroll-contain"
        data-testid="fabric-session-timeline-scroll"
      >
        <UnifiedSessionTimeline decisions={decisions} activityEvents={activityEvents} />
      </div>
    </PanelCard>
  )
}
