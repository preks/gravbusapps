/** @jest-environment jsdom */
import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import type { WorkforceWorkspaceMetrics } from '../workforceTypes'

const mockGetWorkforceWorkspaceMetrics = jest.fn()

jest.mock('@/common/network/ai/prompt-manager/usePromptManagerClient', () => ({
  usePromptManagerClient: () => ({
    getWorkforceWorkspaceMetrics: (...args: unknown[]) => mockGetWorkforceWorkspaceMetrics(...args)
  })
}))

import { ValueScoreboard } from '../value/ValueScoreboard'

function metrics(overrides: Partial<WorkforceWorkspaceMetrics> = {}): WorkforceWorkspaceMetrics {
  return {
    workspace_id: 'ws',
    window: 'week',
    from_date: '2026-05-26',
    to_date: '2026-06-01',
    totals: {
      runs: 10,
      completed_runs: 8,
      failed_runs: 2,
      cancelled_runs: 0,
      total_tokens: 1000,
      total_credits: 50,
      estimated_cost_usd: 16
    },
    daily_buckets: [],
    by_agent: [],
    runs_today: 3,
    business: {
      cases_handled: 8,
      measured_runs: 8,
      avg_duration_ms: 120000,
      p50_duration_ms: 90000,
      p90_duration_ms: 200000,
      sla_target_ms: 300000,
      under_sla_runs: 6,
      escalated_runs: 2,
      autonomous_runs: 6,
      guardrail_stops: 1,
      audited_runs: 7
    },
    ...overrides
  }
}

beforeEach(() => {
  mockGetWorkforceWorkspaceMetrics.mockReset()
})

describe('ValueScoreboard', () => {
  it('renders the six value KPIs with computed values', async () => {
    mockGetWorkforceWorkspaceMetrics.mockResolvedValue(metrics())

    render(<ValueScoreboard accessToken="t" />)

    await waitFor(() => expect(screen.getByTestId('workforce-value-scoreboard')).toBeInTheDocument())

    expect(screen.getByTestId('value-kpi-cases')).toHaveTextContent('8')
    // SLA attainment = 6/8 = 75%
    expect(screen.getByTestId('value-kpi-sla')).toHaveTextContent('75%')
    // Deflection = 6/8 = 75%
    expect(screen.getByTestId('value-kpi-deflection')).toHaveTextContent('75%')
    // Cost per case = 16/8 = $2.00
    expect(screen.getByTestId('value-kpi-cost')).toHaveTextContent('$2.00')
    // Governance coverage = 7/10 = 70%
    expect(screen.getByTestId('value-kpi-governance')).toHaveTextContent('70%')
  })

  it('tags assumption-derived KPIs as estimated', async () => {
    mockGetWorkforceWorkspaceMetrics.mockResolvedValue(metrics())
    render(<ValueScoreboard accessToken="t" />)
    await waitFor(() => expect(screen.getByTestId('workforce-value-scoreboard')).toBeInTheDocument())

    expect(screen.getByTestId('value-kpi-time-saved-estimated')).toBeInTheDocument()
    expect(screen.getByTestId('value-kpi-cost-estimated')).toBeInTheDocument()
    // Measured KPIs are not tagged estimated.
    expect(screen.queryByTestId('value-kpi-sla-estimated')).not.toBeInTheDocument()
  })

  it('passes the SLA target to the metrics request', async () => {
    mockGetWorkforceWorkspaceMetrics.mockResolvedValue(metrics())
    render(<ValueScoreboard accessToken="t" />)
    await waitFor(() => expect(mockGetWorkforceWorkspaceMetrics).toHaveBeenCalled())
    const call = mockGetWorkforceWorkspaceMetrics.mock.calls[0]
    // (workspaceId, window, slaTargetMs)
    expect(call[2]).toBe(300000)
  })

  it('renders nothing when there is no activity', async () => {
    mockGetWorkforceWorkspaceMetrics.mockResolvedValue(
      metrics({
        totals: {
          runs: 0,
          completed_runs: 0,
          failed_runs: 0,
          cancelled_runs: 0,
          total_tokens: 0,
          total_credits: 0,
          estimated_cost_usd: 0
        }
      })
    )
    const { container } = render(<ValueScoreboard accessToken="t" />)
    await waitFor(() => expect(mockGetWorkforceWorkspaceMetrics).toHaveBeenCalled())
    expect(container.querySelector('[data-testid="workforce-value-scoreboard"]')).toBeNull()
  })

  it('does not crash when the backend omits the business block', async () => {
    mockGetWorkforceWorkspaceMetrics.mockResolvedValue(
      metrics({
        business: undefined as unknown as WorkforceWorkspaceMetrics['business']
      })
    )
    render(<ValueScoreboard accessToken="t" />)
    await waitFor(() => expect(screen.getByTestId('workforce-value-scoreboard')).toBeInTheDocument())
    expect(screen.getByTestId('value-kpi-cases')).toHaveTextContent('0')
  })
})
