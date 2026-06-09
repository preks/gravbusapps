import type { DecisionItem } from '../../../hooks/useFabricDecisions'
import type { ActivityEvent } from '../../../types/enterpriseAgent'
import { formatTimelineClockTime, mergeSessionTimelineEntries } from '../sessionTimelineMerge'

const decision: DecisionItem = {
  id: 'd-1',
  seq: 10,
  timestamp: '2026-06-01T12:00:30.000Z',
  category: 'reflection',
  title: 'Reflection: finalize',
  chosen: 'return',
  rationale: 'Done'
}

const activityNewer: ActivityEvent = {
  id: 'a-1',
  timestamp: '2026-06-01T12:01:00.000Z',
  type: 'tool_call',
  toolName: 'search_web',
  summary: 'search_web — done'
}

const activityOlder: ActivityEvent = {
  id: 'a-2',
  timestamp: '2026-06-01T11:59:00.000Z',
  type: 'tool_call',
  toolName: 'read_file',
  summary: 'read_file — done'
}

describe('sessionTimelineMerge', () => {
  it('sorts oldest first', () => {
    const merged = mergeSessionTimelineEntries([decision], [activityNewer, activityOlder])
    expect(merged[0]?.id).toBe('activity-a-2')
    expect(merged[1]?.id).toBe('decision-d-1')
    expect(merged[2]?.id).toBe('activity-a-1')
  })

  it('skips duplicate reflection activity when a reflection decision exists', () => {
    const reflectionActivity: ActivityEvent = {
      id: 'a-ref',
      timestamp: '2026-06-01T12:00:31.000Z',
      type: 'reflection',
      summary: 'Reflection complete'
    }
    const merged = mergeSessionTimelineEntries([decision], [reflectionActivity, activityNewer])
    expect(merged.some(e => e.id === 'activity-a-ref')).toBe(false)
    expect(merged.some(e => e.id === 'decision-d-1')).toBe(true)
  })

  it('formats clock time with seconds', () => {
    const formatted = formatTimelineClockTime('2026-06-01T14:05:07.000Z')
    expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/)
  })

  it('excludes runtime_scope decisions from the merged timeline', () => {
    const runtimeDecision = {
      id: 'd-runtime',
      seq: 5,
      timestamp: '2026-06-01T12:00:00.000Z',
      category: 'runtime_scope',
      title: 'Runtime owner resolved',
      chosen: 'router',
      rationale: 'owner=router runtime_type=direct_agent'
    } as DecisionItem

    const merged = mergeSessionTimelineEntries([runtimeDecision, decision], [activityNewer])
    expect(merged.some(e => e.id === 'decision-d-runtime')).toBe(false)
    expect(merged.some(e => e.id === 'decision-d-1')).toBe(true)
  })
})
