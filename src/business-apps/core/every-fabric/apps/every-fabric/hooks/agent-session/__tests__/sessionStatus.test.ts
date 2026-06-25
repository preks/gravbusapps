import type { DeepAgentSession } from '../../../types/enterpriseAgent'
import { isRestTerminalForCurrentTurn } from '../sessionStatus'

const session = (over: Partial<DeepAgentSession>): DeepAgentSession =>
  ({
    session_id: 's1',
    input: 'hi',
    status: 'completed',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    ...over
  }) as DeepAgentSession

describe('isRestTerminalForCurrentTurn', () => {
  it('returns false for null / non-terminal sessions', () => {
    expect(isRestTerminalForCurrentTurn(null, 0)).toBe(false)
    expect(isRestTerminalForCurrentTurn(session({ status: 'running' }), 0)).toBe(false)
    expect(isRestTerminalForCurrentTurn(session({ status: 'pending' }), Date.now())).toBe(false)
  })

  it('honors any terminal snapshot when no reply is in flight', () => {
    expect(isRestTerminalForCurrentTurn(session({ status: 'completed' }), 0)).toBe(true)
    expect(isRestTerminalForCurrentTurn(session({ status: 'failed' }), 0)).toBe(true)
  })

  it('rejects a stale previous-turn terminal snapshot during a follow-up', () => {
    const replySentAt = Date.parse('2026-01-01T00:05:00Z')
    // Previous turn completed long before the new reply was sent.
    const stale = session({
      status: 'completed',
      completed_at: '2026-01-01T00:00:30Z',
      updated_at: '2026-01-01T00:00:30Z'
    })
    expect(isRestTerminalForCurrentTurn(stale, replySentAt)).toBe(false)
  })

  it('honors the current turn terminal once it completes after the reply', () => {
    const replySentAt = Date.parse('2026-01-01T00:05:00Z')
    const current = session({
      status: 'completed',
      completed_at: '2026-01-01T00:05:40Z',
      updated_at: '2026-01-01T00:05:40Z'
    })
    expect(isRestTerminalForCurrentTurn(current, replySentAt)).toBe(true)
  })

  it('treats timezone-less backend timestamps as UTC', () => {
    const replySentAt = Date.parse('2026-06-25T13:32:06.900Z')
    const current = session({
      status: 'completed',
      completed_at: '2026-06-25T13:32:12.909000',
      updated_at: '2026-06-25T13:32:12.909000'
    })
    expect(isRestTerminalForCurrentTurn(current, replySentAt)).toBe(true)
  })

  it('falls back to updated_at when completed_at is missing', () => {
    const replySentAt = Date.parse('2026-01-01T00:05:00Z')
    const current = session({
      status: 'completed',
      completed_at: undefined,
      updated_at: '2026-01-01T00:05:40Z'
    })
    expect(isRestTerminalForCurrentTurn(current, replySentAt)).toBe(true)
  })
})
