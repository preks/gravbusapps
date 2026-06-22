// Grouped, scrollable timeline of a Workforce run's trace events.
//
// Goals:
//   * Pair `*_started` and `*_completed` events into a single row so the
//     timeline reads like a transcript ("called tool X (1.2s)") rather
//     than a raw event firehose.
//   * Surface decisions with their full backtrace (chosen / why /
//     alternatives / confidence) and every row's actor (who) + time (when).
//   * Always offer a "show raw" expander on each row so we never hide
//     debugging data — the goal is readability, not lossy filtering.
//
// Kept presentational (no fetching) so it can render under either the
// Run Detail drawer or the full-page Trace tab. The grouping model lives in
// `traceTimelineModel.ts` and the row renderer in `TraceTimelineRow.tsx`.

import React, { useMemo } from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { TraceTimelineRow } from './TraceTimelineRow'
import { buildRows, classifyEvent, diffMs, formatDuration } from './traceTimelineModel'
import type { WorkforceRunTraceEvent } from '../../workforceTypes'
import translations from '../../../../_i18n'

export interface GroupedTraceTimelineProps {
  trace: readonly WorkforceRunTraceEvent[] | undefined
  // When provided, the timeline highlights this row (deep-link / focus hook).
  focusEventId?: string | null
}

export const GroupedTraceTimeline: React.FC<GroupedTraceTimelineProps> = ({ trace, focusEventId }) => {
  const { t } = useTranslation(translations)
  const rows = useMemo(() => buildRows(trace), [trace])

  if (rows.length === 0) {
    return (
      <div
        className="gba:rounded-lg gba:border gba:border-dashed gba:border-border/60 gba:bg-card/50 gba:p-6 gba:text-center gba:text-xs gba:text-muted-foreground"
        data-testid="workforce-trace-empty"
      >
        {t('trace-empty-events')}
      </div>
    )
  }

  return (
    <ol className="gba:space-y-2" data-testid="workforce-trace-timeline">
      {rows.map(row => (
        <TraceTimelineRow key={row.key} row={row} isFocused={focusEventId === row.key} />
      ))}
    </ol>
  )
}

// Exported for unit tests so the grouping rule can be exercised without a DOM.
export const __INTERNAL = { buildRows, classifyEvent, formatDuration, diffMs }
