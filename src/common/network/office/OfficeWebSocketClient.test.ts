jest.mock('@/common/utils/serviceResolver', () => ({
  DOCUMENT_WEB_SOCKET_URL: 'http://localhost:3002/document'
}))

import { OfficeWebSocketClient } from './OfficeWebSocketClient'

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
      transport: { name: 'websocket' }
    }
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
  readonly emit = jest.fn((_event: string, _payload?: unknown, ack?: (response: unknown) => void) => {
    if (typeof ack === 'function') {
      ack({ success: true, version: 11 })
    }
    return true
  })
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

describe('OfficeWebSocketClient', () => {
  let fakeSocket: FakeSocket

  beforeEach(() => {
    fakeSocket = new FakeSocket()
    mockIo.mockReset()
    mockIo.mockImplementation((_url: string, options?: { auth?: Record<string, unknown> }) => {
      fakeSocket.auth = options?.auth ?? {}
      return fakeSocket
    })
  })

  it('creates the socket with bearer auth', () => {
    const client = new OfficeWebSocketClient('http://localhost:3002/document')

    client.connect('token-1')

    expect(mockIo).toHaveBeenCalledTimes(1)
    expect(fakeSocket.auth).toEqual({
      token: 'token-1',
      clientVersion: '1'
    })
  })

  it('updates socket auth and reconnects when the token changes', () => {
    const client = new OfficeWebSocketClient('http://localhost:3002/document')

    client.connect('token-1')
    fakeSocket.connected = true

    client.setAccessToken('token-2')

    expect(fakeSocket.auth).toEqual({
      token: 'token-2',
      clientVersion: '1'
    })
    expect(fakeSocket.disconnect).toHaveBeenCalled()
    expect(fakeSocket.connect).toHaveBeenCalled()
  })

  it('supports async document operation acknowledgements', async () => {
    const client = new OfficeWebSocketClient('http://localhost:3002/document')

    client.connect('token-1')
    fakeSocket.connected = true

    const response = await (client as any).sendDocumentOperationAsync('spreadsheet', 'sheet-1', {
      type: 'cells_changed'
    })

    expect(response).toEqual({ success: true, version: 11 })
    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'document_operation',
      {
        entityType: 'spreadsheet',
        entityId: 'sheet-1',
        operation: { type: 'cells_changed' }
      },
      expect.any(Function)
    )
  })

  it('joins spreadsheet collaboration through the office transport', () => {
    const client = new OfficeWebSocketClient('http://localhost:3002/document')

    client.connect('token-1')
    fakeSocket.connected = true

    client.joinDocument('spreadsheet', 'sheet-1')

    expect(fakeSocket.emit).toHaveBeenCalledWith(
      'join_document',
      { entityType: 'spreadsheet', entityId: 'sheet-1' },
      expect.any(Function)
    )
  })
})
