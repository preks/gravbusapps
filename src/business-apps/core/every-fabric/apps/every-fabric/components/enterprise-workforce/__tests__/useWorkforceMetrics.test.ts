/** @jest-environment jsdom */
import { renderHook, waitFor } from '@testing-library/react'
import type { WorkforceAgentMetrics, WorkforceWorkspaceMetrics } from '../workforceTypes'

const mockGetWorkforceWorkspaceMetrics = jest.fn()
const mockGetWorkforceAgentMetrics = jest.fn()

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stableClient = {
    getWorkforceWorkspaceMetrics: (...args: unknown[]) => mockGetWorkforceWorkspaceMetrics(...args),
    getWorkforceAgentMetrics: (...args: unknown[]) => mockGetWorkforceAgentMetrics(...args)
  }
  return { usePromptManagerClient: () => stableClient }
})

import { useWorkforceAgentMetrics, useWorkforceWorkspaceMetrics } from '../useWorkforceMetrics'

function workspaceFixture(): WorkforceWorkspaceMetrics {
  return {
    workspace_id: 'ws-1',
    window: 'week',
    from_date: '2026-05-24',
    to_date: '2026-05-30',
    totals: {
      runs: 5,
      completed_runs: 4,
      failed_runs: 1,
      cancelled_runs: 0,
      total_tokens: 4000,
      total_credits: 4,
      estimated_cost_usd: 0.5
    },
    daily_buckets: [],
    by_agent: [
      {
        agent_id: 'a-1',
        totals: {
          runs: 3,
          completed_runs: 3,
          failed_runs: 0,
          cancelled_runs: 0,
          total_tokens: 2500,
          total_credits: 3,
          estimated_cost_usd: 0.3
        },
        last_completed_at: '2026-05-30T11:00:00Z'
      },
      {
        agent_id: 'a-2',
        totals: {
          runs: 2,
          completed_runs: 1,
          failed_runs: 1,
          cancelled_runs: 0,
          total_tokens: 1500,
          total_credits: 1,
          estimated_cost_usd: 0.2
        },
        last_completed_at: null
      }
    ],
    runs_today: 2
  }
}

function agentFixture(): WorkforceAgentMetrics {
  return {
    agent_id: 'a-1',
    window: 'week',
    from_date: '2026-05-24',
    to_date: '2026-05-30',
    totals: {
      runs: 3,
      completed_runs: 3,
      failed_runs: 0,
      cancelled_runs: 0,
      total_tokens: 2500,
      total_credits: 3,
      estimated_cost_usd: 0.3
    },
    daily_buckets: [
      { date: '2026-05-29', runs: 1, credits: 1, tokens: 800 },
      { date: '2026-05-30', runs: 2, credits: 2, tokens: 1700 }
    ]
  }
}

beforeEach(() => {
  mockGetWorkforceWorkspaceMetrics.mockReset()
  mockGetWorkforceAgentMetrics.mockReset()
})

describe('useWorkforceWorkspaceMetrics', () => {
  it('loads workspace metrics and indexes per-agent totals', async () => {
    mockGetWorkforceWorkspaceMetrics.mockResolvedValue(workspaceFixture())

    const { result } = renderHook(() => useWorkforceWorkspaceMetrics({ accessToken: 't', workspaceId: 'ws-1' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGetWorkforceWorkspaceMetrics).toHaveBeenCalledWith('ws-1', 'week', 0)
    expect(result.current.metrics?.runs_today).toBe(2)
    expect(result.current.totalsByAgent.get('a-1')?.total_credits).toBe(3)
    expect(result.current.totalsByAgent.get('a-2')?.runs).toBe(2)
    expect(result.current.error).toBeNull()
  })

  it('falls back to empty workspace id when not provided', async () => {
    mockGetWorkforceWorkspaceMetrics.mockResolvedValue(workspaceFixture())

    const { result } = renderHook(() => useWorkforceWorkspaceMetrics({ accessToken: 't' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockGetWorkforceWorkspaceMetrics).toHaveBeenCalledWith('', 'week', 0)
    expect(result.current.totalsByAgent.size).toBe(2)
  })

  it('captures errors and clears stale metrics', async () => {
    mockGetWorkforceWorkspaceMetrics.mockRejectedValue(new Error('forbidden'))

    const { result } = renderHook(() => useWorkforceWorkspaceMetrics({ accessToken: 't' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.error).toBe('forbidden')
    expect(result.current.metrics).toBeNull()
    expect(result.current.totalsByAgent.size).toBe(0)
  })
})

describe('useWorkforceAgentMetrics', () => {
  it('loads per-agent metrics including daily buckets', async () => {
    mockGetWorkforceAgentMetrics.mockResolvedValue(agentFixture())

    const { result } = renderHook(() => useWorkforceAgentMetrics({ accessToken: 't', agentId: 'a-1' }))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(mockGetWorkforceAgentMetrics).toHaveBeenCalledWith('a-1', 'week')
    expect(result.current.metrics?.daily_buckets).toHaveLength(2)
    expect(result.current.totals.total_credits).toBe(3)
  })

  it('skips the request when agentId is null', async () => {
    renderHook(() => useWorkforceAgentMetrics({ accessToken: 't', agentId: null }))

    await waitFor(() => expect(mockGetWorkforceAgentMetrics).not.toHaveBeenCalled())
  })
})
