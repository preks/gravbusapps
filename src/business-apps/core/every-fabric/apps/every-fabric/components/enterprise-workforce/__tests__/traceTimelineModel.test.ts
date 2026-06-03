import {
  buildRows,
  classifyEvent,
  coalesceStreamingChunks,
  diffMs,
  formatDuration
} from '../agent-detail/trace/traceTimelineModel'
import type { WorkforceRunTraceEvent } from '../workforceTypes'

function streamChunk(
  content: string,
  ts: string,
  overrides: Partial<WorkforceRunTraceEvent> = {}
): WorkforceRunTraceEvent {
  return {
    type: 'agent_chunk',
    chunk_kind: 'response_stream',
    role: 'ai',
    content,
    timestamp: ts,
    ...overrides
  }
}

describe('classifyEvent', () => {
  it('maps event type prefixes to categories', () => {
    expect(classifyEvent('tool_started')).toBe('tool')
    expect(classifyEvent('tool_approval_requested')).toBe('approval')
    expect(classifyEvent('decision')).toBe('decision')
    expect(classifyEvent('policy_applied')).toBe('policy')
    expect(classifyEvent('cost_attribution')).toBe('cost')
    expect(classifyEvent('waiting_for_human')).toBe('hitl')
    expect(classifyEvent('something_else')).toBe('system')
  })
})

describe('formatDuration', () => {
  it('formats sub-second, seconds, and minutes', () => {
    expect(formatDuration(null)).toBeNull()
    expect(formatDuration(250)).toBe('250ms')
    expect(formatDuration(1500)).toBe('1.5s')
    expect(formatDuration(75_000)).toBe('1m 15s')
  })
})

describe('diffMs', () => {
  it('returns elapsed ms for a valid range and null otherwise', () => {
    expect(diffMs('2026-06-01T00:00:00.000Z', '2026-06-01T00:00:01.200Z')).toBe(1200)
    expect(diffMs(null, '2026-06-01T00:00:01Z')).toBeNull()
    expect(diffMs('2026-06-01T00:00:02Z', '2026-06-01T00:00:01Z')).toBeNull()
  })
})

describe('buildRows', () => {
  it('pairs *_started and *_completed events with the same correlation id into one row', () => {
    const trace: WorkforceRunTraceEvent[] = [
      {
        type: 'tool_started',
        name: 'crm_search',
        tool_call_id: 'call-1',
        timestamp: '2026-06-01T00:00:00.000Z'
      },
      {
        type: 'tool_completed',
        name: 'crm_search',
        tool_call_id: 'call-1',
        timestamp: '2026-06-01T00:00:02.000Z',
        message: 'Found 3 accounts'
      }
    ]

    const rows = buildRows(trace)
    expect(rows).toHaveLength(1)
    expect(rows[0].category).toBe('tool')
    expect(rows[0].title).toBe('Called crm_search')
    expect(rows[0].durationMs).toBe(2000)
    expect(rows[0].body).toBe('Found 3 accounts')
  })

  it('extracts decision detail (chosen / rationale / alternatives / confidence) and actor', () => {
    const trace: WorkforceRunTraceEvent[] = [
      {
        type: 'decision',
        title: 'Route to billing',
        category: 'routing',
        chosen: 'billing_team',
        rationale: 'Invoice question',
        alternatives: ['support_team', 'sales_team'],
        confidence: 0.82,
        actor: { kind: 'agent', display_name: 'Finance Bot' },
        timestamp: '2026-06-01T00:00:05.000Z'
      }
    ]

    const rows = buildRows(trace)
    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.category).toBe('decision')
    expect(row.title).toBe('Route to billing')
    expect(row.decision).toEqual({
      category: 'routing',
      chosen: 'billing_team',
      rationale: 'Invoice question',
      alternatives: ['support_team', 'sales_team'],
      confidence: 0.82
    })
    expect(row.actor).toEqual({ kind: 'agent', displayName: 'Finance Bot' })
  })

  it('renders a policy_applied event with a readable title', () => {
    const trace: WorkforceRunTraceEvent[] = [
      {
        type: 'policy_applied',
        policy: { policy_id: 'refund-v2', title: 'Refund Policy' },
        timestamp: '2026-06-01T00:00:06.000Z'
      }
    ]

    const rows = buildRows(trace)
    expect(rows[0].category).toBe('policy')
    expect(rows[0].title).toBe('Applied policy: Refund Policy')
    expect(rows[0].subtitle).toBe('refund-v2')
  })

  it('turns an agent_chunk status into a readable line driven by its content', () => {
    const trace: WorkforceRunTraceEvent[] = [
      {
        type: 'agent_chunk',
        event_id: 'evt-1',
        chunk_kind: 'status',
        content: 'Analyzing your request...',
        timestamp: '2026-06-01T00:00:01.000Z'
      }
    ]
    const rows = buildRows(trace)
    expect(rows).toHaveLength(1)
    expect(rows[0].category).toBe('status')
    expect(rows[0].title).toBe('Analyzing your request...')
  })

  it('labels a tool agent_chunk by the tool it called', () => {
    const trace: WorkforceRunTraceEvent[] = [
      {
        type: 'agent_chunk',
        event_id: 'evt-2',
        chunk_kind: 'tool',
        tool_name: 'lookup_policy',
        content: 'running tool',
        timestamp: '2026-06-01T00:00:02.000Z'
      }
    ]
    const rows = buildRows(trace)
    expect(rows[0].category).toBe('tool')
    expect(rows[0].title).toBe('Called lookup_policy')
  })

  it('renders skill events with the skill name instead of the raw type', () => {
    const trace: WorkforceRunTraceEvent[] = [
      {
        type: 'skill_scoped',
        skill: { skill_id: 's-1', name: 'Claims Triage' },
        timestamp: '2026-06-01T00:00:03.000Z'
      }
    ]
    const rows = buildRows(trace)
    expect(rows[0].category).toBe('skill')
    expect(rows[0].title).toBe('Considered skill Claims Triage')
  })

  it('orders rows chronologically by start time', () => {
    const trace: WorkforceRunTraceEvent[] = [
      { type: 'decision', title: 'Second', timestamp: '2026-06-01T00:00:10.000Z' },
      { type: 'decision', title: 'First', timestamp: '2026-06-01T00:00:01.000Z' }
    ]
    const rows = buildRows(trace)
    expect(rows.map(r => r.title)).toEqual(['First', 'Second'])
  })

  it('coalesces N cumulative response_stream snapshots into one Response row', () => {
    const trace: WorkforceRunTraceEvent[] = [
      streamChunk('Hello', '2026-06-01T00:00:01.000Z', { event_id: 'first' }),
      streamChunk('Hello there', '2026-06-01T00:00:01.100Z', { event_id: 'mid' }),
      streamChunk('Hello there, here is your answer.', '2026-06-01T00:00:01.200Z', { event_id: 'last' })
    ]
    const rows = buildRows(trace)
    expect(rows).toHaveLength(1)
    expect(rows[0].category).toBe('message')
    expect(rows[0].title).toBe('Response')
    expect(rows[0].body).toBe('Hello there, here is your answer.')
    // Keeps the first snapshot's id/timestamp so the row stays stable as it grows.
    expect(rows[0].key).toBe('first')
    expect(rows[0].startedAt).toBe('2026-06-01T00:00:01.000Z')
  })

  it('keeps separate assistant messages on separate rows (content reset)', () => {
    const trace: WorkforceRunTraceEvent[] = [
      streamChunk('First message', '2026-06-01T00:00:01.000Z', { event_id: 'm1' }),
      streamChunk('First message complete.', '2026-06-01T00:00:01.100Z', { event_id: 'm1b' }),
      streamChunk('A brand new answer', '2026-06-01T00:00:05.000Z', { event_id: 'm2' })
    ]
    const rows = buildRows(trace)
    expect(rows).toHaveLength(2)
    expect(rows[0].body).toBe('First message complete.')
    expect(rows[1].body).toBe('A brand new answer')
  })

  it('does not merge thinking snapshots into message snapshots', () => {
    const trace: WorkforceRunTraceEvent[] = [
      streamChunk('Let me think', '2026-06-01T00:00:01.000Z', { chunk_kind: 'thinking', event_id: 't1' }),
      streamChunk('Let me think about the policy', '2026-06-01T00:00:01.100Z', {
        chunk_kind: 'thinking',
        event_id: 't2'
      }),
      streamChunk('Here is the response', '2026-06-01T00:00:02.000Z', { event_id: 'r1' })
    ]
    const rows = buildRows(trace)
    expect(rows).toHaveLength(2)
    expect(rows[0].category).toBe('thinking')
    expect(rows[0].title).toBe('Thinking')
    expect(rows[0].body).toBe('Let me think about the policy')
    expect(rows[1].category).toBe('message')
    expect(rows[1].body).toBe('Here is the response')
  })
})

describe('coalesceStreamingChunks', () => {
  it('passes through non-streaming events untouched and preserves order', () => {
    const trace: WorkforceRunTraceEvent[] = [
      { type: 'tool_started', name: 'crm_search', timestamp: '2026-06-01T00:00:00.000Z' },
      streamChunk('partial', '2026-06-01T00:00:01.000Z'),
      streamChunk('partial answer', '2026-06-01T00:00:01.100Z'),
      { type: 'terminal', status: 'completed', timestamp: '2026-06-01T00:00:02.000Z' }
    ]
    const out = coalesceStreamingChunks(trace)
    expect(out).toHaveLength(3)
    expect(out[0].type).toBe('tool_started')
    expect(out[1].content).toBe('partial answer')
    expect(out[2].type).toBe('terminal')
  })

  it('separates streams that differ by stream_key', () => {
    const trace: WorkforceRunTraceEvent[] = [
      streamChunk('main a', '2026-06-01T00:00:01.000Z', { metadata: { stream_key: 'primary' } }),
      streamChunk('side a', '2026-06-01T00:00:01.050Z', { metadata: { stream_key: 'continuation' } }),
      streamChunk('main a b', '2026-06-01T00:00:01.100Z', { metadata: { stream_key: 'primary' } })
    ]
    const out = coalesceStreamingChunks(trace)
    expect(out.map(e => e.content)).toEqual(['main a', 'side a', 'main a b'])
  })
})
