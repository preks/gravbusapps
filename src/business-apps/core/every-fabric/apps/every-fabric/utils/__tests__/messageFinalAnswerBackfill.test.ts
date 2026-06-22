import type { AgentStreamEvent } from '../../types/enterpriseAgent'
import { deriveMessagesFromEvents } from '../messageUtils'

let seqCounter = 0
const nextSeq = () => (seqCounter += 1)

const responseStream = (content: string): AgentStreamEvent => {
  const seq = nextSeq()
  return {
    type: 'agent_chunk',
    role: 'ai',
    chunk_kind: 'response_stream',
    seq,
    event_id: `chunk-${seq}`,
    content,
    timestamp: `2026-06-22T12:00:0${seq}.000Z`,
    metadata: { mode: 'cumulative', stream_key: 'primary', segment_id: 0 }
  } as unknown as AgentStreamEvent
}

const terminalCompleted = (output: string): AgentStreamEvent => {
  const seq = nextSeq()
  return {
    type: 'terminal',
    status: 'completed',
    seq,
    event_id: `terminal-${seq}`,
    output,
    duration_ms: 1200,
    timestamp: `2026-06-22T12:00:1${seq}.000Z`
  } as unknown as AgentStreamEvent
}

const finalAnswerOutput = (events: AgentStreamEvent[]): string | undefined => {
  const messages = deriveMessagesFromEvents(events)
  const final = messages.find(m => m.type === 'final_answer')
  return (final?.content as { output?: string } | undefined)?.output
}

beforeEach(() => {
  seqCounter = 0
})

describe('deriveMessagesFromEvents — final answer backfill', () => {
  it('backfills an empty terminal output from the last streamed snapshot', () => {
    const answer = 'Hey Sir\n\n### Summary\n\nI could not build the spreadsheet of all 458 employees.'
    const events = [responseStream('Hey Sir\n\n### Summary'), responseStream(answer), terminalCompleted('')]
    expect(finalAnswerOutput(events)).toBe(answer)
  })

  it('keeps the terminal output when it is already populated (reload path)', () => {
    const events = [responseStream('partial stream'), terminalCompleted('Persisted final answer.')]
    expect(finalAnswerOutput(events)).toBe('Persisted final answer.')
  })

  it('does not invent an answer when there is no streamed content', () => {
    const events = [terminalCompleted('')]
    expect(finalAnswerOutput(events)).toBe('')
  })

  it('ignores streamed chart JSON so it is not promoted into the answer', () => {
    const events = [responseStream('{"sections": [{"chartType": "bar"}]}'), terminalCompleted('')]
    expect(finalAnswerOutput(events)).toBe('')
  })

  it('backfills each turn from its own stream window in a multi-turn session', () => {
    const events = [
      responseStream('First turn answer.'),
      terminalCompleted(''),
      responseStream('Second turn answer.'),
      terminalCompleted('')
    ]
    const messages = deriveMessagesFromEvents(events)
    const finals = messages.filter(m => m.type === 'final_answer')
    expect(finals).toHaveLength(2)
    expect((finals[0].content as { output?: string }).output).toBe('First turn answer.')
    expect((finals[1].content as { output?: string }).output).toBe('Second turn answer.')
  })
})
