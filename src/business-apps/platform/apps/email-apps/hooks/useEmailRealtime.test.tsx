import { renderHook, act } from '@testing-library/react'
import { useEmailRealtime } from './useEmailRealtime'

jest.mock('@/business-apps/platform/apps/shared/utils/documentServiceUrl', () => ({
  getDocumentServiceApiUrl: () => 'http://localhost:3002/document/api/v1'
}))

const mockIo = jest.fn()

jest.mock('socket.io-client', () => ({
  io: (...args: unknown[]) => mockIo(...args)
}))

type Listener = (...args: any[]) => void

class FakeSocket {
  readonly listeners = new Map<string, Set<Listener>>()
  readonly on = jest.fn((event: string, handler: Listener) => {
    const handlers = this.listeners.get(event) ?? new Set<Listener>()
    handlers.add(handler)
    this.listeners.set(event, handlers)
    return this
  })
  readonly emit = jest.fn()
  readonly disconnect = jest.fn()

  trigger(event: string, payload?: unknown) {
    this.listeners.get(event)?.forEach(handler => handler(payload))
  }
}

describe('useEmailRealtime', () => {
  let fakeSocket: FakeSocket
  let lastUrl: string | undefined
  let lastOptions: Record<string, unknown> | undefined

  beforeEach(() => {
    fakeSocket = new FakeSocket()
    lastUrl = undefined
    lastOptions = undefined
    mockIo.mockReset()
    mockIo.mockImplementation((url: string, options?: Record<string, unknown>) => {
      lastUrl = url
      lastOptions = options
      return fakeSocket
    })
  })

  it('does not connect when disabled', () => {
    renderHook(() => useEmailRealtime({ accessToken: 'token-1', accountId: 'acct-1', enabled: false }))
    expect(mockIo).not.toHaveBeenCalled()
  })

  it('does not connect without an access token', () => {
    renderHook(() => useEmailRealtime({ accessToken: '', accountId: 'acct-1', enabled: true }))
    expect(mockIo).not.toHaveBeenCalled()
  })

  it('connects to the /emails namespace with the auth token', () => {
    renderHook(() => useEmailRealtime({ accessToken: 'token-1', accountId: 'acct-1', enabled: true }))
    expect(lastUrl).toBe('http://localhost:3002/emails')
    expect(lastOptions).toMatchObject({ auth: { token: 'token-1' } })
  })

  it('invokes onNewEmail for events matching the active account', () => {
    const onNewEmail = jest.fn()
    renderHook(() => useEmailRealtime({ accessToken: 'token-1', accountId: 'acct-1', enabled: true, onNewEmail }))

    act(() => {
      fakeSocket.trigger('email:new', {
        accountId: 'acct-1',
        folderId: 'folder-1',
        messageId: 'msg-1',
        receivedAt: '2026-06-03T00:00:00.000Z'
      })
    })

    expect(onNewEmail).toHaveBeenCalledWith(expect.objectContaining({ accountId: 'acct-1', messageId: 'msg-1' }))
  })

  it('ignores events for a different account', () => {
    const onNewEmail = jest.fn()
    renderHook(() => useEmailRealtime({ accessToken: 'token-1', accountId: 'acct-1', enabled: true, onNewEmail }))

    act(() => {
      fakeSocket.trigger('email:new', {
        accountId: 'acct-2',
        folderId: 'folder-9',
        messageId: 'msg-9',
        receivedAt: '2026-06-03T00:00:00.000Z'
      })
    })

    expect(onNewEmail).not.toHaveBeenCalled()
  })

  it('disconnects on unmount', () => {
    const { unmount } = renderHook(() =>
      useEmailRealtime({ accessToken: 'token-1', accountId: 'acct-1', enabled: true })
    )
    unmount()
    expect(fakeSocket.disconnect).toHaveBeenCalled()
  })
})
