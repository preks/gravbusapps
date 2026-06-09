import type { DecisionItem } from '../../hooks/useFabricDecisions'
import type { ActivityEvent, DecisionCategory } from '../../types/enterpriseAgent'
import { parseIsoTimestamp } from '../../utils/renderUtils'

export type SessionTimelineEntry =
  | { kind: 'decision'; id: string; timestamp: string; sortKey: number; decision: DecisionItem }
  | { kind: 'activity'; id: string; timestamp: string; sortKey: number; activity: ActivityEvent }

export function timelineSortKey(timestamp: string, seq?: number): number {
  const ms = parseIsoTimestamp(timestamp)?.getTime() ?? 0
  return ms * 1000 + (seq ?? 0)
}

/** Oldest first — matches debug-trace step ordering (timestamp, then seq). */
export function compareTimelineEntriesChronologically(a: SessionTimelineEntry, b: SessionTimelineEntry): number {
  return a.sortKey - b.sortKey
}

/** Clock time with hours, minutes, and seconds (chronological timeline). */
export function formatTimelineClockTime(timestamp: string): string {
  const date = parseIsoTimestamp(timestamp)
  if (!date) return ''
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function shouldSkipActivityEvent(event: ActivityEvent, decisions: DecisionItem[]): boolean {
  if (event.type === 'reflection') {
    return decisions.some(d => d.category === 'reflection')
  }
  if (event.type === 'tool_call' && event.toolName === 'skill_load' && event.skillId) {
    return decisions.some(d => d.category === 'skill' && d.chosen === event.skillId)
  }
  return false
}

export function mergeSessionTimelineEntries(
  decisions: DecisionItem[],
  activityEvents: ActivityEvent[]
): SessionTimelineEntry[] {
  const entries: SessionTimelineEntry[] = []

  for (const decision of decisions) {
    entries.push({
      kind: 'decision',
      id: `decision-${decision.id}`,
      timestamp: decision.timestamp,
      sortKey: timelineSortKey(decision.timestamp, decision.seq),
      decision
    })
  }

  for (const activity of activityEvents) {
    if (shouldSkipActivityEvent(activity, decisions)) continue
    entries.push({
      kind: 'activity',
      id: `activity-${activity.id}`,
      timestamp: activity.timestamp,
      sortKey: timelineSortKey(activity.timestamp),
      activity
    })
  }

  return entries.sort(compareTimelineEntriesChronologically)
}

export const DECISION_CATEGORY_LABEL: Record<DecisionCategory, string> = {
  skill: 'Skill',
  tool_routing: 'Routing',
  reflection: 'Reflection',
  hitl: 'Human input',
  plan: 'Plan'
}
