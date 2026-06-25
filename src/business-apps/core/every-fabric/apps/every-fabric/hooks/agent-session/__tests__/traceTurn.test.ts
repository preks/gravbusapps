import type { AgentStreamEvent } from '../../../types/enterpriseAgent'
import { currentTurnTrace, currentTurnTraceSince } from '../traceTurn'

const ev = (overrides: Partial<AgentStreamEvent> & { seq: number }): AgentStreamEvent =>
  ({ type: 'agent_chunk', role: 'ai', timestamp: '2026-06-25T13:00:00.000Z', ...overrides }) as AgentStreamEvent

describe('currentTurnTrace', () => {
  it('returns the input unchanged when there are no human events', () => {
    const events = [ev({ seq: 1 }), ev({ seq: 2 })]
    expect(currentTurnTrace(events)).toEqual(events)
  })

  it('drops the previous turn (including its terminal) and keeps the current turn', () => {
    const events: AgentStreamEvent[] = [
      ev({ seq: 1, role: 'human' }),
      ev({ seq: 2, chunk_kind: 'final' } as Partial<AgentStreamEvent> & { seq: number }),
      { type: 'terminal', seq: 23, status: 'completed', timestamp: '2026-06-25T13:04:03.000Z' } as AgentStreamEvent,
      ev({ seq: 24, role: 'human' }),
      ev({ seq: 25, chunk_kind: 'status' } as Partial<AgentStreamEvent> & { seq: number }),
      ev({ seq: 39, chunk_kind: 'response_stream' } as Partial<AgentStreamEvent> & { seq: number })
    ]

    const result = currentTurnTrace(events)
    const seqs = result.map(e => (e as { seq: number }).seq)

    expect(seqs).toEqual([24, 25, 39])
    expect(result.some(e => e.type === 'terminal')).toBe(false)
  })

  it('returns an empty array unchanged', () => {
    expect(currentTurnTrace([])).toEqual([])
  })

  it('returns no events when an in-flight reply is newer than the REST snapshot human turn', () => {
    const events: AgentStreamEvent[] = [
      ev({ seq: 1, role: 'human', timestamp: '2026-06-25T13:13:02.000Z' }),
      ev({
        seq: 2,
        chunk_kind: 'response_stream',
        timestamp: '2026-06-25T13:13:03.000Z'
      } as Partial<AgentStreamEvent> & { seq: number }),
      { type: 'terminal', seq: 3, status: 'completed', timestamp: '2026-06-25T13:13:04.000Z' } as AgentStreamEvent
    ]

    expect(currentTurnTraceSince(events, Date.parse('2026-06-25T13:16:19.000Z'))).toEqual([])
  })

  it('keeps only events from the fresh human turn when a matching human exists', () => {
    const events: AgentStreamEvent[] = [
      ev({ seq: 1, role: 'human', timestamp: '2026-06-25T13:13:02.000Z' }),
      { type: 'terminal', seq: 3, status: 'completed', timestamp: '2026-06-25T13:13:04.000Z' } as AgentStreamEvent,
      ev({ seq: 5, role: 'human', timestamp: '2026-06-25T13:16:19.000Z' }),
      ev({ seq: 6, chunk_kind: 'status', timestamp: '2026-06-25T13:16:20.000Z' } as Partial<AgentStreamEvent> & {
        seq: number
      }),
      ev({
        seq: 80,
        chunk_kind: 'response_stream',
        timestamp: '2026-06-25T13:16:28.000Z'
      } as Partial<AgentStreamEvent> & { seq: number })
    ]

    const result = currentTurnTraceSince(events, Date.parse('2026-06-25T13:16:18.500Z'))

    expect(result.map(event => (event as { seq: number }).seq)).toEqual([5, 6, 80])
  })
})
