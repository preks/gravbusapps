import type { AgentStreamEvent, DeepAgentSession } from '../../../types/enterpriseAgent'
import { mergeRestAndStreamSession } from '../mergeSession'

const baseSession = (overrides: Partial<DeepAgentSession> = {}): DeepAgentSession =>
  ({
    session_id: 'sess-1',
    status: 'running',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    trace: [],
    ...overrides
  }) as DeepAgentSession

describe('mergeRestAndStreamSession', () => {
  it('REST terminal status overrides SSE waiting_for_human', () => {
    const session = baseSession({ status: 'completed' })
    const events: AgentStreamEvent[] = [{ type: 'terminal', status: 'waiting_for_human', seq: 1 } as AgentStreamEvent]
    const merged = mergeRestAndStreamSession(session, null, events)
    expect(merged?.status).toBe('completed')
  })

  it('SSE terminal updates status when REST is non-terminal', () => {
    const session = baseSession({ status: 'running' })
    const events: AgentStreamEvent[] = [{ type: 'terminal', status: 'waiting_for_human', seq: 1 } as AgentStreamEvent]
    const merged = mergeRestAndStreamSession(session, null, events)
    expect(merged?.status).toBe('waiting_for_human')
  })

  it('turn_snapshot updates status like terminal when REST is non-terminal', () => {
    const session = baseSession({ status: 'running' })
    const events: AgentStreamEvent[] = [
      { type: 'turn_snapshot', status: 'waiting_for_human', seq: 1 } as AgentStreamEvent
    ]
    const merged = mergeRestAndStreamSession(session, null, events)
    expect(merged?.status).toBe('waiting_for_human')
  })

  it('carries bootstrap session_attachments when REST attachments are empty', () => {
    const session = baseSession({ session_attachments: [] })
    const bootstrap = baseSession({
      session_attachments: [{ id: 'att-1', name: 'file.png', mime_type: 'image/png', size: 100 }]
    })
    const merged = mergeRestAndStreamSession(session, bootstrap, [])
    expect(merged?.session_attachments).toHaveLength(1)
    expect(merged?.session_attachments?.[0].id).toBe('att-1')
  })
})
