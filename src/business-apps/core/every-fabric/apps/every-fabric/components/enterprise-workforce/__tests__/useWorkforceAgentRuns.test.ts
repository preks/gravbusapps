/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import type { WorkforceRun, WorkforceRunListParams } from '../workforceTypes'

const mockList = jest.fn()

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stable = {
    listWorkforceRuns: (...args: unknown[]) => mockList(...args)
  }
  return { usePromptManagerClient: () => stable }
})

import { useWorkforceAgentRuns } from '../useWorkforceAgentRuns'

function buildRun(sessionId: string, overrides: Partial<WorkforceRun> = {}): WorkforceRun {
  return {
    session_id: sessionId,
    agent_id: 'a-1',
    workforce_trigger_id: null,
    status: 'completed',
    input: 'Resolve claim',
    output: 'Done',
    cost_summary: { total_tokens: 1000 },
    pending_human_question: null,
    workspace_id: 'ws-1',
    user_id: 'alice',
    started_at: '2026-05-30T12:00:00Z',
    completed_at: '2026-05-30T12:00:05Z',
    created_at: '2026-05-30T12:00:00Z',
    updated_at: '2026-05-30T12:00:05Z',
    ...overrides
  }
}

describe('useWorkforceAgentRuns', () => {
  beforeEach(() => jest.clearAllMocks())

  it('fetches with the supplied params on mount', async () => {
    mockList.mockResolvedValueOnce({ data: [buildRun('s-1')], total: 1 })
    const params: WorkforceRunListParams = { source: 'inbound_email', limit: 10 }
    const { result } = renderHook(() => useWorkforceAgentRuns({ accessToken: 'token', agentId: 'a-1', params }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockList).toHaveBeenCalledWith('a-1', params)
    expect(result.current.runs).toHaveLength(1)
    expect(result.current.total).toBe(1)
  })

  it('stays idle when agentId is null', async () => {
    const { result } = renderHook(() => useWorkforceAgentRuns({ accessToken: 'token', agentId: null }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockList).not.toHaveBeenCalled()
    expect(result.current.runs).toEqual([])
    expect(result.current.total).toBe(0)
  })

  it('does not fetch when enabled=false but agentId is set', async () => {
    const { result } = renderHook(() =>
      useWorkforceAgentRuns({
        accessToken: 'token',
        agentId: 'a-1',
        enabled: false,
        params: { limit: 25 }
      })
    )
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockList).not.toHaveBeenCalled()
  })

  it('refetches when params change by value (cacheKey)', async () => {
    mockList.mockResolvedValueOnce({ data: [], total: 0 })
    const { rerender } = renderHook(
      (props: { params: WorkforceRunListParams }) =>
        useWorkforceAgentRuns({ accessToken: 'token', agentId: 'a-1', params: props.params }),
      { initialProps: { params: { limit: 25, offset: 0 } } }
    )
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(1))

    mockList.mockResolvedValueOnce({ data: [], total: 0 })
    rerender({ params: { limit: 25, offset: 25 } })
    await waitFor(() => expect(mockList).toHaveBeenCalledTimes(2))
  })

  it('captures fetch errors', async () => {
    mockList.mockRejectedValueOnce(new Error('Network down'))
    const { result } = renderHook(() => useWorkforceAgentRuns({ accessToken: 'token', agentId: 'a-1' }))
    await waitFor(() => expect(result.current.error).toBe('Network down'))
    expect(result.current.runs).toEqual([])
  })

  it('clearError resets the error state', async () => {
    mockList.mockRejectedValueOnce(new Error('Network down'))
    const { result } = renderHook(() => useWorkforceAgentRuns({ accessToken: 'token', agentId: 'a-1' }))
    await waitFor(() => expect(result.current.error).toBe('Network down'))
    act(() => result.current.clearError())
    expect(result.current.error).toBeNull()
  })
})
