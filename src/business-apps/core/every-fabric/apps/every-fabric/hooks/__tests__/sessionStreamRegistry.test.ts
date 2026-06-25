import type { ConnectPromptManagerSseOptions } from '../../utils/promptManagerSse'

jest.mock('@/common/utils/serviceResolver', () => ({
  PROMPT_MANAGER_API_URL: 'https://example.test'
}))

class FakeSseConnection {
  static instances: FakeSseConnection[] = []
  abort = jest.fn()
  readonly opts: ConnectPromptManagerSseOptions

  constructor(opts: ConnectPromptManagerSseOptions) {
    this.opts = opts
    FakeSseConnection.instances.push(this)
  }

  emitOpen(): void {
    this.opts.onOpen?.()
  }

  emitMessage(data: unknown): void {
    this.opts.onMessage(JSON.stringify(data))
  }

  emitError(): void {
    this.opts.onError?.()
  }
}

jest.mock('../../utils/promptManagerSse', () => ({
  connectPromptManagerSse: (opts: ConnectPromptManagerSseOptions) => new FakeSseConnection(opts)
}))

beforeEach(() => {
  FakeSseConnection.instances = []
  jest.resetModules()
})

describe('sessionStreamRegistry', () => {
  it('reuses the same SSE connection when re-acquiring within the grace window', async () => {
    const mod = await import('../sessionStreamRegistry')
    const { acquireSessionStream, __testing__ } = mod

    const first = acquireSessionStream('s1', 'token-a')
    expect(FakeSseConnection.instances).toHaveLength(1)

    first.release()

    const second = acquireSessionStream('s1', 'token-a')
    expect(FakeSseConnection.instances).toHaveLength(1)

    second.release()
    __testing__.disposeAll()
  })

  it('reconnects after release + grace-window expiry and re-acquire', async () => {
    jest.useFakeTimers()
    try {
      const mod = await import('../sessionStreamRegistry')
      const { acquireSessionStream, __testing__ } = mod

      const first = acquireSessionStream('s2', 'token-a')
      expect(FakeSseConnection.instances).toHaveLength(1)
      first.release()

      jest.advanceTimersByTime(__testing__.GRACE_MS + 5_000)

      const second = acquireSessionStream('s2', 'token-a')
      expect(FakeSseConnection.instances).toHaveLength(2)

      second.release()
      __testing__.disposeAll()
    } finally {
      jest.useRealTimers()
    }
  })

  it('dedupes events by event_id and updates lastSeq', async () => {
    const mod = await import('../sessionStreamRegistry')
    const { acquireSessionStream, getSessionStreamState, subscribeSessionStream, __testing__ } = mod

    const { release } = acquireSessionStream('s3', 'token-a')
    const src = FakeSseConnection.instances[0]

    let notifyCount = 0
    const unsubscribe = subscribeSessionStream('s3', () => {
      notifyCount++
    })

    src.emitOpen()
    src.emitMessage({ type: 'agent_chunk', event_id: 'e1', seq: 3, content: 'hello' })
    src.emitMessage({ type: 'agent_chunk', event_id: 'e1', seq: 3, content: 'duplicate' })
    src.emitMessage({ type: 'agent_chunk', event_id: 'e2', seq: 5, content: 'world' })

    const state = getSessionStreamState('s3')!
    expect(state.events).toHaveLength(2)
    expect(state.lastSeq).toBe(5)
    expect(state.isConnected).toBe(true)
    expect(notifyCount).toBeGreaterThan(0)

    unsubscribe()
    release()
    __testing__.disposeAll()
  })

  it('coalesces cumulative response_stream snapshots in place', async () => {
    const mod = await import('../sessionStreamRegistry')
    const { acquireSessionStream, getSessionStreamState, subscribeSessionStream, __testing__ } = mod

    const { release } = acquireSessionStream('s3b', 'token-a')
    const src = FakeSseConnection.instances[0]

    let notifyCount = 0
    const unsubscribe = subscribeSessionStream('s3b', () => {
      notifyCount++
    })

    src.emitOpen()
    src.emitMessage({
      type: 'agent_chunk',
      role: 'ai',
      chunk_kind: 'response_stream',
      event_id: 'rs-1',
      seq: 3,
      content: 'Hello',
      metadata: { stream_key: 'primary', segment_id: 0 }
    })
    src.emitMessage({
      type: 'agent_chunk',
      role: 'ai',
      chunk_kind: 'response_stream',
      event_id: 'rs-2',
      seq: 4,
      content: 'Hello world',
      metadata: { stream_key: 'primary', segment_id: 0 }
    })

    const state = getSessionStreamState('s3b')!
    expect(state.events).toHaveLength(1)
    expect(state.events[0]).toMatchObject({ content: 'Hello world', seq: 4 })
    expect(notifyCount).toBeGreaterThanOrEqual(2)

    unsubscribe()
    release()
    __testing__.disposeAll()
  })

  it('closes source on terminal event', async () => {
    const mod = await import('../sessionStreamRegistry')
    const { acquireSessionStream, __testing__ } = mod

    const { release } = acquireSessionStream('s4', 'token-a')
    const src = FakeSseConnection.instances[0]
    src.emitOpen()
    src.emitMessage({ type: 'terminal', event_id: 't1', seq: 1, status: 'completed' })

    expect(src.abort).toHaveBeenCalled()

    release()
    __testing__.disposeAll()
  })

  it('closes source on turn_snapshot event', async () => {
    const mod = await import('../sessionStreamRegistry')
    const { acquireSessionStream, getSessionStreamState, __testing__ } = mod

    const { release } = acquireSessionStream('s4b', 'token-a')
    const src = FakeSseConnection.instances[0]
    src.emitOpen()
    src.emitMessage({ type: 'turn_snapshot', event_id: 'ts1', seq: 1, status: 'completed' })

    expect(src.abort).toHaveBeenCalled()
    expect(getSessionStreamState('s4b')?.terminalReached).toBe(true)

    release()
    __testing__.disposeAll()
  })

  it('stops reconnecting after markSessionStreamRestTerminal', async () => {
    jest.useFakeTimers()
    try {
      const mod = await import('../sessionStreamRegistry')
      const { acquireSessionStream, markSessionStreamRestTerminal, __testing__ } = mod

      const { release } = acquireSessionStream('s5', 'token-a')
      const src = FakeSseConnection.instances[0]
      src.emitOpen()
      markSessionStreamRestTerminal('s5')
      const countAfterMark = FakeSseConnection.instances.length

      src.emitError()
      jest.advanceTimersByTime(20_000)

      expect(FakeSseConnection.instances).toHaveLength(countAfterMark)

      release()
      __testing__.disposeAll()
    } finally {
      jest.useRealTimers()
    }
  })

  it('gives up after consecutive empty closes', async () => {
    jest.useFakeTimers()
    try {
      const mod = await import('../sessionStreamRegistry')
      const { acquireSessionStream, getSessionStreamState, __testing__ } = mod

      const { release } = acquireSessionStream('s6', 'token-a')
      const initialCount = FakeSseConnection.instances.length

      for (let i = 0; i < 3; i++) {
        const src = FakeSseConnection.instances[FakeSseConnection.instances.length - 1]
        src.emitOpen()
        src.opts.onClose?.()
        jest.advanceTimersByTime(5_000)
      }

      expect(getSessionStreamState('s6')?.terminalReached).toBe(true)
      const countBeforeError = FakeSseConnection.instances.length
      FakeSseConnection.instances[FakeSseConnection.instances.length - 1]?.emitError()
      jest.advanceTimersByTime(20_000)
      expect(FakeSseConnection.instances).toHaveLength(countBeforeError)
      expect(FakeSseConnection.instances.length).toBeGreaterThan(initialCount)

      release()
      __testing__.disposeAll()
    } finally {
      jest.useRealTimers()
    }
  })

  it('resetSessionStream preserves lastSeq', async () => {
    const mod = await import('../sessionStreamRegistry')
    const { acquireSessionStream, resetSessionStream, getSessionStreamState, __testing__ } = mod

    const { release } = acquireSessionStream('s7', 'token-a')
    const src = FakeSseConnection.instances[0]
    src.emitOpen()
    src.emitMessage({ type: 'agent_chunk', event_id: 'e1', seq: 42, content: 'x' })

    resetSessionStream('s7', false)

    const state = getSessionStreamState('s7')!
    expect(state.lastSeq).toBe(42)
    expect(state.events).toHaveLength(0)

    release()
    __testing__.disposeAll()
  })
})
