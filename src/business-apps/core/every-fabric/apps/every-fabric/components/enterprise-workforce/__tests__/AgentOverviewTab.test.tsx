/** @jest-environment jsdom */
import { render, waitFor } from '@testing-library/react'
import React from 'react'
import { AgentOverviewTab, type AgentOverviewRecentRuns } from '../agent-detail/tabs/AgentOverviewTab'
import type { WorkforceAgentMetricsSummary, WorkforceRun } from '../workforceTypes'

const mockRefetchSummary = jest.fn()
const mockRefreshRuns = jest.fn()
let mockSummary: WorkforceAgentMetricsSummary | null = null

jest.mock('../useWorkforceAgentSummary', () => ({
  useWorkforceAgentSummary: () => ({
    summary: mockSummary,
    isLoading: false,
    error: null,
    refetch: mockRefetchSummary
  })
}))

jest.mock('../WorkforceCreditSparkline', () => ({
  WorkforceCreditSparkline: () => <div data-testid="workforce-credit-sparkline" />
}))

jest.mock('../RecentRunsPanel', () => ({
  RecentRunsPanel: () => <div data-testid="workforce-recent-runs-panel" />
}))

function buildSummary(todayCredits: number): WorkforceAgentMetricsSummary {
  return {
    agent_id: 'a-1',
    today: {
      agent_id: 'a-1',
      window: 'day',
      from_date: '2026-06-01',
      to_date: '2026-06-01',
      totals: {
        runs: 1,
        completed_runs: 1,
        failed_runs: 0,
        cancelled_runs: 0,
        total_tokens: 1000,
        total_credits: todayCredits,
        estimated_cost_usd: 0.01
      },
      daily_buckets: []
    },
    week: {
      agent_id: 'a-1',
      window: 'week',
      from_date: '2026-05-26',
      to_date: '2026-06-01',
      totals: {
        runs: 1,
        completed_runs: 1,
        failed_runs: 0,
        cancelled_runs: 0,
        total_tokens: 1000,
        total_credits: todayCredits,
        estimated_cost_usd: 0.01
      },
      daily_buckets: []
    },
    month: {
      agent_id: 'a-1',
      window: 'month',
      from_date: '2026-06-01',
      to_date: '2026-06-01',
      totals: {
        runs: 1,
        completed_runs: 1,
        failed_runs: 0,
        cancelled_runs: 0,
        total_tokens: 1000,
        total_credits: todayCredits,
        estimated_cost_usd: 0.01
      },
      daily_buckets: []
    },
    source_breakdown: {
      window: 'month',
      from_date: '2026-06-01',
      to_date: '2026-06-01',
      entries: []
    }
  }
}

function buildRun(status: WorkforceRun['status']): WorkforceRun {
  return {
    session_id: 'sess-1',
    agent_id: 'a-1',
    workforce_trigger_id: null,
    status,
    input: 'task',
    output: status === 'completed' ? 'done' : null,
    cost_summary: null,
    pending_human_question: null,
    workspace_id: 'ws',
    user_id: 'alice',
    started_at: '2026-06-01T07:00:00Z',
    completed_at: status === 'completed' ? '2026-06-01T07:00:10Z' : null,
    created_at: '2026-06-01T07:00:00Z',
    updated_at: '2026-06-01T07:00:10Z'
  }
}

function buildRecentRuns(runs: WorkforceRun[]): AgentOverviewRecentRuns {
  return {
    runs,
    isLoading: false,
    isPolling: runs.some(
      run => run.status === 'running' || run.status === 'pending' || run.status === 'waiting_for_human'
    ),
    error: null,
    onRefresh: mockRefreshRuns
  }
}

describe('AgentOverviewTab', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockSummary = buildSummary(3)
    mockRefetchSummary.mockResolvedValue(undefined)
    mockRefreshRuns.mockResolvedValue(undefined)
  })

  it('refetches KPI summary when the last in-flight recent run completes', async () => {
    const { rerender } = render(
      <AgentOverviewTab
        accessToken="token"
        agentId="a-1"
        recentRuns={buildRecentRuns([buildRun('running')])}
        onOpenRun={() => {}}
        onTestRun={() => {}}
        onViewAllRuns={() => {}}
      />
    )

    expect(mockRefetchSummary).not.toHaveBeenCalled()

    rerender(
      <AgentOverviewTab
        accessToken="token"
        agentId="a-1"
        recentRuns={buildRecentRuns([buildRun('completed')])}
        onOpenRun={() => {}}
        onTestRun={() => {}}
        onViewAllRuns={() => {}}
      />
    )

    await waitFor(() => {
      expect(mockRefetchSummary).toHaveBeenCalledTimes(1)
    })
  })
})
