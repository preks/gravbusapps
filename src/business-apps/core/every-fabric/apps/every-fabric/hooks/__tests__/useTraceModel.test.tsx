import { renderHook } from '@testing-library/react'
import type { AgentStreamEvent, DeepAgentSession } from '../../types/enterpriseAgent'
import { useTraceModel } from '../useTraceModel'

const ts = (offsetSeconds: number) => new Date(Date.UTC(2026, 0, 1, 12, 0, offsetSeconds, 0)).toISOString()

const subagentEvent = (seq: number, eventId: string, stepId: string, name: string, offset: number): AgentStreamEvent =>
  ({
    type: 'subagent_spawned',
    seq,
    event_id: eventId,
    step_id: stepId,
    name,
    agent_name: name,
    task_summary: `Task ${seq}`,
    timestamp: ts(offset)
  }) as AgentStreamEvent

const buildSession = (trace: AgentStreamEvent[]): DeepAgentSession =>
  ({
    session_id: 'sess-1',
    input: 'task',
    status: 'completed',
    config: {},
    trace
  }) as unknown as DeepAgentSession

describe('useTraceModel', () => {
  it('returns the empty model when no events are available', () => {
    const { result } = renderHook(() => useTraceModel({ liveEvents: [], session: null, isStreaming: false }))
    expect(result.current.source).toBe('empty')
    expect(result.current.model.frames).toHaveLength(0)
  })

  it('uses session.trace when no live events have been received', () => {
    const trace = [subagentEvent(1, 'e1', 's1', 'A', 0), subagentEvent(2, 'e2', 's2', 'B', 1)]
    const { result } = renderHook(() =>
      useTraceModel({ liveEvents: [], session: buildSession(trace), isStreaming: false })
    )
    expect(result.current.source).toBe('rest')
    expect(result.current.model.frames).toHaveLength(2)
  })

  it('uses live events when session.trace is empty', () => {
    const live = [subagentEvent(1, 'e1', 's1', 'A', 0)]
    const { result } = renderHook(() =>
      useTraceModel({ liveEvents: live, session: buildSession([]), isStreaming: true })
    )
    expect(result.current.source).toBe('live')
    expect(result.current.model.frames).toHaveLength(1)
  })

  // Regression: refresh of a completed session.
  // Before the merge fix, useTraceModel would unconditionally prefer
  // `liveEvents` whenever it was non-empty. After a refresh, the SSE
  // endpoint may legitimately replay only a fragment of the persisted
  // trace (e.g. one terminal event), which truncated the mesh from
  // "5 agents · 281k tokens" down to whatever fragment SSE delivered.
  // The merge guarantees the model is always the union of both sources.
  it('merges REST trace and live events without losing data when SSE replays a subset', () => {
    const fullTrace = [
      subagentEvent(1, 'e1', 's1', 'A', 0),
      subagentEvent(2, 'e2', 's2', 'B', 1),
      subagentEvent(3, 'e3', 's3', 'C', 2),
      subagentEvent(4, 'e4', 's4', 'D', 3),
      subagentEvent(5, 'e5', 's5', 'E', 4)
    ]
    // SSE only redelivers the last event after refresh (e.g. terminal).
    const liveSubset = [fullTrace[4]]
    const { result } = renderHook(() =>
      useTraceModel({
        liveEvents: liveSubset,
        session: buildSession(fullTrace),
        isStreaming: false
      })
    )
    expect(result.current.source).toBe('merged')
    // 5 unique events from REST + 0 new from live (the last was a duplicate).
    expect(result.current.model.frames).toHaveLength(5)
    expect(result.current.model.summary.eventCount).toBe(5)
  })

  it('deduplicates events that arrive via both REST and live by event_id', () => {
    const shared = subagentEvent(1, 'e1', 's1', 'A', 0)
    const liveOnly = subagentEvent(2, 'e2', 's2', 'B', 1)
    const { result } = renderHook(() =>
      useTraceModel({
        liveEvents: [shared, liveOnly],
        session: buildSession([shared]),
        isStreaming: true
      })
    )
    expect(result.current.source).toBe('merged')
    expect(result.current.model.summary.eventCount).toBe(2)
  })

  it('falls back to seq for deduplication when event_id is missing', () => {
    const eventA = {
      type: 'subagent_spawned',
      seq: 1,
      step_id: 's1',
      name: 'A',
      agent_name: 'A',
      task_summary: 'Task 1',
      timestamp: ts(0)
    } as unknown as AgentStreamEvent
    const eventB = {
      type: 'subagent_spawned',
      seq: 2,
      step_id: 's2',
      name: 'B',
      agent_name: 'B',
      task_summary: 'Task 2',
      timestamp: ts(1)
    } as unknown as AgentStreamEvent
    const { result } = renderHook(() =>
      useTraceModel({
        liveEvents: [eventA, eventB],
        session: buildSession([eventA]),
        isStreaming: true
      })
    )
    expect(result.current.source).toBe('merged')
    expect(result.current.model.summary.eventCount).toBe(2)
  })
})
