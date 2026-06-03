import { workforceTraceToModel } from '../workforceTraceToModel'
import { EMPTY_TRACE_MODEL } from '../../../utils/traceModel'
import type { WorkforceRunTraceEvent } from '../workforceTypes'

describe('workforceTraceToModel', () => {
  it('returns the empty model for an empty / undefined trace', () => {
    expect(workforceTraceToModel(undefined)).toBe(EMPTY_TRACE_MODEL)
    expect(workforceTraceToModel([])).toBe(EMPTY_TRACE_MODEL)
  })

  it('drops malformed entries without a string type', () => {
    const trace = [
      { timestamp: '2026-06-01T00:00:00Z' },
      { type: '', timestamp: '2026-06-01T00:00:01Z' }
    ] as unknown as WorkforceRunTraceEvent[]
    expect(workforceTraceToModel(trace)).toBe(EMPTY_TRACE_MODEL)
  })

  it('builds a trace model with frames from a tool step pair', () => {
    const trace: WorkforceRunTraceEvent[] = [
      {
        type: 'step_started',
        seq: 1,
        step_id: 's-1',
        step_type: 'tool',
        name: 'crm_search',
        timestamp: '2026-06-01T00:00:00.000Z'
      } as unknown as WorkforceRunTraceEvent,
      {
        type: 'step_completed',
        seq: 2,
        step_id: 's-1',
        name: 'crm_search',
        status: 'done',
        duration_ms: 1200,
        timestamp: '2026-06-01T00:00:01.200Z'
      } as unknown as WorkforceRunTraceEvent
    ]

    const model = workforceTraceToModel(trace)
    expect(model).not.toBe(EMPTY_TRACE_MODEL)
    expect(model.summary.eventCount).toBe(2)
    expect(model.frames.length).toBeGreaterThan(0)
    expect(model.nodes.some(node => node.kind === 'tool' && node.label === 'crm_search')).toBe(true)
  })

  it('assigns a monotonic seq when entries omit it', () => {
    const trace: WorkforceRunTraceEvent[] = [
      { type: 'decision', title: 'A', timestamp: '2026-06-01T00:00:00Z' },
      { type: 'decision', title: 'B', timestamp: '2026-06-01T00:00:01Z' }
    ]
    const model = workforceTraceToModel(trace)
    expect(model.summary.decisionCount).toBe(2)
  })
})
