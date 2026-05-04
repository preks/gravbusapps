import { act, renderHook, waitFor } from '@testing-library/react'
import { useCollaboration } from '../useCollaboration'

const mockCollaborationClientInstances: Array<{
  socket: {
    connected: boolean
    id: string
    on: jest.Mock
    off: jest.Mock
  }
  setAccessToken: jest.Mock
  connect: jest.Mock
  disconnect: jest.Mock
  getSocket: jest.Mock
  isConnected: jest.Mock
  joinDocument: jest.Mock
  leaveDocument: jest.Mock
  sendDocumentOperation: jest.Mock
  sendDocumentOperationAsync: jest.Mock
  sendCursorMove: jest.Mock
  sendSelectionChange: jest.Mock
  sendTypingStart: jest.Mock
  sendTypingStop: jest.Mock
  forceReconnect: jest.Mock
  trigger: (event: string, ...args: unknown[]) => void
  resolveLatestJoin: (participants?: unknown[]) => void
}> = []

jest.mock('@/business-apps/platform/apps/shared/services/CollaborationClient', () => {
  type Listener = (...args: unknown[]) => void

  class MockCollaborationClient {
    listeners = new Map<string, Set<Listener>>()

    socket = {
      connected: false,
      id: 'socket-1',
      on: jest.fn((event: string, handler: Listener) => this.register(event, handler)),
      off: jest.fn((event: string, handler: Listener) => {
        this.listeners.get(event)?.delete(handler)
      })
    }

    setAccessToken = jest.fn()
    connect = jest.fn(() => this.socket)
    disconnect = jest.fn(() => {
      this.socket.connected = false
    })
    getSocket = jest.fn(() => this.socket)
    isConnected = jest.fn(() => this.socket.connected)
    joinDocument = jest.fn(
      (() => true) as (entityType: string, entityId: string, ack?: (participants: unknown[]) => void) => boolean
    )
    leaveDocument = jest.fn()
    sendDocumentOperation = jest.fn()
    sendDocumentOperationAsync = jest.fn().mockResolvedValue({ success: true, version: 3 })
    sendCursorMove = jest.fn()
    sendSelectionChange = jest.fn()
    sendTypingStart = jest.fn()
    sendTypingStop = jest.fn()
    forceReconnect = jest.fn()
    onUserJoined = jest.fn((handler: Listener) => this.register('user_joined', handler))
    onUserLeft = jest.fn((handler: Listener) => this.register('user_left', handler))
    onParticipantsUpdated = jest.fn((handler: Listener) => this.register('participants_updated', handler))
    onOperationApplied = jest.fn((handler: Listener) => this.register('operation_applied', handler))
    onCursorUpdate = jest.fn((handler: Listener) => this.register('cursor_update', handler))
    onSelectionUpdate = jest.fn((handler: Listener) => this.register('selection_update', handler))

    private register(event: string, handler: Listener) {
      const handlers = this.listeners.get(event) ?? new Set<Listener>()
      handlers.add(handler)
      this.listeners.set(event, handlers)

      return () => {
        handlers.delete(handler)
      }
    }

    trigger(event: string, ...args: unknown[]) {
      for (const handler of this.listeners.get(event) ?? []) {
        handler(...args)
      }
    }

    resolveLatestJoin(participants: unknown[] = []) {
      const latestCall = this.joinDocument.mock.calls[this.joinDocument.mock.calls.length - 1]
      latestCall?.[2]?.(participants)
    }
  }

  return {
    CollaborationClient: MockCollaborationClient,
    createCollaborationClient: jest.fn().mockImplementation(() => {
      const instance = new MockCollaborationClient()
      mockCollaborationClientInstances.push(instance)
      return instance
    }),
    createSpreadsheetCollaborationClient: jest.fn().mockImplementation(() => {
      const instance = new MockCollaborationClient()
      mockCollaborationClientInstances.push(instance)
      return instance
    })
  }
})

describe('useCollaboration', () => {
  beforeEach(() => {
    mockCollaborationClientInstances.length = 0
    jest.clearAllMocks()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  it('refreshes the collaboration token from the global auth event and restores the socket after reconnect', async () => {
    const { result } = renderHook(() =>
      useCollaboration({
        entityType: 'note',
        entityId: 'note-1',
        accessToken: 'token-1'
      })
    )

    const client = mockCollaborationClientInstances[0]

    expect(client.connect).toHaveBeenCalledWith('token-1')

    act(() => {
      client.socket.connected = true
      client.trigger('connect')
      client.resolveLatestJoin([])
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
      expect(result.current.hasJoined).toBe(true)
      expect(result.current.socket).toBe(client.socket)
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('com.newwork.token.shouldRefreshAuthorizationHeader', {
          detail: { accessToken: 'token-2' }
        })
      )
    })

    expect(client.setAccessToken).toHaveBeenLastCalledWith('token-2')

    act(() => {
      client.socket.connected = false
      client.trigger('disconnect', 'transport close')
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(false)
      expect(result.current.socket).toBeNull()
      expect(result.current.collaborationHealth).toBe('reconnecting')
    })

    act(() => {
      client.socket.connected = true
      client.trigger('connect')
      client.resolveLatestJoin([])
    })

    await waitFor(() => {
      expect(result.current.isConnected).toBe(true)
      expect(result.current.hasJoined).toBe(true)
      expect(result.current.socket).toBe(client.socket)
    })

    expect(client.joinDocument).toHaveBeenCalledTimes(2)
  })

  it('requires an injected access token instead of falling back to legacy browser storage', async () => {
    const onError = jest.fn()

    window.localStorage.setItem('business-app-ide-access-token', 'legacy-token')
    window.localStorage.setItem('keycloak-token', JSON.stringify({ access_token: 'legacy-token' }))
    window.sessionStorage.setItem('auth_token', 'legacy-token')

    const { result } = renderHook(() =>
      useCollaboration({
        entityType: 'note',
        entityId: 'note-1',
        onError
      })
    )

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(expect.any(Error))
    })

    expect(onError.mock.calls[0]?.[0]).toMatchObject({
      message: 'No authentication token available'
    })
    expect(mockCollaborationClientInstances).toHaveLength(0)
    expect(result.current.isConnected).toBe(false)
    expect(result.current.socket).toBeNull()
  })
})
