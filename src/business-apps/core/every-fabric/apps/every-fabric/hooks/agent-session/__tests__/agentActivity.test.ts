import type { AgentStreamEvent } from '../../../types/enterpriseAgent'
import { buildAgentActivityLines } from '../agentActivity'

describe('buildAgentActivityLines', () => {
  it('keeps activity lines after response_stream starts in the same turn', () => {
    const events: AgentStreamEvent[] = [
      {
        type: 'agent_chunk',
        role: 'human',
        timestamp: '2026-05-27T10:00:00.000Z',
        seq: 1
      } as AgentStreamEvent,
      {
        type: 'step_started',
        name: 'search_docs',
        timestamp: '2026-05-27T10:00:01.000Z',
        seq: 2
      } as AgentStreamEvent,
      {
        type: 'agent_chunk',
        role: 'ai',
        chunk_kind: 'response_stream',
        content: 'Hello',
        timestamp: '2026-05-27T10:00:02.000Z',
        seq: 3
      } as AgentStreamEvent
    ]

    expect(buildAgentActivityLines(events)).toEqual(['Calling Search docs'])
  })
})
