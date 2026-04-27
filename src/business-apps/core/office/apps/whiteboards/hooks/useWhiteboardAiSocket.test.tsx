import { renderHook } from '@testing-library/react'
import { useWhiteboardAiSocket } from './useWhiteboardAiSocket'

jest.mock('@/business-apps/platform/apps/shared/utils/documentServiceUrl', () => ({
  getDocumentServiceApiUrl: () => 'http://localhost:3002/document/api/v1'
}))

const mockIo = jest.fn()

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args)
}))

type Listener = (...args: any[]) => void

class FakeSocket {
  connected = false
  readonly listeners = new Map<string, Set<Listener>>()
  readonly on = jest.fn((event: string, handler: Listener) => {
    const handlers = this.listeners.get(event) ?? new Set<Listener>()
    handlers.add(handler)
    this.listeners.set(event, handlers)
    return this
  })
  readonly emit = jest.fn()
  readonly disconnect = jest.fn()
}

describe('useWhiteboardAiSocket', () => {
  let fakeSocket: FakeSocket
  let lastConnectOptions: Record<string, unknown> | undefined

  beforeEach(() => {
    fakeSocket = new FakeSocket()
    lastConnectOptions = undefined
    mockIo.mockReset()
    mockIo.mockImplementation((_url: string, options?: Record<string, unknown>) => {
      lastConnectOptions = options
      return fakeSocket
    })
  })

  it('enables long-polling fallback when websocket is tested first', () => {
    renderHook(() =>
      useWhiteboardAiSocket({
        whiteboardId: 'whiteboard-1',
        accessToken: 'token-1'
      })
    )

    expect(lastConnectOptions).toMatchObject({
      transports: ['websocket', 'polling'],
      tryAllTransports: true
    })
  })
})
