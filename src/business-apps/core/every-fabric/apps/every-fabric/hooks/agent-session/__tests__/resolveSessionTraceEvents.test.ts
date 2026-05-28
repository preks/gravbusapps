import type { AgentStreamEvent } from '../../../types/enterpriseAgent'
import { resolveSessionTraceEvents } from '../resolveSessionTraceEvents'

const liveEvent = { type: 'step_started', event_id: 'live-1', seq: 1 } as AgentStreamEvent
const traceEvent = { type: 'decision', event_id: 'trace-1', seq: 2 } as AgentStreamEvent

describe('resolveSessionTraceEvents', () => {
  it('returns live events when non-empty', () => {
    expect(resolveSessionTraceEvents([liveEvent], [traceEvent])).toEqual([liveEvent])
  })

  it('falls back to session trace when live is empty', () => {
    expect(resolveSessionTraceEvents([], [traceEvent])).toEqual([traceEvent])
  })

  it('returns empty array when both are empty', () => {
    expect(resolveSessionTraceEvents([], undefined)).toEqual([])
    expect(resolveSessionTraceEvents([], [])).toEqual([])
  })
})
