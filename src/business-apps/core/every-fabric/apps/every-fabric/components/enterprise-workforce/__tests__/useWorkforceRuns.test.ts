/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import type { WorkforceRun } from '../workforceTypes'

const mockListRuns = jest.fn()
const mockGetRun = jest.fn()
const mockStartRun = jest.fn()

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stable = {
    listWorkforceRuns: (...args: unknown[]) => mockListRuns(...args),
    getWorkforceRun: (...args: unknown[]) => mockGetRun(...args),
    startWorkforceRun: (...args: unknown[]) => mockStartRun(...args)
  }
  return { usePromptManagerClient: () => stable }
})

import { hasInFlightRun, isTerminalRunStatus, useWorkforceRuns } from '../useWorkforceRuns'

function buildRun(overrides: Partial<WorkforceRun> = {}): WorkforceRun {
  return {
    session_id: 'sess-1',
    agent_id: 'agent-1',
    workforce_trigger_id: null,
    status: 'completed',
    input: 'Do the thing.',
    output: 'Done.',
    cost_summary: { total_tokens: 1500 },
    pending_human_question: null,
    workspace_id: 'ws',
    user_id: 'alice',
    started_at: '2026-01-01T00:00:00Z',
    completed_at: '2026-01-01T00:00:30Z',
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:30Z',
    ...overrides
  }
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('isTerminalRunStatus', () => {
  it('treats completed, failed, cancelled as terminal', () => {
    expect(isTerminalRunStatus('completed')).toBe(true)
    expect(isTerminalRunStatus('failed')).toBe(true)
    expect(isTerminalRunStatus('cancelled')).toBe(true)
  })

  it('treats running and waiting_for_human as non-terminal', () => {
    expect(isTerminalRunStatus('running')).toBe(false)
    expect(isTerminalRunStatus('waiting_for_human')).toBe(false)
    expect(isTerminalRunStatus('pending')).toBe(false)
  })
})

describe('hasInFlightRun', () => {
  it('returns true when any run is non-terminal', () => {
    expect(hasInFlightRun([buildRun({ status: 'completed' }), buildRun({ session_id: 'b', status: 'running' })])).toBe(
      true
    )
  })

  it('returns false when all runs are terminal', () => {
    expect(hasInFlightRun([buildRun({ status: 'completed' }), buildRun({ session_id: 'b', status: 'failed' })])).toBe(
      false
    )
  })
})

describe('useWorkforceRuns', () => {
  it('loads runs on mount when an agentId is provided', async () => {
    mockListRuns.mockResolvedValueOnce({ data: [buildRun()], total: 1 })

    const { result } = renderHook(() => useWorkforceRuns({ accessToken: 't', agentId: 'agent-1', pollIntervalMs: 0 }))

    await waitFor(() => {
      expect(result.current.runs).toHaveLength(1)
    })
    expect(mockListRuns).toHaveBeenCalledWith('agent-1', { limit: 25 })
  })

  it('returns no runs and skips fetching when agentId is null', async () => {
    const { result } = renderHook(() => useWorkforceRuns({ accessToken: 't', agentId: null, pollIntervalMs: 0 }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })
    expect(result.current.runs).toEqual([])
    expect(mockListRuns).not.toHaveBeenCalled()
  })

  it('surfaces an error message when the initial fetch fails', async () => {
    mockListRuns.mockRejectedValueOnce(new Error('boom'))

    const { result } = renderHook(() => useWorkforceRuns({ accessToken: 't', agentId: 'agent-1', pollIntervalMs: 0 }))

    await waitFor(() => {
      expect(result.current.error).toBe('boom')
    })
  })

  it('startRun calls the client and optimistically prepends the new run', async () => {
    mockListRuns.mockResolvedValueOnce({ data: [], total: 0 })
    const created = buildRun({ session_id: 'sess-new', status: 'running' })
    mockStartRun.mockResolvedValueOnce(created)

    const { result } = renderHook(() => useWorkforceRuns({ accessToken: 't', agentId: 'agent-1', pollIntervalMs: 0 }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await act(async () => {
      await result.current.startRun({ input: 'go' })
    })

    expect(mockStartRun).toHaveBeenCalledWith('agent-1', { input: 'go' })
    expect(result.current.runs[0]?.session_id).toBe('sess-new')
  })

  it('startRun without an agentId rejects without calling the client', async () => {
    const { result } = renderHook(() => useWorkforceRuns({ accessToken: 't', agentId: null, pollIntervalMs: 0 }))

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    await expect(result.current.startRun({ input: 'go' })).rejects.toThrow(/without an agent/)
    expect(mockStartRun).not.toHaveBeenCalled()
  })

  it('getRun updates the matching entry inside the runs list', async () => {
    const initial = buildRun({ session_id: 'sess-1', status: 'running', output: null })
    mockListRuns.mockResolvedValueOnce({ data: [initial], total: 1 })

    const updated = buildRun({ session_id: 'sess-1', status: 'completed', output: 'done' })
    mockGetRun.mockResolvedValueOnce(updated)

    const { result } = renderHook(() => useWorkforceRuns({ accessToken: 't', agentId: 'agent-1', pollIntervalMs: 0 }))

    await waitFor(() => {
      expect(result.current.runs).toHaveLength(1)
    })

    await act(async () => {
      await result.current.getRun('sess-1')
    })

    expect(result.current.runs[0]?.status).toBe('completed')
    expect(result.current.runs[0]?.output).toBe('done')
  })

  it('auto-polls while an in-flight run is present', async () => {
    jest.useFakeTimers()
    try {
      const running = buildRun({ session_id: 'sess-1', status: 'running', completed_at: null })
      const completed = buildRun({ session_id: 'sess-1', status: 'completed' })

      mockListRuns
        .mockResolvedValueOnce({ data: [running], total: 1 }) // initial fetch
        .mockResolvedValueOnce({ data: [completed], total: 1 }) // poll tick

      const { result } = renderHook(() =>
        useWorkforceRuns({ accessToken: 't', agentId: 'agent-1', pollIntervalMs: 50 })
      )

      await waitFor(() => {
        expect(result.current.runs[0]?.status).toBe('running')
      })
      expect(result.current.isPolling).toBe(true)

      await act(async () => {
        jest.advanceTimersByTime(60)
        await Promise.resolve()
      })

      await waitFor(() => {
        expect(result.current.runs[0]?.status).toBe('completed')
      })
      expect(result.current.isPolling).toBe(false)
    } finally {
      jest.useRealTimers()
    }
  })
})
