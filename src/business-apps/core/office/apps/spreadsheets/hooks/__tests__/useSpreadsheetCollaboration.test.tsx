import { renderHook, act, waitFor } from '@testing-library/react'
import type { DocumentOperation } from '@/business-apps/platform/apps/shared/services/CollaborationClient'
import { useSpreadsheetCollaboration } from '../useSpreadsheetCollaboration'

const mockOfficeClientInstances: Array<{
  socket: { connected: boolean; id: string }
  setAccessToken: jest.Mock
  connect: jest.Mock
  disconnect: jest.Mock
  getSocket: jest.Mock
  isHealthy: jest.Mock
  joinDocument: jest.Mock
  leaveDocument: jest.Mock
  sendDocumentOperation: jest.Mock
  sendDocumentOperationAsync: jest.Mock
  sendCursorMove: jest.Mock
  trigger: (event: string, ...args: unknown[]) => void
  resolveLatestJoin: (participants?: unknown[]) => void
}> = []

jest.mock('@/common/network/graphql/useGraphQLClient', () => ({
  useGraphQLClient: () => ({
    request: jest.fn().mockResolvedValue({ Employee: [] })
  })
}))

jest.mock('@/common/network/office/OfficeWebSocketClient', () => {
  type Listener = (...args: unknown[]) => void

  class MockOfficeWebSocketClient {
    socket = {
      connected: false,
      id: 'socket-1'
    }

    listeners = new Map<string, Set<Listener>>()

    setAccessToken = jest.fn()
    connect = jest.fn(() => this.socket)
    disconnect = jest.fn(() => {
      this.socket.connected = false
    })
    getSocket = jest.fn(() => this.socket)
    isHealthy = jest.fn(() => true)
    joinDocument = jest.fn(
      (() => true) as (entityType: string, entityId: string, ack?: (participants: unknown[]) => void) => boolean
    )
    leaveDocument = jest.fn()
    sendDocumentOperation = jest.fn()
    sendDocumentOperationAsync = jest.fn().mockResolvedValue({ success: true, version: 5 })
    sendCursorMove = jest.fn()
    onConnect = jest.fn((handler: Listener) => this.register('connect', handler))
    onDisconnect = jest.fn((handler: Listener) => this.register('disconnect', handler))
    onConnectError = jest.fn((handler: Listener) => this.register('connect_error', handler))
    onUserJoined = jest.fn((handler: Listener) => this.register('user_joined', handler))
    onUserLeft = jest.fn((handler: Listener) => this.register('user_left', handler))
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
      const latestCall = this.joinDocument.mock.calls.at(-1)
      latestCall?.[2]?.(participants)
    }
  }

  return {
    OfficeWebSocketClient: jest.fn().mockImplementation(() => {
      const instance = new MockOfficeWebSocketClient()
      mockOfficeClientInstances.push(instance)
      return instance
    })
  }
})

function createCallbacks() {
  return {
    getActiveSheetId: jest.fn(() => 'sheet-1'),
    getColumns: jest.fn(() => []),
    getLocalSheetData: jest.fn(() => []),
    getBackendRowIdForUiRowId: jest.fn(() => 'row-1'),
    commitLocalSheetData: jest.fn(),
    applyRemoteCellUpdate: jest.fn(),
    applyRemoteDimensions: jest.fn(),
    onVersionUpdate: jest.fn(),
    scheduleSheetVersionRefreshFromApi: jest.fn(),
    scheduleRemoteStructuralResync: jest.fn()
  }
}

describe('useSpreadsheetCollaboration', () => {
  beforeEach(() => {
    mockOfficeClientInstances.length = 0
    jest.clearAllMocks()
  })

  it('joins spreadsheet collaboration through the office socket client', async () => {
    const { result } = renderHook(() =>
      useSpreadsheetCollaboration({
        appId: 'app-1',
        accessToken: 'invalid.token.value',
        callbacks: createCallbacks()
      })
    )

    const client = mockOfficeClientInstances[0]

    act(() => {
      client.socket.connected = true
      client.trigger('connect')
      client.resolveLatestJoin([
        {
          userId: 'user-2',
          userName: 'Alice',
          userColor: '#123456',
          socketId: 'socket-2'
        }
      ])
    })

    await waitFor(() => {
      expect(result.current.isCollaborationConnected).toBe(true)
      expect(result.current.headerParticipants).toHaveLength(1)
    })

    expect(client.joinDocument).toHaveBeenCalledWith('spreadsheet', 'app-1', expect.any(Function))
    expect(result.current.headerParticipants[0]?.userId).toBe('user-2')
  })

  it('refreshes the spreadsheet socket token from the global auth event', async () => {
    renderHook(() =>
      useSpreadsheetCollaboration({
        appId: 'app-1',
        accessToken: 'token-1',
        callbacks: createCallbacks()
      })
    )

    const client = mockOfficeClientInstances[0]

    await waitFor(() => {
      expect(client.setAccessToken).toHaveBeenCalledWith('token-1')
    })

    act(() => {
      window.dispatchEvent(
        new CustomEvent('com.newwork.token.shouldRefreshAuthorizationHeader', {
          detail: { accessToken: 'token-2' }
        })
      )
    })

    expect(client.setAccessToken).toHaveBeenLastCalledWith('token-2')
  })

  it('flushes queued spreadsheet operations after the office socket joins', async () => {
    const { result } = renderHook(() =>
      useSpreadsheetCollaboration({
        appId: 'app-1',
        accessToken: 'token-1',
        callbacks: createCallbacks()
      })
    )

    const client = mockOfficeClientInstances[0]
    const operation: DocumentOperation = {
      type: 'dimension_sync',
      data: { sheetId: 'sheet-1' }
    }

    act(() => {
      result.current.emitOperation(operation)
    })

    expect(client.sendDocumentOperation).not.toHaveBeenCalled()

    act(() => {
      client.socket.connected = true
      client.trigger('connect')
      client.resolveLatestJoin([])
    })

    await waitFor(() => {
      expect(client.sendDocumentOperation).toHaveBeenCalledWith('spreadsheet', 'app-1', operation, expect.any(Function))
    })
  })

  it('resets state on disconnect and marks health as reconnecting', async () => {
    const { result } = renderHook(() =>
      useSpreadsheetCollaboration({
        appId: 'app-1',
        accessToken: 'token-1',
        callbacks: createCallbacks()
      })
    )

    const client = mockOfficeClientInstances[0]

    act(() => {
      client.socket.connected = true
      client.trigger('connect')
      client.resolveLatestJoin([{ userId: 'user-2', userName: 'Alice', userColor: '#123456', socketId: 'socket-2' }])
    })

    await waitFor(() => {
      expect(result.current.isCollaborationConnected).toBe(true)
      expect(result.current.isCollaborationJoined).toBe(true)
    })

    act(() => {
      client.socket.connected = false
      client.trigger('disconnect', 'transport close')
    })

    await waitFor(() => {
      expect(result.current.isCollaborationConnected).toBe(false)
      expect(result.current.isCollaborationJoined).toBe(false)
      expect(result.current.collaborationHealth).toBe('reconnecting')
      expect(result.current.headerParticipants).toHaveLength(0)
    })
  })

  it('removes a participant when user_left fires', async () => {
    const { result } = renderHook(() =>
      useSpreadsheetCollaboration({
        appId: 'app-1',
        accessToken: 'token-1',
        callbacks: createCallbacks()
      })
    )

    const client = mockOfficeClientInstances[0]

    act(() => {
      client.socket.connected = true
      client.trigger('connect')
      client.resolveLatestJoin([
        { userId: 'user-2', userName: 'Alice', userColor: '#aaa', socketId: 's-2' },
        { userId: 'user-3', userName: 'Bob', userColor: '#bbb', socketId: 's-3' }
      ])
    })

    await waitFor(() => {
      expect(result.current.headerParticipants).toHaveLength(2)
    })

    act(() => {
      client.trigger('user_left', { userId: 'user-2' })
    })

    await waitFor(() => {
      expect(result.current.headerParticipants).toHaveLength(1)
      expect(result.current.headerParticipants[0]?.userId).toBe('user-3')
    })
  })

  it('calls leaveDocument on unmount when joined', async () => {
    const { result, unmount } = renderHook(() =>
      useSpreadsheetCollaboration({
        appId: 'app-1',
        accessToken: 'token-1',
        callbacks: createCallbacks()
      })
    )

    const client = mockOfficeClientInstances[0]

    act(() => {
      client.socket.connected = true
      client.trigger('connect')
      client.resolveLatestJoin([])
    })

    await waitFor(() => {
      expect(result.current.isCollaborationJoined).toBe(true)
    })

    unmount()

    expect(client.leaveDocument).toHaveBeenCalledWith('spreadsheet', 'app-1')
    expect(client.disconnect).toHaveBeenCalled()
  })

  it('propagates connect_error to the onError callback', async () => {
    const onError = jest.fn()

    renderHook(() =>
      useSpreadsheetCollaboration({
        appId: 'app-1',
        accessToken: 'token-1',
        callbacks: createCallbacks(),
        onError
      })
    )

    const client = mockOfficeClientInstances[0]
    const error = new Error('connection refused')

    act(() => {
      client.trigger('connect_error', error)
    })

    await waitFor(() => {
      expect(onError).toHaveBeenCalledWith(error)
    })
  })

  it('wires the async document operation channel to the manager', async () => {
    const callbacks = createCallbacks()
    const { result } = renderHook(() =>
      useSpreadsheetCollaboration({
        appId: 'app-1',
        accessToken: 'token-1',
        callbacks
      })
    )

    const client = mockOfficeClientInstances[0]

    act(() => {
      client.socket.connected = true
      client.trigger('connect')
      client.resolveLatestJoin([])
    })

    await waitFor(() => {
      expect(result.current.isCollaborationJoined).toBe(true)
    })

    const persistResult = await act(() =>
      result.current.manager.persistCellsChangedToServer([{ rowId: 'ui-1', columnName: 'Name', value: 'hello' }])
    )

    expect(client.sendDocumentOperationAsync).toHaveBeenCalledWith(
      'spreadsheet',
      'app-1',
      expect.objectContaining({ type: 'cells_changed' })
    )
    expect(persistResult.success).toBe(true)
    expect(persistResult.version).toBe(5)
  })
})
