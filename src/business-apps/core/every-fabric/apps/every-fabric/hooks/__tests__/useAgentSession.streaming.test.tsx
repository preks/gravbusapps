import { deriveFabricIsStreaming } from '../useAgentSession'

describe('deriveFabricIsStreaming', () => {
  it('is true when REST status is running', () => {
    expect(deriveFabricIsStreaming(false, 'running')).toBe(true)
  })

  it('is true when REST status is pending', () => {
    expect(deriveFabricIsStreaming(false, 'pending')).toBe(true)
  })

  it('is false when REST status is completed and client is not running', () => {
    expect(deriveFabricIsStreaming(false, 'completed')).toBe(false)
  })

  it('is true when isAgentRunning is true even if REST is completed', () => {
    expect(deriveFabricIsStreaming(true, 'completed')).toBe(true)
  })
})
