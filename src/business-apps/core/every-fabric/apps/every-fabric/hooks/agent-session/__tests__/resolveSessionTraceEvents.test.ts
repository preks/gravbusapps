import type { AgentChunkEvent, AgentStreamEvent } from '../../../types/enterpriseAgent'
import { resolveSessionTraceEvents } from '../resolveSessionTraceEvents'

const liveEvent = { type: 'step_started', event_id: 'live-1', seq: 1 } as AgentStreamEvent
const traceEvent = { type: 'decision', event_id: 'trace-1', seq: 2 } as AgentStreamEvent

const responseStream = (seq: number, content: string, eventId: string): AgentChunkEvent => ({
  type: 'agent_chunk',
  role: 'ai',
  chunk_kind: 'response_stream',
  seq,
  event_id: eventId,
  content,
  timestamp: `2026-01-01T00:00:0${seq}Z`,
  metadata: { stream_key: 'primary', segment_id: 0, mode: 'cumulative' }
})

describe('resolveSessionTraceEvents', () => {
  it('merges live and REST traces when both are present', () => {
    expect(resolveSessionTraceEvents([liveEvent], [traceEvent])).toEqual([traceEvent, liveEvent])
  })

  it('falls back to session trace when live is empty', () => {
    expect(resolveSessionTraceEvents([], [traceEvent])).toEqual([traceEvent])
  })

  it('returns empty array when both are empty', () => {
    expect(resolveSessionTraceEvents([], undefined)).toEqual([])
    expect(resolveSessionTraceEvents([], [])).toEqual([])
  })

  it('keeps the newest cumulative response_stream snapshot per segment', () => {
    const staleLive = responseStream(10, 'Hello wo', 's:10')
    const freshRest = responseStream(12, 'Hello world', 's:12')
    const merged = resolveSessionTraceEvents([liveEvent, staleLive], [freshRest])
    const snapshots = merged.filter(
      (e): e is AgentChunkEvent => e.type === 'agent_chunk' && e.chunk_kind === 'response_stream'
    )
    expect(snapshots).toHaveLength(1)
    expect(snapshots[0]?.content).toBe('Hello world')
    expect(snapshots[0]?.seq).toBe(12)
  })

  it('keeps same-segment response_stream snapshots across turn boundaries', () => {
    const turn1 = responseStream(12, 'First turn answer', 's:12')
    const terminal1 = {
      type: 'terminal',
      event_id: 's:13',
      seq: 13,
      status: 'completed',
      timestamp: '2026-01-01T00:00:13Z'
    } as AgentStreamEvent
    const turn2Partial = responseStream(20, 'Second', 's:20')
    const turn2Final = responseStream(22, 'Second turn answer', 's:22')

    const merged = resolveSessionTraceEvents([turn2Partial], [turn1, terminal1, turn2Final])
    const snapshots = merged.filter(
      (e): e is AgentChunkEvent => e.type === 'agent_chunk' && e.chunk_kind === 'response_stream'
    )

    expect(snapshots).toHaveLength(2)
    expect(snapshots.map(e => e.content)).toEqual(['First turn answer', 'Second turn answer'])
  })
})
