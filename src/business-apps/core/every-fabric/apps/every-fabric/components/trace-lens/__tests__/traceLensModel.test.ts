// Trace Lens model tests — exercised with a workforce-run-shaped trace
// (mirrors the event shapes captured from real dev runs of agent
// 6a1e0a77a2ed5a8d15ec2184: workforce_run_started kickoff, tool_available
// burst, tool steps with error_type, llm_call spans, HITL pause/resume).

import type { DeepAgentSession } from '../../../types/enterpriseAgent'
import { buildTraceLensModel, type RawTraceEvent } from '../traceLensModel'
import { enrichRawTraceEvents } from '../traceLensEnrich'
import { formatRunForCursor } from '../traceLensExport'
import { mergeRunRows, workforceRunToRunRow, type TraceLensRunRow } from '../traceLensRuns'

const T0 = Date.parse('2026-06-10T12:00:00.000Z')
const iso = (offsetMs: number): string => new Date(T0 + offsetMs).toISOString()

function workforceTrace(): RawTraceEvent[] {
  return [
    {
      seq: 1,
      event_id: 's:1',
      type: 'workforce_run_started',
      timestamp: iso(0),
      agent_id: '6a1e0a77a2ed5a8d15ec2184',
      agent_name: 'Insurance Specialist',
      source: 'inbound_email',
      task: 'Handle the inbound claim email',
      trigger_id: 'trg-1',
      trigger_type: 'inbound_email'
    },
    { seq: 2, event_id: 's:2', type: 'tool_available', timestamp: iso(100), tool_ref: 'crm_search' },
    { seq: 3, event_id: 's:3', type: 'tool_available', timestamp: iso(101), tool_ref: 'crm_update' },
    { seq: 4, event_id: 's:4', type: 'tool_available', timestamp: iso(102), tool_ref: 'send_email' },
    {
      seq: 5,
      event_id: 's:5',
      type: 'llm_call',
      timestamp: iso(2100),
      call_num: 1,
      model: 'gpt-5.4',
      stage: 'main_loop',
      prompt_tokens: 1000,
      cached_prompt_tokens: 800,
      completion_tokens: 40,
      total_tokens: 1040,
      cache_hit_ratio: 0.8,
      cost_usd: 0.0012,
      duration_ms: 2000,
      finish_reason: 'tool_calls',
      completion_preview: 'Calling crm_search…'
    },
    {
      seq: 6,
      event_id: 's:6',
      type: 'step_started',
      timestamp: iso(2200),
      step_id: 'step-crm',
      step_type: 'tool',
      name: 'crm_search',
      input: { query: 'claim 42' }
    },
    {
      seq: 7,
      event_id: 's:7',
      type: 'step_completed',
      timestamp: iso(3200),
      step_id: 'step-crm',
      name: 'crm_search',
      status: 'failed',
      output: 'HTTP 500 Internal Server Error',
      duration_ms: 1000,
      error_type: 'http_5xx',
      is_critical: true
    },
    {
      seq: 8,
      event_id: 's:8',
      type: 'hitl_requested',
      timestamp: iso(4000),
      request: { request_id: 'req-1', type: 'question', title: 'Approve refund?', status: 'pending' }
    },
    {
      seq: 9,
      event_id: 's:9',
      type: 'hitl_resolved',
      timestamp: iso(64_000),
      request_id: 'req-1',
      resolved_by: 'user'
    },
    {
      seq: 10,
      event_id: 's:10',
      type: 'terminal',
      timestamp: iso(65_000),
      status: 'completed',
      output: 'Refund processed.'
    }
  ]
}

function sessionWithTrace(trace: RawTraceEvent[]): DeepAgentSession {
  return {
    session_id: 'wf-session-1',
    input: 'Handle the inbound claim email',
    status: 'completed',
    output: 'Refund processed.',
    trace: trace as unknown as DeepAgentSession['trace'],
    created_at: iso(0),
    updated_at: iso(65_000)
  }
}

describe('buildTraceLensModel — workforce trace', () => {
  const model = buildTraceLensModel(sessionWithTrace(workforceTrace()))

  it('renders workforce_run_started as a root marker carrying the task', () => {
    const kickoff = model.flat.find(s => s.kind === 'workforce')
    expect(kickoff).toBeDefined()
    expect(kickoff?.marker).toBe(true)
    expect(kickoff?.parentId).toBeNull()
    expect(kickoff?.name).toBe('Run started: Insurance Specialist (inbound_email)')
    expect(kickoff?.output).toBe('Handle the inbound claim email')
  })

  it('derives origin / agent / source on the summary', () => {
    expect(model.summary.origin).toBe('workforce')
    expect(model.summary.agentName).toBe('Insurance Specialist')
    expect(model.summary.source).toBe('inbound_email')
  })

  it('collapses tool_available bursts into one "Tools bound" marker', () => {
    const summaries = model.flat.filter(s => s.name === 'Tools bound (3)')
    expect(summaries).toHaveLength(1)
    expect(summaries[0].detail?.tools).toEqual(['crm_search', 'crm_update', 'send_email'])
    expect(model.flat.some(s => s.name === 'crm_search' && s.marker)).toBe(false)
  })

  it('renders llm_call as a duration span with token detail, backdated by latency', () => {
    const llm = model.flat.find(s => s.kind === 'llm')
    expect(llm).toBeDefined()
    expect(llm?.name).toBe('LLM · gpt-5.4')
    expect(llm?.marker).toBe(false)
    expect(llm?.durationMs).toBe(2000)
    // timestamp marks the end of the call (offset 2100ms) → starts at 100ms.
    expect(llm?.startMs).toBe(100)
    expect(llm?.endMs).toBe(2100)
    expect(llm?.output).toBe('Calling crm_search…')
    expect(llm?.detail).toMatchObject({
      model: 'gpt-5.4',
      stage: 'main_loop',
      prompt_tokens: 1000,
      cached_prompt_tokens: 800,
      completion_tokens: 40,
      total_tokens: 1040,
      cost_usd: 0.0012,
      finish_reason: 'tool_calls'
    })
    expect(model.summary.llmCallCount).toBe(1)
    expect(model.summary.llmAvgLatencyMs).toBe(2000)
  })

  it('persists error_type / is_critical on the failed tool span', () => {
    const failed = model.flat.find(s => s.id === 'step-crm')
    expect(failed?.status).toBe('failed')
    expect(failed?.errorType).toBe('http_5xx')
    expect(failed?.detail?.error_type).toBe('http_5xx')
    expect(failed?.detail?.is_critical).toBe(true)
  })

  it('synthesizes a "Waiting for human" span with the real wait duration', () => {
    const wait = model.flat.find(s => s.kind === 'wait')
    expect(wait).toBeDefined()
    expect(wait?.name).toBe('Waiting for human · Approve refund?')
    expect(wait?.durationMs).toBe(60_000)
    expect(model.summary.hitlWaitMs).toBe(60_000)
  })

  it('keeps spans in execution order by seq', () => {
    const seqs = model.flat.filter(s => s.depth === 0).map(s => s.seq)
    expect([...seqs].sort((a, b) => a - b)).toEqual(seqs)
  })
})

describe('buildTraceLensModel — chat trace', () => {
  it('marks runs without a workforce kickoff as chat origin', () => {
    const model = buildTraceLensModel(
      sessionWithTrace([
        { seq: 1, event_id: 'c:1', type: 'agent_chunk', role: 'human', content: 'hi', timestamp: iso(0) }
      ])
    )
    expect(model.summary.origin).toBe('chat')
    expect(model.summary.agentName).toBeUndefined()
    expect(model.summary.llmCallCount).toBe(0)
  })
})

describe('enrichRawTraceEvents', () => {
  it('is a no-op for traces without tool_available or HITL events', () => {
    const events: RawTraceEvent[] = [{ seq: 1, type: 'step_started', step_id: 'a', timestamp: iso(0) }]
    expect(enrichRawTraceEvents(events)).toEqual(events)
  })

  it('matches hitl_resolved to its request by request_id', () => {
    const events: RawTraceEvent[] = [
      { seq: 1, type: 'hitl_requested', timestamp: iso(0), request: { request_id: 'a', title: 'A' } },
      { seq: 2, type: 'hitl_requested', timestamp: iso(1000), request: { request_id: 'b', title: 'B' } },
      { seq: 3, type: 'hitl_resolved', timestamp: iso(5000), request_id: 'b' }
    ]
    const waits = enrichRawTraceEvents(events).filter(e => e.type === 'hitl_wait')
    expect(waits).toHaveLength(1)
    expect(waits[0].request_id).toBe('b')
    expect(waits[0].duration_ms).toBe(4000)
  })
})

describe('formatRunForCursor', () => {
  it('includes origin, agent, llm calls and error types in the export', () => {
    const text = formatRunForCursor(buildTraceLensModel(sessionWithTrace(workforceTrace())))
    expect(text).toContain('- origin: workforce (inbound_email)')
    expect(text).toContain('- agent: Insurance Specialist')
    expect(text).toContain('llm_calls=1')
    expect(text).toContain('[error_type=http_5xx]')
    expect(text).toContain('human_wait_total: 1m 0s')
  })
})

describe('traceLensRuns', () => {
  it('maps compact workforce rows onto run rows', () => {
    const row = workforceRunToRunRow({
      session_id: 'wf-1',
      agent_id: 'a-1',
      agent_name: 'Insurance Specialist',
      status: 'failed',
      source: 'schedule',
      input: 'Do the thing',
      created_at: iso(0),
      trace_count: 215
    })
    expect(row).toEqual({
      sessionId: 'wf-1',
      origin: 'workforce',
      status: 'failed',
      input: 'Do the thing',
      createdAt: iso(0),
      agentName: 'Insurance Specialist',
      source: 'schedule',
      traceCount: 215
    })
  })

  it('merges chat + workforce rows newest-first, workforce winning duplicates', () => {
    const chat: TraceLensRunRow[] = [
      { sessionId: 'dup', origin: 'chat', status: 'completed', input: 'dup chat', createdAt: iso(1000) },
      { sessionId: 'c-1', origin: 'chat', status: 'completed', input: 'old chat', createdAt: iso(0) }
    ]
    const workforce: TraceLensRunRow[] = [
      {
        sessionId: 'dup',
        origin: 'workforce',
        status: 'completed',
        input: 'dup wf',
        createdAt: iso(1000),
        agentName: 'Agent'
      },
      { sessionId: 'w-1', origin: 'workforce', status: 'running', input: 'new wf', createdAt: iso(2000) }
    ]
    const merged = mergeRunRows(chat, workforce)
    expect(merged.map(r => r.sessionId)).toEqual(['w-1', 'dup', 'c-1'])
    expect(merged[1].origin).toBe('workforce')
  })
})
