import { computeStreamingDisplayContent } from '../streamingContent'
import type { AgentStreamEvent } from '../../../types/enterpriseAgent'

const responseStream = (
  content: string,
  seq: number,
  metadata: Record<string, unknown> = { stream_key: 'primary', segment_id: 0 }
): AgentStreamEvent => ({
  type: 'agent_chunk',
  seq,
  event_id: `event-${seq}`,
  role: 'ai',
  content,
  timestamp: new Date(seq * 1000).toISOString(),
  chunk_kind: 'response_stream',
  metadata
})

const demotionMarker = (seq: number, source_stream_key = 'primary', source_segment_id = 0): AgentStreamEvent => ({
  type: 'agent_chunk',
  seq,
  event_id: `event-${seq}`,
  role: 'ai',
  content: 'Superseded answer text',
  timestamp: new Date(seq * 1000).toISOString(),
  chunk_kind: 'agent_reasoning',
  metadata: {
    source: 'response_stream',
    source_stream_key,
    source_segment_id,
    reason: 'tool_call'
  }
})

describe('computeStreamingDisplayContent', () => {
  it('selects continuation content after the primary answer segment is demoted', () => {
    const events = [
      responseStream("I couldn't find that email.", 1),
      demotionMarker(2),
      responseStream('I found the requested contact details.', 3, { stream_key: 'continuation', segment_id: 0 })
    ]

    expect(computeStreamingDisplayContent(events, 0, true, 'running')).toBe('I found the requested contact details.')
  })

  it('uses the latest active segment snapshot even when it is not a prefix extension', () => {
    const events = [
      responseStream('The first draft answer', 1, { stream_key: 'primary', segment_id: 0 }),
      responseStream('A revised answer with better wording', 2, { stream_key: 'primary', segment_id: 0 })
    ]

    expect(computeStreamingDisplayContent(events, 0, true, 'running')).toBe('A revised answer with better wording')
  })

  it('keeps the final response available at terminal status for a seamless handoff', () => {
    const events = [responseStream('Final answer text', 1)]

    expect(computeStreamingDisplayContent(events, 0, false, 'completed')).toBe('Final answer text')
  })
})
