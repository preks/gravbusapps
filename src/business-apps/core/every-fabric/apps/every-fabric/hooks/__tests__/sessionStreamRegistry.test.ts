jest.mock('@/common/utils/serviceResolver', () => ({
  PROMPT_MANAGER_API_URL: 'https://example.test'
}))

class FakeEventSource {
  static instances: FakeEventSource[] = []
  url: string
  closed = false
  onopen: ((e: Event) => void) | null = null
  onmessage: ((e: MessageEvent) => void) | null = null
  onerror: ((e: Event) => void) | null = null

  constructor(url: string) {
    this.url = url
    FakeEventSource.instances.push(this)
  }

  close(): void {
    this.closed = true
  }

  emitOpen(): void {
    this.onopen?.(new Event('open'))
  }

  emitMessage(data: unknown): void {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent)
  }
}

const OriginalEventSource = (globalThis as unknown as { EventSource: typeof EventSource }).EventSource

beforeEach(() => {
  FakeEventSource.instances = []
  ;(globalThis as unknown as { EventSource: typeof FakeEventSource }).EventSource =
    FakeEventSource as unknown as typeof EventSource
  jest.resetModules()
})

afterAll(() => {
  ;(globalThis as unknown as { EventSource: typeof EventSource }).EventSource = OriginalEventSource
})

describe('sessionStreamRegistry', () => {
  it('reuses the same EventSource when re-acquiring within the grace window', async () => {
    const mod = await import('../sessionStreamRegistry')
    const { acquireSessionStream, __testing__ } = mod

    const first = acquireSessionStream('s1', 'token-a')
    expect(FakeEventSource.instances).toHaveLength(1)

    first.release()

    // Re-acquire immediately — should reuse the same underlying source.
    const second = acquireSessionStream('s1', 'token-a')
    expect(FakeEventSource.instances).toHaveLength(1)

    second.release()
    __testing__.disposeAll()
  })

  it('reconnects after release + grace-window expiry and re-acquire', async () => {
    jest.useFakeTimers()
    try {
      const mod = await import('../sessionStreamRegistry')
      const { acquireSessionStream, __testing__ } = mod

      const first = acquireSessionStream('s2', 'token-a')
      expect(FakeEventSource.instances).toHaveLength(1)
      first.release()

      // Advance past the grace window + sweep tick so the entry gets disposed.
      jest.advanceTimersByTime(__testing__.GRACE_MS + 5_000)

      // Re-acquire — should open a brand new EventSource.
      const second = acquireSessionStream('s2', 'token-a')
      expect(FakeEventSource.instances).toHaveLength(2)

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
    const src = FakeEventSource.instances[0]

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

  it('closes source on terminal event', async () => {
    const mod = await import('../sessionStreamRegistry')
    const { acquireSessionStream, __testing__ } = mod

    const { release } = acquireSessionStream('s4', 'token-a')
    const src = FakeEventSource.instances[0]
    src.emitOpen()
    src.emitMessage({ type: 'terminal', event_id: 't1', seq: 1, status: 'completed' })

    expect(src.closed).toBe(true)

    release()
    __testing__.disposeAll()
  })
})
