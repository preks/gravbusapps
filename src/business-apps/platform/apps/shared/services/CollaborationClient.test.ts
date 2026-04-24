import { CollaborationClient } from './CollaborationClient'

const mockIo = jest.fn()

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args)
}))

type Listener = (...args: any[]) => void

class FakeSocket {
  connected = false
  id = 'socket-1'
  auth: Record<string, unknown> = {}
  readonly listeners = new Map<string, Set<Listener>>()
  readonly io = {
    engine: {
      transport: { name: 'websocket' },
      on: jest.fn()
    },
    on: jest.fn()
  }
  readonly on = jest.fn((event: string, handler: Listener) => {
    const handlers = this.listeners.get(event) ?? new Set<Listener>()
    handlers.add(handler)
    this.listeners.set(event, handlers)
    return this
  })
  readonly off = jest.fn((event: string, handler?: Listener) => {
    if (!handler) {
      this.listeners.delete(event)
      return this
    }
    this.listeners.get(event)?.delete(handler)
    return this
  })
  readonly emit = jest.fn()
  readonly connect = jest.fn(() => {
    this.connected = true
    this.trigger('connect')
    return this
  })
  readonly disconnect = jest.fn(() => {
    this.connected = false
    this.trigger('disconnect', 'io client disconnect')
    return this
  })

  trigger(event: string, ...args: unknown[]) {
    for (const handler of this.listeners.get(event) ?? []) {
      handler(...args)
    }
  }
}

describe('CollaborationClient', () => {
  let fakeSocket: FakeSocket
  let lastConnectOptions: Record<string, unknown> | undefined

  beforeEach(() => {
    fakeSocket = new FakeSocket()
    lastConnectOptions = undefined
    mockIo.mockReset()
    mockIo.mockImplementation((_url: string, options?: Record<string, unknown>) => {
      fakeSocket.auth = (options?.auth as Record<string, unknown>) ?? {}
      lastConnectOptions = options
      return fakeSocket
    })
  })

  it('enables long-polling fallback by default', () => {
    const client = new CollaborationClient('http://localhost:3002/collaboration')

    client.connect('token-1')

    expect(lastConnectOptions).toMatchObject({
      transports: ['websocket', 'polling'],
      tryAllTransports: true
    })
  })

  it('keeps websocket-only mode when polling fallback is disabled', () => {
    const client = new CollaborationClient('http://localhost:3002/collaboration', {
      enablePollingFallback: false
    })

    client.connect('token-1')

    expect(lastConnectOptions).toMatchObject({
      transports: ['websocket'],
      tryAllTransports: false
    })
  })
})
