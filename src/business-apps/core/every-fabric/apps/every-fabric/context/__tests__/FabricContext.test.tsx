import React from 'react'
import { act, renderHook, waitFor } from '@testing-library/react'
import { FabricProvider, useFabric } from '../FabricContext'

const mockStartSession = jest.fn()
const mockActivateSession = jest.fn()
const mockUseAgentSession = jest.fn()
const mockAddSession = jest.fn()
const mockUpdateSession = jest.fn()
const mockRemoveSession = jest.fn()

jest.mock('../../hooks/useAgentSession', () => ({
  useAgentSession: (...args: unknown[]) => mockUseAgentSession(...args)
}))

jest.mock('../../hooks/useAgentSessions', () => ({
  useAgentSessions: jest.fn(() => ({
    sessions: [],
    addSession: mockAddSession,
    updateSession: mockUpdateSession,
    removeSession: mockRemoveSession
  }))
}))

jest.mock('../../hooks/useFabricArtifacts', () => ({
  useFabricArtifacts: jest.fn(() => ({
    artifacts: [],
    workspaceDocs: [],
    activeArtifactId: null,
    activeArtifact: null,
    setActiveArtifactId: jest.fn(),
    refreshArtifacts: jest.fn()
  }))
}))

jest.mock('../../hooks/useFabricPlan', () => ({
  useFabricPlan: jest.fn(() => ({
    taskNodes: [],
    hasPlan: false,
    completedCount: 0,
    totalCount: 0,
    progressPercent: 0,
    todos: [],
    currentTodoText: null
  }))
}))

jest.mock('../../hooks/useFabricDecisions', () => ({
  useFabricDecisions: jest.fn(() => [])
}))

describe('FabricContext session URL sync', () => {
  const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <FabricProvider accessToken="token" userInfo={undefined}>
      {children}
    </FabricProvider>
  )

  beforeEach(() => {
    window.history.pushState({}, '', '/platform/every-fabric')
    mockStartSession.mockReset()
    mockActivateSession.mockReset()
    mockUseAgentSession.mockReset()
    mockAddSession.mockReset()
    mockUpdateSession.mockReset()
    mockRemoveSession.mockReset()

    mockUseAgentSession.mockImplementation((_sessionId, _accessToken, bootstrapSession) => ({
      session: bootstrapSession ?? null,
      messages: [],
      events: [],
      streamingGreeting: '',
      streamingContent: '',
      statusHeadline: null,
      isConnected: false,
      isStreaming: false,
      isWaitingForInput: false,
      sessionLoadError: false,
      activeSkill: null,
      startSession: mockStartSession,
      activateSession: mockActivateSession,
      reply: jest.fn(),
      retrySessionLoad: jest.fn()
    }))
  })

  it('keeps an internally selected session instead of resetting it from stale url state', async () => {
    const { result } = renderHook(() => useFabric(), { wrapper })

    act(() => {
      result.current.selectSession('session-123')
    })

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-123')
      expect(window.location.search).toContain('sessionId=session-123')
    })
  })

  it('still syncs the active session from browser navigation events', async () => {
    const { result } = renderHook(() => useFabric(), { wrapper })

    act(() => {
      window.history.pushState({}, '', '/platform/every-fabric?sessionId=session-from-history')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-from-history')
    })
  })

  it('does not block later browser navigation after re-selecting the already active session', async () => {
    window.history.pushState({}, '', '/platform/every-fabric?sessionId=session-123')

    const { result } = renderHook(() => useFabric(), { wrapper })

    act(() => {
      result.current.selectSession('session-123')
    })

    act(() => {
      window.history.pushState({}, '', '/platform/every-fabric?sessionId=session-456')
      window.dispatchEvent(new PopStateEvent('popstate'))
    })

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-456')
    })
  })

  it('keeps the bootstrap session available after starting a new session', async () => {
    const bootstrapSession = {
      session_id: 'session-started',
      input: 'Draft a plan',
      status: 'running' as const,
      created_at: '2026-04-14T12:00:00.000Z',
      updated_at: '2026-04-14T12:00:00.000Z',
      trace: []
    }
    mockStartSession.mockResolvedValue({
      session_id: 'session-started',
      status: 'running',
      session: bootstrapSession
    })
    mockActivateSession.mockResolvedValue({
      session_id: 'session-started',
      status: 'running',
      session: bootstrapSession
    })

    const { result } = renderHook(() => useFabric(), { wrapper })

    await act(async () => {
      await result.current.startSession('Draft a plan')
    })

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-started')
      expect(result.current.session?.session_id).toBe('session-started')
      expect(window.location.search).toContain('sessionId=session-started')
    })
  })

  it('restores a bootstrap session from history state on mount', async () => {
    const bootstrapSession = {
      session_id: 'session-from-history-state',
      input: 'Continue startup',
      status: 'running' as const,
      created_at: '2026-04-14T12:00:00.000Z',
      updated_at: '2026-04-14T12:00:00.000Z',
      trace: []
    }
    window.history.replaceState(
      { everyFabricBootstrapSession: bootstrapSession },
      '',
      '/platform/every-fabric?sessionId=session-from-history-state'
    )

    const { result } = renderHook(() => useFabric(), { wrapper })

    await waitFor(() => {
      expect(result.current.activeSessionId).toBe('session-from-history-state')
      expect(result.current.session?.session_id).toBe('session-from-history-state')
    })
  })
})
