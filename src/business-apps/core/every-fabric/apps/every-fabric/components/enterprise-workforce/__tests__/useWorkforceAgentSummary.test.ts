/** @jest-environment jsdom */
import { act, renderHook, waitFor } from '@testing-library/react'
import type { WorkforceAgentMetricsSummary } from '../workforceTypes'

const mockGetSummary = jest.fn()

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => {
  const stable = {
    getWorkforceAgentMetricsSummary: (...args: unknown[]) => mockGetSummary(...args)
  }
  return { usePromptManagerClient: () => stable }
})

import { useWorkforceAgentSummary } from '../useWorkforceAgentSummary'

function buildSummary(agentId: string): WorkforceAgentMetricsSummary {
  return {
    agent_id: agentId,
    today: {
      agent_id: agentId,
      window: 'day',
      from_date: '2026-05-30',
      to_date: '2026-05-30',
      totals: {
        runs: 2,
        completed_runs: 2,
        failed_runs: 0,
        cancelled_runs: 0,
        total_tokens: 3000,
        total_credits: 3,
        estimated_cost_usd: 0.05
      },
      daily_buckets: []
    },
    week: {
      agent_id: agentId,
      window: 'week',
      from_date: '2026-05-24',
      to_date: '2026-05-30',
      totals: {
        runs: 12,
        completed_runs: 10,
        failed_runs: 1,
        cancelled_runs: 1,
        total_tokens: 18000,
        total_credits: 18,
        estimated_cost_usd: 0.3
      },
      daily_buckets: []
    },
    month: {
      agent_id: agentId,
      window: 'month',
      from_date: '2026-05-01',
      to_date: '2026-05-30',
      totals: {
        runs: 40,
        completed_runs: 35,
        failed_runs: 3,
        cancelled_runs: 2,
        total_tokens: 60000,
        total_credits: 60,
        estimated_cost_usd: 1.2
      },
      daily_buckets: []
    },
    source_breakdown: {
      window: 'month',
      from_date: '2026-05-01',
      to_date: '2026-05-30',
      entries: [
        { source: 'manual', runs: 4, credits: 4, tokens: 4000 },
        { source: 'inbound_email', runs: 30, credits: 50, tokens: 50000 }
      ]
    }
  }
}

describe('useWorkforceAgentSummary', () => {
  beforeEach(() => jest.clearAllMocks())

  it('loads the summary on mount when agentId is set', async () => {
    mockGetSummary.mockResolvedValueOnce(buildSummary('a-1'))
    const { result } = renderHook(() => useWorkforceAgentSummary({ accessToken: 'token', agentId: 'a-1' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockGetSummary).toHaveBeenCalledWith('a-1')
    expect(result.current.summary?.today.totals.runs).toBe(2)
    expect(result.current.summary?.month.totals.total_credits).toBe(60)
    expect(result.current.error).toBeNull()
  })

  it('skips fetch and resets summary when agentId is null', async () => {
    const { result } = renderHook(() => useWorkforceAgentSummary({ accessToken: 'token', agentId: null }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(mockGetSummary).not.toHaveBeenCalled()
    expect(result.current.summary).toBeNull()
  })

  it('captures errors and exposes them via state', async () => {
    mockGetSummary.mockRejectedValueOnce(new Error('Boom'))
    const { result } = renderHook(() => useWorkforceAgentSummary({ accessToken: 'token', agentId: 'a-1' }))
    await waitFor(() => expect(result.current.error).toBe('Boom'))
    expect(result.current.summary).toBeNull()
  })

  it('refetch returns fresh data', async () => {
    mockGetSummary.mockResolvedValueOnce(buildSummary('a-1'))
    const { result } = renderHook(() => useWorkforceAgentSummary({ accessToken: 'token', agentId: 'a-1' }))
    await waitFor(() => expect(result.current.isLoading).toBe(false))
    const second = { ...buildSummary('a-1') }
    second.today.totals.runs = 99
    mockGetSummary.mockResolvedValueOnce(second)
    await act(async () => {
      await result.current.refetch()
    })
    expect(result.current.summary?.today.totals.runs).toBe(99)
  })
})
