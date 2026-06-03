import { deriveStreamSuppressed } from '../agent-session/sessionStatus'

describe('deriveStreamSuppressed', () => {
  it('suppresses when REST is completed and client is idle', () => {
    expect(deriveStreamSuppressed({ status: 'completed' }, false)).toBe(true)
  })

  it('does not suppress when client is mid-turn on a completed REST session', () => {
    expect(deriveStreamSuppressed({ status: 'completed' }, true)).toBe(false)
  })

  it('does not suppress when REST is running', () => {
    expect(deriveStreamSuppressed({ status: 'running' }, false)).toBe(false)
  })
})
