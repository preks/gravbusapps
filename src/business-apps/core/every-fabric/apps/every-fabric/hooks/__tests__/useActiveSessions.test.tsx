import { act, renderHook, waitFor } from '@testing-library/react'
import type { ConnectPromptManagerSseOptions } from '../../utils/promptManagerSse'

const mockGetActiveSessions = jest.fn()
const mockGetActiveSessionsSummary = jest.fn()
const mockBuildStreamUrl = jest.fn(() => 'https://example.test/stream')

jest.mock('../useEnterpriseAgentClient', () => ({
  useEnterpriseAgentClient: () => ({
    getActiveSessions: mockGetActiveSessions,
    getActiveSessionsSummary: mockGetActiveSessionsSummary,
    buildActiveSessionsStreamUrl: mockBuildStreamUrl
  })
}))

class FakeSseConnection {
  static instances: FakeSseConnection[] = []
  abort = jest.fn()
  private readonly opts: ConnectPromptManagerSseOptions

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

import { useActiveSessions } from '../useActiveSessions'

function makeSnapshot(id: string, overrides: Record<string, unknown> = {}) {
  return {
    session_id: id,
    input: `Task ${id}`,
    status: 'running',
    skill: null,
    current_activity: { step: 'thinking', label: 'Reading documents' },
    todos_summary: { done: 0, total: 0 },
    trace_count: 0,
    next_event_seq: 0,
    started_at: null,
    updated_at: '2026-04-21T12:00:00Z',
    created_at: '2026-04-21T12:00:00Z',
    ...overrides
  }
}

describe('useActiveSessions', () => {
  beforeEach(() => {
    FakeSseConnection.instances = []
    mockGetActiveSessions.mockReset()
    mockGetActiveSessionsSummary.mockReset()
    mockBuildStreamUrl.mockClear()
  })

  it('hydrates from REST on mount and opens an SSE connection', async () => {
    mockGetActiveSessions.mockResolvedValue({
      user_id: 'u1',
      count: 1,
      status_counts: { running: 1, pending: 0, waiting_for_human: 0 },
      sessions: [makeSnapshot('s1')]
    })

    const { result } = renderHook(() => useActiveSessions('token-xyz'))

    await waitFor(() => expect(result.current.activeSessions).toHaveLength(1))
    expect(FakeSseConnection.instances).toHaveLength(1)
    expect(mockBuildStreamUrl).toHaveBeenCalled()
  })

  it('replaces the active set on overview events and toggles isLive on open', async () => {
    mockGetActiveSessions.mockResolvedValue({
      user_id: 'u1',
      count: 0,
      status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
      sessions: []
    })

    const { result } = renderHook(() => useActiveSessions('token-xyz'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    const source = FakeSseConnection.instances[0]

    act(() => {
      source.emitOpen()
    })
    expect(result.current.isLive).toBe(true)

    act(() => {
      source.emitMessage({
        type: 'overview',
        timestamp: '2026-04-21T12:00:00Z',
        user_id: 'u1',
        sessions: [makeSnapshot('live-1'), makeSnapshot('live-2')]
      })
    })

    expect(result.current.activeSessions.map(s => s.session_id).sort()).toEqual(['live-1', 'live-2'])
    expect(result.current.statusCounts.running).toBe(2)
  })

  it('drops a session from the active set when its terminal event arrives', async () => {
    mockGetActiveSessions.mockResolvedValue({
      user_id: 'u1',
      count: 0,
      status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
      sessions: []
    })

    const { result } = renderHook(() => useActiveSessions('token-xyz'))
    const source = await waitFor(() => {
      expect(FakeSseConnection.instances[0]).toBeDefined()
      return FakeSseConnection.instances[0]
    })

    act(() => {
      source.emitOpen()
      source.emitMessage({
        type: 'overview',
        timestamp: '2026-04-21T12:00:00Z',
        user_id: 'u1',
        sessions: [makeSnapshot('s1'), makeSnapshot('s2')]
      })
    })
    expect(result.current.activeSessions).toHaveLength(2)

    act(() => {
      source.emitMessage({ type: 'terminal', session_id: 's1', status: 'completed' })
    })

    expect(result.current.activeSessions.map(s => s.session_id)).toEqual(['s2'])
  })

  it('updates current_activity from per-session agent_chunk status events', async () => {
    mockGetActiveSessions.mockResolvedValue({
      user_id: 'u1',
      count: 0,
      status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
      sessions: []
    })

    const { result } = renderHook(() => useActiveSessions('token-xyz'))
    const source = await waitFor(() => {
      expect(FakeSseConnection.instances[0]).toBeDefined()
      return FakeSseConnection.instances[0]
    })

    act(() => {
      source.emitOpen()
      source.emitMessage({
        type: 'overview',
        timestamp: '2026-04-21T12:00:00Z',
        user_id: 'u1',
        sessions: [makeSnapshot('s1', { current_activity: { step: 'thinking', label: 'Initial' } })]
      })
    })

    act(() => {
      source.emitMessage({
        type: 'agent_chunk',
        session_id: 's1',
        seq: 5,
        role: 'ai',
        chunk_kind: 'status',
        content: 'Searching CRM for recent deals',
        timestamp: '2026-04-21T12:00:30Z'
      })
    })

    expect(result.current.activeSessions[0].current_activity.label).toBe('Searching CRM for recent deals')
  })

  it('inserts a session on session_added events', async () => {
    mockGetActiveSessions.mockResolvedValue({
      user_id: 'u1',
      count: 0,
      status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
      sessions: []
    })

    const { result } = renderHook(() => useActiveSessions('token-xyz'))
    const source = await waitFor(() => {
      expect(FakeSseConnection.instances[0]).toBeDefined()
      return FakeSseConnection.instances[0]
    })

    act(() => {
      source.emitOpen()
      source.emitMessage({
        type: 'overview',
        timestamp: '2026-04-21T12:00:00Z',
        user_id: 'u1',
        sessions: []
      })
    })
    expect(result.current.activeSessions).toHaveLength(0)

    act(() => {
      source.emitMessage({
        type: 'session_added',
        session_id: 'new-1',
        timestamp: '2026-04-21T12:00:01Z',
        session: makeSnapshot('new-1')
      })
    })

    expect(result.current.activeSessions.map(s => s.session_id)).toEqual(['new-1'])
  })

  it('removes a session on session_removed events', async () => {
    mockGetActiveSessions.mockResolvedValue({
      user_id: 'u1',
      count: 0,
      status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
      sessions: []
    })

    const { result } = renderHook(() => useActiveSessions('token-xyz'))
    const source = await waitFor(() => {
      expect(FakeSseConnection.instances[0]).toBeDefined()
      return FakeSseConnection.instances[0]
    })

    act(() => {
      source.emitOpen()
      source.emitMessage({
        type: 'overview',
        timestamp: '2026-04-21T12:00:00Z',
        user_id: 'u1',
        sessions: [makeSnapshot('s1'), makeSnapshot('s2')]
      })
    })
    expect(result.current.activeSessions).toHaveLength(2)

    act(() => {
      source.emitMessage({ type: 'session_removed', session_id: 's1' })
    })

    expect(result.current.activeSessions.map(s => s.session_id)).toEqual(['s2'])
  })

  it('updates status + pending question on status_changed events', async () => {
    mockGetActiveSessions.mockResolvedValue({
      user_id: 'u1',
      count: 0,
      status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
      sessions: []
    })

    const { result } = renderHook(() => useActiveSessions('token-xyz'))
    const source = await waitFor(() => {
      expect(FakeSseConnection.instances[0]).toBeDefined()
      return FakeSseConnection.instances[0]
    })

    act(() => {
      source.emitOpen()
      source.emitMessage({
        type: 'overview',
        timestamp: '2026-04-21T12:00:00Z',
        user_id: 'u1',
        sessions: [makeSnapshot('s1', { status: 'running' })]
      })
    })

    act(() => {
      source.emitMessage({
        type: 'status_changed',
        session_id: 's1',
        status: 'waiting_for_human',
        pending_human_question: 'Confirm deletion?',
        current_activity: { step: 'awaiting_human', label: 'Confirm deletion?' },
        updated_at: '2026-04-21T12:05:00Z',
        timestamp: '2026-04-21T12:05:00Z'
      })
    })

    const snap = result.current.activeSessions[0]
    expect(snap.status).toBe('waiting_for_human')
    expect(snap.pending_human_question).toBe('Confirm deletion?')
    expect(snap.current_activity.label).toBe('Confirm deletion?')
    expect(result.current.statusCounts.waiting_for_human).toBe(1)
    expect(result.current.statusCounts.running).toBe(0)
  })

  it('reflects status on waiting_for_human terminal events', async () => {
    mockGetActiveSessions.mockResolvedValue({
      user_id: 'u1',
      count: 0,
      status_counts: { running: 0, pending: 0, waiting_for_human: 0 },
      sessions: []
    })

    const { result } = renderHook(() => useActiveSessions('token-xyz'))
    const source = await waitFor(() => {
      expect(FakeSseConnection.instances[0]).toBeDefined()
      return FakeSseConnection.instances[0]
    })

    act(() => {
      source.emitOpen()
      source.emitMessage({
        type: 'overview',
        timestamp: '2026-04-21T12:00:00Z',
        user_id: 'u1',
        sessions: [makeSnapshot('s1', { status: 'running' })]
      })
    })

    act(() => {
      source.emitMessage({
        type: 'terminal',
        session_id: 's1',
        status: 'waiting_for_human',
        human_question: 'Need approval',
        timestamp: '2026-04-21T12:05:00Z'
      })
    })

    expect(result.current.activeSessions).toHaveLength(1)
    expect(result.current.activeSessions[0].status).toBe('waiting_for_human')
    expect(result.current.activeSessions[0].pending_human_question).toBe('Need approval')
  })

  it('ignores heartbeat events', async () => {
    mockGetActiveSessions.mockResolvedValue({
      user_id: 'u1',
      count: 1,
      status_counts: { running: 1, pending: 0, waiting_for_human: 0 },
      sessions: [makeSnapshot('s1')]
    })

    const { result } = renderHook(() => useActiveSessions('token-xyz'))
    const source = await waitFor(() => {
      expect(FakeSseConnection.instances[0]).toBeDefined()
      return FakeSseConnection.instances[0]
    })

    act(() => {
      source.emitOpen()
      source.emitMessage({ type: 'heartbeat', timestamp: '2026-04-21T12:00:00Z' })
    })

    expect(result.current.activeSessions).toHaveLength(1)
  })
})
