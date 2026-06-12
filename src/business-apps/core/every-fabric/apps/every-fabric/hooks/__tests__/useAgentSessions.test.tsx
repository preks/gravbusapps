import { act, renderHook, waitFor } from '@testing-library/react'
import { useAgentSessions } from '../useAgentSessions'

const mockGetSessions = jest.fn()
const mockStopSession = jest.fn()
const mockEnterpriseClient = {
  getSessions: (...args: unknown[]) => mockGetSessions(...args),
  stopSession: (...args: unknown[]) => mockStopSession(...args)
}
const mockFlowBotClient = {
  stopSession: jest.fn()
}

jest.mock('../useEnterpriseAgentClient', () => ({
  useEnterpriseAgentClient: () => mockEnterpriseClient
}))

jest.mock('../useFlowBotFabricClient', () => ({
  useFlowBotFabricClient: () => mockFlowBotClient
}))

jest.mock('../../utils/fabricRuntime', () => ({
  isFlowBotFabricRuntime: () => false
}))

const makeSession = (sessionId: string, updatedAt: string) => ({
  session_id: sessionId,
  input: `Task ${sessionId}`,
  status: 'completed',
  created_at: updatedAt,
  updated_at: updatedAt
})

describe('useAgentSessions', () => {
  beforeEach(() => {
    jest.useRealTimers()
    mockGetSessions.mockReset()
    mockStopSession.mockReset()
  })

  it('loads the initial summary page and appends older sessions without duplicates', async () => {
    mockGetSessions.mockImplementation((params?: { cursor?: string | null }) => {
      if (params?.cursor === 'cursor-1') {
        return Promise.resolve({
          items: [makeSession('s2', '2026-01-02T00:00:00Z'), makeSession('s1', '2026-01-01T00:00:00Z')],
          next_cursor: null,
          has_more: false
        })
      }
      return Promise.resolve({
        items: [makeSession('s2', '2026-01-02T00:00:00Z')],
        next_cursor: 'cursor-1',
        has_more: true
      })
    })

    const { result } = renderHook(() => useAgentSessions('token'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions.map(session => session.session_id)).toEqual(['s2'])

    await act(async () => {
      await result.current.loadMore()
    })

    expect(mockGetSessions).toHaveBeenLastCalledWith({
      summary: true,
      limit: 50,
      cursor: 'cursor-1',
      q: undefined
    })
    expect(result.current.sessions.map(session => session.session_id)).toEqual(['s2', 's1'])
    expect(result.current.hasMore).toBe(false)
  })

  it('accepts the legacy array response while the backend is rolling', async () => {
    mockGetSessions.mockResolvedValue([makeSession('legacy', '2026-01-01T00:00:00Z')])

    const { result } = renderHook(() => useAgentSessions('token'))

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.sessions.map(session => session.session_id)).toEqual(['legacy'])
    expect(result.current.hasMore).toBe(false)
  })

  it('debounces sidebar search and resets the loaded page', async () => {
    mockGetSessions.mockImplementation((params?: { q?: string }) => {
      if (params?.q === 'report') {
        return Promise.resolve({
          items: [makeSession('match', '2026-01-03T00:00:00Z')],
          next_cursor: null,
          has_more: false
        })
      }
      return Promise.resolve({
        items: [makeSession('initial', '2026-01-01T00:00:00Z')],
        next_cursor: null,
        has_more: false
      })
    })

    const { result } = renderHook(() => useAgentSessions('token'))

    await waitFor(() => expect(result.current.loading).toBe(false))

    act(() => {
      result.current.setSearchQuery('report')
    })

    expect(result.current.searching).toBe(true)

    await waitFor(() =>
      expect(mockGetSessions).toHaveBeenLastCalledWith({
        summary: true,
        limit: 50,
        cursor: null,
        q: 'report'
      })
    )
    await waitFor(() => expect(result.current.sessions.map(session => session.session_id)).toEqual(['match']))
  })
})
